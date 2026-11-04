import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import {
  beginOperation, finishOperation, pendingOperations, runCommand,
} from '../tools/work-session.mjs';

const cli = fileURLToPath(new URL('../tools/work-session.mjs', import.meta.url));

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'adv-work-session-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return { directory,
    common: { logDir: path.join(directory, 'logs'), operation: 'test-operation', attempt: '01', cwd: directory } };
}

async function runCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (part) => { stdout += part; });
    child.stderr.setEncoding('utf8').on('data', (part) => { stderr += part; });
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal, stdout, stderr }));
  });
}

test('durable start precedes execution and >1 MiB stdout/stderr bypass argv', async (t) => {
  const { common } = await fixture(t);
  const startFile = path.join(common.logDir, common.operation, common.attempt, 'start.json');
  const bytes = 1024 * 1024 + 137;
  // Only this small program and a path enter argv; the large bytes are generated
  // inside the child and consumed through stdout/stderr pipes into log files.
  const program = `const fs=require('node:fs');const s=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));
    if(s.status!=='started'||fs.existsSync(s.files.result))throw Error('start ordering');
    process.stdout.write(Buffer.alloc(${bytes},97));process.stderr.write(Buffer.alloc(${bytes},98));`;
  assert.ok(Buffer.byteLength(program) < 1024);
  const result = await runCommand({ ...common, command: [process.execPath, '-e', program, startFile] });
  assert.equal(result.status, 'succeeded');
  assert.equal(result.exitCode, 0);
  assert.deepEqual(await readFile(result.files.stdout), Buffer.alloc(bytes, 97));
  assert.deepEqual(await readFile(result.files.stderr), Buffer.alloc(bytes, 98));
  const start = JSON.parse(await readFile(result.files.start, 'utf8'));
  const saved = JSON.parse(await readFile(result.files.result, 'utf8'));
  assert.equal(start.status, 'started');
  assert.equal(saved.status, 'succeeded');
  assert.equal(saved.cwd, common.cwd);
  assert.deepEqual(saved.command, [process.execPath, '-e', program, startFile]);
  assert.ok(Date.parse(saved.endedAt) >= Date.parse(start.startedAt));
  assert.deepEqual(await pendingOperations(common.logDir), []);
});

test('nonzero exit preserves output and an observed failure record', async (t) => {
  const { common } = await fixture(t);
  const result = await runCommand({ ...common, command: [process.execPath, '-e',
    "process.stdout.write('partial work\\n');process.stderr.write('failure detail\\n');process.exitCode=17;"] });
  assert.equal(result.status, 'failed');
  assert.equal(result.exitCode, 17);
  assert.equal(result.error.code, 'COMMAND_EXIT_FAILED');
  assert.equal(await readFile(result.files.stdout, 'utf8'), 'partial work\n');
  assert.equal(await readFile(result.files.stderr, 'utf8'), 'failure detail\n');
  assert.equal(JSON.parse(await readFile(result.files.result, 'utf8')).exitCode, 17);
});

test('missing executable is recorded with native ENOENT details after START', async (t) => {
  const { directory, common } = await fixture(t);
  const executable = path.join(directory, 'definitely-missing-command');
  const result = await runCommand({ ...common, command: [executable, 'argument'] });
  assert.equal(result.status, 'failed');
  assert.equal(result.error.code, 'ENOENT');
  assert.equal(result.error.path, executable);
  assert.deepEqual(result.error.spawnargs, ['argument']);
  assert.ok(result.error.stack.includes('ENOENT'));
  assert.equal((await stat(result.files.stdout)).size, 0);
  assert.equal((await stat(result.files.stderr)).size, 0);
  assert.equal(JSON.parse(await readFile(result.files.start, 'utf8')).status, 'started');
});

test('duplicate attempts and completions never overwrite existing records or output', async (t) => {
  const { common } = await fixture(t);
  const start = await beginOperation({ ...common, context: { original: true } });
  await writeFile(start.files.stdout, 'original output\n');
  const originalStart = await readFile(start.files.start);
  await assert.rejects(beginOperation({ ...common, context: { replacement: true } }), { code: 'DUPLICATE_ATTEMPT' });
  assert.deepEqual(await readFile(start.files.start), originalStart);
  assert.equal(await readFile(start.files.stdout, 'utf8'), 'original output\n');
  await finishOperation({ ...common, status: 'succeeded', result: { original: true } });
  const originalResult = await readFile(start.files.result);
  await assert.rejects(finishOperation({ ...common, status: 'failed', error: 'overwrite attempt' }), { code: 'ALREADY_FINISHED' });
  assert.deepEqual(await readFile(start.files.result), originalResult);
  assert.equal(await readFile(start.files.stdout, 'utf8'), 'original output\n');
});

test('external CLI detects pending work and consumes >1 MiB result from a request FILE', async (t) => {
  const { directory, common } = await fixture(t);
  const beginFile = path.join(directory, 'begin.json');
  await writeFile(beginFile, JSON.stringify({ ...common, command: ['external-service', 'observed-operation'] }));
  const begun = await runCli(['begin', '--request', beginFile]);
  assert.equal(begun.code, 0, begun.stderr);
  const start = JSON.parse(begun.stdout);
  const pending = await pendingOperations(common.logDir);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].status, 'pending');
  assert.equal(pending[0].start.kind, 'external');
  await assert.rejects(stat(start.files.result), { code: 'ENOENT' });
  const scan = await runCli(['pending', '--log-dir', common.logDir]);
  assert.equal(scan.code, 0, scan.stderr);
  assert.equal(JSON.parse(scan.stdout)[0].status, 'pending');

  const payload = 'large external result\n'.repeat(60_000);
  assert.ok(Buffer.byteLength(payload) > 1024 * 1024);
  const finishFile = path.join(directory, 'finish.json');
  // The large JSON is written directly to a file. The spawned CLI receives
  // only three small arguments, including the path, never the JSON body.
  await writeFile(finishFile, JSON.stringify({ ...common, status: 'succeeded', result: { payload } }));
  const finished = await runCli(['finish', '--request', finishFile]);
  assert.equal(finished.code, 0, finished.stderr);
  assert.ok(Buffer.byteLength(finished.stdout) < 4096);
  const saved = JSON.parse(await readFile(start.files.result, 'utf8'));
  assert.equal(saved.result.payload, payload);
  assert.equal(saved.status, 'succeeded');
  assert.deepEqual(await pendingOperations(common.logDir), []);
});

test('an attempt interrupted before START is reported and cannot be silently reused', async (t) => {
  const { common } = await fixture(t);
  await mkdir(path.join(common.logDir, common.operation, common.attempt), { recursive: true });
  const pending = await pendingOperations(common.logDir);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].status, 'incomplete_start');
  await assert.rejects(beginOperation(common), { code: 'DUPLICATE_ATTEMPT' });
});

test('external failure preserves raw details and contradictory success is rejected', async (t) => {
  const { common } = await fixture(t);
  await beginOperation(common);
  await assert.rejects(finishOperation({ ...common, status: 'succeeded', error: { message: 'not successful' } }), { code: 'INCONSISTENT_RESULT' });
  assert.equal((await pendingOperations(common.logDir)).length, 1);
  const raw = { message: 'upstream error', httpStatus: 503, body: 'original response text' };
  const result = await finishOperation({ ...common, status: 'failed', error: raw });
  assert.deepEqual(result.error, raw);
  assert.deepEqual(JSON.parse(await readFile(result.files.result, 'utf8')).error, raw);
  assert.deepEqual(await pendingOperations(common.logDir), []);
});

test('timeout preserves available output and escalates a POSIX child that ignores SIGTERM', async (t) => {
  const { common } = await fixture(t);
  const program = "process.on('SIGTERM',()=>process.stdout.write('term received\\n'));process.stdout.write('ready\\n');process.stderr.write('still running\\n');setInterval(()=>{},1000);";
  const result = await runCommand({ ...common, timeoutMs: 1500, killGraceMs: 100,
    command: [process.execPath, '-e', program] });
  assert.equal(result.status, 'timed_out');
  assert.equal(result.error.code, 'TIMEOUT');
  assert.match(await readFile(result.files.stdout, 'utf8'), /^ready\n/);
  assert.equal(await readFile(result.files.stderr, 'utf8'), 'still running\n');
  if (process.platform !== 'win32') {
    assert.equal(result.signal, 'SIGKILL');
    assert.match(await readFile(result.files.stdout, 'utf8'), /term received/);
  }
  assert.deepEqual(await pendingOperations(common.logDir), []);
});

test('AbortSignal cancellation records available output and its actual reason', async (t) => {
  const { common } = await fixture(t);
  const controller = new AbortController();
  const work = runCommand({ ...common, timeoutMs: 10_000,
    command: [process.execPath, '-e', "process.stdout.write('ready\\n');setInterval(()=>{},1000);"] }, { signal: controller.signal });
  const stdout = path.join(common.logDir, common.operation, common.attempt, 'stdout.log');
  let observed = false;
  for (let i = 0; i < 500; i++) {
    if ((await readFile(stdout, 'utf8').catch(() => '')) === 'ready\n') { observed = true; break; }
    await delay(10);
  }
  controller.abort(new Error('test requested cancellation'));
  const result = await work;
  assert.ok(observed, 'child produced output before cancellation');
  assert.equal(result.status, 'cancelled');
  assert.equal(result.error.code, 'ABORT_ERR');
  assert.equal(result.error.cause.message, 'test requested cancellation');
  assert.equal(await readFile(result.files.stdout, 'utf8'), 'ready\n');
});

test('an already-aborted operation is recorded without executing its command', async (t) => {
  const { directory, common } = await fixture(t);
  const marker = path.join(directory, 'must-not-be-created');
  const controller = new AbortController();
  controller.abort(new Error('cancelled before execution'));
  const result = await runCommand({ ...common,
    command: [process.execPath, '-e', "require('node:fs').writeFileSync(process.argv[1],'ran');", marker] },
  { signal: controller.signal });
  assert.equal(result.status, 'cancelled');
  assert.equal(result.exitCode, null);
  await assert.rejects(stat(marker), { code: 'ENOENT' });
  assert.deepEqual(await pendingOperations(common.logDir), []);
});
