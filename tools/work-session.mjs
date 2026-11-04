#!/usr/bin/env node
/**
 * Durable, dependency-free operation records for Node.js >= 22.
 *
 * CLI (request bodies are read from files, never JSON command-line arguments):
 *   node tools/work-session.mjs run --request /absolute/run.json
 *   node tools/work-session.mjs begin --request /absolute/begin.json
 *   node tools/work-session.mjs finish --request /absolute/finish.json
 *   node tools/work-session.mjs pending --log-dir /absolute/session-logs
 *
 * Common request: { logDir, operation, attempt, cwd? }.
 * IDs contain 1-128 ASCII letters/digits/periods/underscores/hyphens and start
 * with a letter or digit. Paths are resolved against the caller's current cwd.
 * run:    { ...common, command: [executable, ...args], timeoutMs?, killGraceMs? }
 * begin:  { ...common, kind?: "external", command?: [...], context?: anyJSON }
 * finish: { ...common, status: "succeeded"|"failed"|"cancelled"|"timed_out",
 *           exitCode?: integer|null, signal?: string|null,
 *           error?: anyJSON, result?: anyJSON }
 *
 * Exports are async: beginOperation(request), finishOperation(request),
 * runCommand(request, { signal?: AbortSignal }), pendingOperations(logDir),
 * readRequestFile(path), main(argv). runCommand returns a terminal record even
 * for command failure; infrastructure/recording errors throw. CLI exit codes:
 * 0 success, the command's nonzero code when representable, 124 timeout,
 * 130 cancellation, otherwise 1. A pending scan itself exits 0.
 *
 * Each logDir/operation/attempt directory is exclusively created. start.json
 * and empty stdout.log/stderr.log are persisted BEFORE execution. Output is
 * appended in chunks and fsynced. result.json is published atomically without
 * replacement AFTER output is flushed. No retry or incomplete-success policy
 * is hidden here. External callers must explicitly report their observed
 * result, and should reconcile pending writes against the remote system.
 *
 * Commands use an argv array without a shell, inherit the environment, and
 * receive no stdin. Keep credentials out of command arguments/context/results.
 * POSIX cancellation targets the command's process group, then escalates to
 * SIGKILL after killGraceMs (default 1000). On Windows it targets the direct
 * child only. Detached descendants that escape the group are not controlled.
 * Files are fsynced on all platforms; directory fsync is used on POSIX.
 * Disk-write errors may leave a pending attempt rather than a false success.
 * Platform-only errors never delivered to this process cannot be recorded.
 */

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { link, mkdir, open, readFile, readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const FINAL_STATUSES = new Set(['succeeded', 'failed', 'cancelled', 'timed_out']);
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const USAGE = `Usage:
  node tools/work-session.mjs run --request /absolute/run.json
  node tools/work-session.mjs begin --request /absolute/begin.json
  node tools/work-session.mjs finish --request /absolute/finish.json
  node tools/work-session.mjs pending --log-dir /absolute/log-directory
Request bodies must be JSON files; inline JSON is not accepted.\n`;

function fail(code, message, cause) {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.code = code;
  return error;
}

function objectRequest(request) {
  if (!request || typeof request !== 'object' || Array.isArray(request)) {
    throw fail('INVALID_REQUEST', 'Request must be a JSON object.');
  }
  return request;
}

function nonemptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0 || value.includes('\0')) {
    throw fail('INVALID_REQUEST', `${label} must be a nonempty string without NUL bytes.`);
  }
  return value;
}

function commandArray(value, required = true) {
  if (value === undefined && !required) return null;
  if (!Array.isArray(value) || value.length === 0 || value.some((part) =>
    typeof part !== 'string' || part.includes('\0')) || value[0].length === 0) {
    throw fail('INVALID_COMMAND', 'command must be a nonempty array of strings; its executable cannot be empty.');
  }
  return [...value];
}

function milliseconds(value, label, fallback) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < 0 || value > 2_147_483_647) {
    throw fail('INVALID_REQUEST', `${label} must be an integer between 0 and 2147483647.`);
  }
  return value;
}

function location(request) {
  objectRequest(request);
  const logDir = path.resolve(nonemptyString(request.logDir, 'logDir'));
  for (const key of ['operation', 'attempt']) {
    if (typeof request[key] !== 'string' || !ID_PATTERN.test(request[key])) {
      throw fail('INVALID_ID', `${key} must be a safe 1-128 character ID beginning with a letter or digit.`);
    }
  }
  const operationDir = path.join(logDir, request.operation);
  const directory = path.join(operationDir, request.attempt);
  return {
    logDir, operationDir,
    files: {
      directory,
      start: path.join(directory, 'start.json'),
      result: path.join(directory, 'result.json'),
      stdout: path.join(directory, 'stdout.log'),
      stderr: path.join(directory, 'stderr.log'),
    },
  };
}

function errorDetails(error, seen = new Set()) {
  if (!(error instanceof Error)) {
    return { name: 'Error', message: typeof error === 'string' ? error : String(error) };
  }
  if (seen.has(error)) return { name: error.name, message: '[Circular error cause]' };
  seen.add(error);
  const details = { name: error.name, message: error.message, stack: error.stack };
  for (const key of ['code', 'errno', 'syscall', 'path', 'spawnargs']) {
    if (error[key] !== undefined) details[key] = error[key];
  }
  if (error.cause !== undefined) details.cause = errorDetails(error.cause, seen);
  return details;
}

async function syncDirectory(directory) {
  if (process.platform === 'win32') return;
  const handle = await open(directory, constants.O_RDONLY);
  try { await handle.sync(); } finally { await handle.close(); }
}

async function emptyNewFile(file) {
  const handle = await open(file, 'wx', 0o600);
  try { await handle.sync(); } finally { await handle.close(); }
}

// A hard link publishes a fully flushed file only if the destination is absent.
// Unlike rename(), this cannot replace another process's completion record.
async function publishJson(file, value) {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  let handle;
  try {
    handle = await open(temporary, 'wx', 0o600);
    await handle.writeFile(serialized, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    await link(temporary, file);
  } finally {
    if (handle) await handle.close();
    await unlink(temporary).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
  }
  await syncDirectory(path.dirname(file));
}

/** Exclusively reserve an attempt and persist its start before doing any work. */
export async function beginOperation(request) {
  const { logDir, operationDir, files } = location(request);
  const kind = request.kind ?? 'external';
  if (!['external', 'command'].includes(kind)) {
    throw fail('INVALID_REQUEST', 'kind must be external or command.');
  }
  const start = {
    schemaVersion: 1,
    operation: request.operation,
    attempt: request.attempt,
    kind,
    status: 'started',
    command: commandArray(request.command, kind === 'command'),
    cwd: path.resolve(nonemptyString(request.cwd ?? process.cwd(), 'cwd')),
    startedAt: new Date().toISOString(),
    recorderPid: process.pid,
    files,
  };
  if (Object.hasOwn(request, 'context')) start.context = request.context;
  // Reject unserializable caller metadata before reserving the attempt.
  JSON.stringify(start);
  await mkdir(logDir, { recursive: true, mode: 0o700 });
  await mkdir(operationDir, { recursive: true, mode: 0o700 });
  try {
    await mkdir(files.directory, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw fail('DUPLICATE_ATTEMPT', `Attempt already exists; no files were overwritten: ${files.directory}`, error);
    }
    throw error;
  }
  await syncDirectory(logDir);
  await syncDirectory(operationDir);
  await emptyNewFile(files.stdout);
  await emptyNewFile(files.stderr);
  await publishJson(files.start, start);
  return start;
}

async function readStart(files, request) {
  const start = JSON.parse(await readFile(files.start, 'utf8'));
  if (start.schemaVersion !== 1 || start.status !== 'started' ||
      start.operation !== request.operation || start.attempt !== request.attempt) {
    throw fail('INVALID_START', `Start record does not match the requested attempt: ${files.start}`);
  }
  return start;
}

/** Persist an explicitly observed terminal result without replacing any record. */
export async function finishOperation(request) {
  const { files } = location(request);
  if (!FINAL_STATUSES.has(request.status)) {
    throw fail('INVALID_STATUS', 'finish requires succeeded, failed, cancelled, or timed_out.');
  }
  const exitCode = request.exitCode ?? null;
  const signal = request.signal ?? null;
  if (exitCode !== null && !Number.isSafeInteger(exitCode)) {
    throw fail('INVALID_REQUEST', 'exitCode must be an integer or null.');
  }
  if (signal !== null && typeof signal !== 'string') {
    throw fail('INVALID_REQUEST', 'signal must be a string or null.');
  }
  if (request.status === 'succeeded' &&
      ((exitCode !== null && exitCode !== 0) || signal !== null || request.error != null)) {
    throw fail('INCONSISTENT_RESULT', 'A succeeded result cannot contain a nonzero exit code, signal, or error.');
  }
  const start = await readStart(files, request);
  const result = {
    ...start,
    files,
    status: request.status,
    endedAt: new Date().toISOString(),
    exitCode,
    signal,
    error: request.error instanceof Error ? errorDetails(request.error) : (request.error ?? null),
  };
  if (Object.hasOwn(request, 'result')) result.result = request.result;
  for (const file of [files.stdout, files.stderr]) {
    const handle = await open(file, 'r+');
    try { await handle.sync(); } finally { await handle.close(); }
  }
  try {
    await publishJson(files.result, result);
  } catch (error) {
    if (error.code === 'EEXIST') {
      throw fail('ALREADY_FINISHED', `Result already exists; it was not overwritten: ${files.result}`, error);
    }
    throw error;
  }
  return result;
}

/** Report unfinished or malformed attempts; never run or complete them. */
export async function pendingOperations(logDirectory) {
  const logDir = path.resolve(nonemptyString(logDirectory, 'logDir'));
  let operations;
  try { operations = await readdir(logDir, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const pending = [];
  for (const operation of operations.filter((entry) => entry.isDirectory())) {
    const attempts = await readdir(path.join(logDir, operation.name), { withFileTypes: true });
    for (const attempt of attempts.filter((entry) => entry.isDirectory())) {
      if (!ID_PATTERN.test(operation.name) || !ID_PATTERN.test(attempt.name)) continue;
      const request = { logDir, operation: operation.name, attempt: attempt.name };
      const { files } = location(request);
      let terminal;
      try {
        terminal = JSON.parse(await readFile(files.result, 'utf8'));
        if (!FINAL_STATUSES.has(terminal.status) || terminal.operation !== request.operation ||
            terminal.attempt !== request.attempt || typeof terminal.endedAt !== 'string') {
          throw fail('INVALID_RESULT', 'Result file is not a matching terminal record.');
        }
        continue;
      } catch (error) {
        if (error.code !== 'ENOENT') {
          pending.push({ ...request, files, status: 'invalid_result', error: errorDetails(error) });
          continue;
        }
      }
      try {
        const start = await readStart(files, request);
        pending.push({ ...request, files, status: 'pending', startedAt: start.startedAt, start });
      } catch (error) {
        pending.push({ ...request, files,
          status: error.code === 'ENOENT' ? 'incomplete_start' : 'invalid_start',
          error: errorDetails(error) });
      }
    }
  }
  return pending.sort((a, b) => a.operation.localeCompare(b.operation) || a.attempt.localeCompare(b.attempt));
}

async function streamToFile(stream, handle) {
  for await (const chunk of stream) {
    await handle.writeFile(chunk);
    await handle.sync();
  }
}

function abortDetails(signal) {
  const error = fail('ABORT_ERR', 'Operation cancelled.', signal.reason);
  error.name = 'AbortError';
  return errorDetails(error);
}

/** Run an argv array after durable START, preserving output and observed errors. */
export async function runCommand(request, { signal } = {}) {
  objectRequest(request);
  const command = commandArray(request.command);
  const timeoutMs = milliseconds(request.timeoutMs, 'timeoutMs', 0);
  const killGraceMs = milliseconds(request.killGraceMs, 'killGraceMs', 1000);
  if (signal !== undefined && !(signal instanceof AbortSignal)) {
    throw fail('INVALID_REQUEST', 'signal must be an AbortSignal.');
  }
  const start = await beginOperation({ ...request, kind: 'command', command });
  let stdoutHandle, stderrHandle, child, closedPromise;
  let closed = false;
  let launchError;
  let stopRequest;
  let timeoutTimer, killTimer;
  let exitCode = null;
  let exitSignal = null;
  const ioErrors = [];
  const terminationErrors = [];

  function terminate(signalName) {
    if (!child?.pid || closed) return;
    try {
      if (process.platform === 'win32') child.kill(signalName);
      else process.kill(-child.pid, signalName);
    } catch (error) {
      if (error.code !== 'ESRCH') terminationErrors.push(errorDetails(error));
    }
  }

  function stop(status, error) {
    if (closed || stopRequest) return;
    stopRequest = { status, error };
    terminate('SIGTERM');
    killTimer = setTimeout(() => terminate('SIGKILL'), killGraceMs);
    killTimer.unref();
  }

  const onAbort = () => stop('cancelled', abortDetails(signal));
  try {
    stdoutHandle = await open(start.files.stdout, 'a');
    stderrHandle = await open(start.files.stderr, 'a');
    if (signal?.aborted) {
      stopRequest = { status: 'cancelled', error: abortDetails(signal) };
    } else {
      child = spawn(command[0], command.slice(1), {
        cwd: start.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
        windowsHide: true,
      });
      closedPromise = new Promise((resolve) => {
        child.once('error', (error) => { launchError = error; });
        child.once('close', (code, childSignal) => {
          exitCode = code;
          exitSignal = childSignal;
          closed = true;
          clearTimeout(timeoutTimer);
          clearTimeout(killTimer);
          resolve();
        });
      });
      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) onAbort();
      if (timeoutMs > 0) {
        timeoutTimer = setTimeout(() => {
          stop('timed_out', errorDetails(fail('TIMEOUT', `Command exceeded timeoutMs=${timeoutMs}.`)));
        }, timeoutMs);
        timeoutTimer.unref();
      }
      const pumps = [[child.stdout, stdoutHandle], [child.stderr, stderrHandle]].map(
        ([stream, handle]) => streamToFile(stream, handle).catch((error) => {
          ioErrors.push(errorDetails(error));
          stop('failed', errorDetails(error));
        }),
      );
      await Promise.all([closedPromise, ...pumps]);
    }
  } catch (error) {
    launchError ??= error;
    if (child && !closed) {
      stop('failed', errorDetails(error));
      await closedPromise;
    }
  } finally {
    clearTimeout(timeoutTimer);
    clearTimeout(killTimer);
    signal?.removeEventListener('abort', onAbort);
    for (const handle of [stdoutHandle, stderrHandle].filter(Boolean)) {
      try { await handle.sync(); } catch (error) { ioErrors.push(errorDetails(error)); }
      try { await handle.close(); } catch (error) { ioErrors.push(errorDetails(error)); }
    }
  }
  let error = launchError ? errorDetails(launchError) : (stopRequest?.error ?? null);
  let status = launchError || ioErrors.length ? 'failed'
    : (stopRequest?.status ?? (exitCode === 0 && exitSignal === null ? 'succeeded' : 'failed'));
  if (ioErrors.length) {
    error = { name: 'OutputRecordingError', message: 'Failed to persist command output.',
      errors: ioErrors, cause: error };
  }
  if (status === 'failed' && error === null) {
    error = { name: 'CommandExitError', code: 'COMMAND_EXIT_FAILED',
      message: `Command exited with code ${exitCode} and signal ${exitSignal}.` };
  }
  if (terminationErrors.length) {
    error = { ...(error ?? {}), terminationErrors };
    if (status === 'succeeded') status = 'failed';
  }
  return finishOperation({
    logDir: request.logDir, operation: request.operation, attempt: request.attempt,
    status, exitCode, signal: exitSignal, error,
  });
}

export async function readRequestFile(file) {
  const absolute = path.resolve(nonemptyString(file, 'request file'));
  try { return objectRequest(JSON.parse(await readFile(absolute, 'utf8'))); }
  catch (error) { throw fail('REQUEST_FILE_ERROR', `Cannot read JSON request file: ${absolute}`, error); }
}

function summary(record) {
  return { operation: record.operation, attempt: record.attempt, status: record.status,
    exitCode: record.exitCode, signal: record.signal, files: record.files };
}

function cliExitCode(result) {
  if (result.status === 'succeeded' || result.status === 'started') return 0;
  if (result.status === 'timed_out') return 124;
  if (result.status === 'cancelled') return 130;
  return Number.isInteger(result.exitCode) && result.exitCode > 0 && result.exitCode < 256
    ? result.exitCode : 1;
}

export async function main(argv = process.argv.slice(2)) {
  try {
    if (argv.length === 0 || (argv.length === 1 && ['--help', '-h'].includes(argv[0]))) {
      process.stdout.write(USAGE);
      return 0;
    }
    const [action, option, value] = argv;
    if (argv.length !== 3) throw fail('USAGE', USAGE);
    if (action === 'pending' && option === '--log-dir') {
      const records = await pendingOperations(value);
      process.stdout.write(`${JSON.stringify(records.map(summary), null, 2)}\n`);
      return 0;
    }
    if (!['run', 'begin', 'finish'].includes(action) || option !== '--request') {
      throw fail('USAGE', USAGE);
    }
    const request = await readRequestFile(value);
    let result;
    if (action === 'begin') result = await beginOperation(request);
    else if (action === 'finish') result = await finishOperation(request);
    else {
      const controller = new AbortController();
      const onInterrupt = () => controller.abort(fail('SIGINT', 'Received SIGINT.'));
      const onTerminate = () => controller.abort(fail('SIGTERM', 'Received SIGTERM.'));
      process.on('SIGINT', onInterrupt);
      process.on('SIGTERM', onTerminate);
      try { result = await runCommand(request, { signal: controller.signal }); }
      finally {
        process.off('SIGINT', onInterrupt);
        process.off('SIGTERM', onTerminate);
      }
    }
    process.stdout.write(`${JSON.stringify(summary(result), null, 2)}\n`);
    return cliExitCode(result);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ error: errorDetails(error) }, null, 2)}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = await main();
}
