#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync, lstatSync, readdirSync, realpathSync, statSync} from 'node:fs';
import {basename, dirname, join, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {parseArgs} from 'node:util';

/** Prepare a worktree from an observed, existing Git commit object. No network I/O. */
export class WorktreePreparationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'WorktreePreparationError';
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details) {
  throw new WorktreePreparationError(code, message, details);
}

function canonicalPath(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0')) {
    fail('INVALID_PATH', `${label} must be a nonempty filesystem path.`, {label});
  }
  let current = resolve(value);
  const missing = [];
  while (true) {
    try {
      lstatSync(current);
      return join(realpathSync(current), ...missing);
    } catch (error) {
      if (error.code !== 'ENOENT' || existsSync(current) || current === dirname(current)) {
        fail('INVALID_PATH', `Cannot resolve ${label}.`, {path: resolve(value), error: error.message});
      }
      // A dangling symlink is an occupied path, not a missing directory to create.
      try {
        if (lstatSync(current).isSymbolicLink()) {
          fail('INVALID_PATH', `${label} contains a dangling symlink.`, {path: current});
        }
      } catch (linkError) {
        if (linkError instanceof WorktreePreparationError) throw linkError;
        if (linkError.code !== 'ENOENT') throw linkError;
      }
      missing.unshift(basename(current));
      current = dirname(current);
    }
  }
}

function git(cwd, args, {allowFailure = false} = {}) {
  const env = {...process.env, GIT_TERMINAL_PROMPT: '0'};
  // The explicit repository argument must win over inherited Git path selectors.
  for (const key of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_COMMON_DIR', 'GIT_INDEX_FILE',
    'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[key];
  const result = spawnSync('git', ['--no-optional-locks', '-C', cwd, ...args], {
    encoding: 'utf8', shell: false, env, maxBuffer: 16 * 1024 * 1024,
  });
  const details = {cwd, args, exitCode: result.status, signal: result.signal,
    stdout: result.stdout ?? '', stderr: result.stderr ?? ''};
  if (result.error) {
    fail('GIT_EXECUTION_FAILED', 'Git could not be executed.', {
      ...details, error: {code: result.error.code, message: result.error.message},
    });
  }
  if (result.status !== 0 && !allowFailure) {
    fail('GIT_COMMAND_FAILED', `Git failed: ${args[0]}.`, details);
  }
  return details;
}

function commonDirectory(repositoryPath) {
  const result = git(repositoryPath, ['rev-parse', '--path-format=absolute', '--git-common-dir'],
    {allowFailure: true});
  if (result.exitCode !== 0) {
    fail('INVALID_REPOSITORY', 'repositoryPath must identify an existing Git repository.', result);
  }
  return canonicalPath(result.stdout.trim(), 'Git common directory');
}

function inspectWorktree(path) {
  const top = git(path, ['rev-parse', '--show-toplevel'], {allowFailure: true});
  if (top.exitCode !== 0) return null;
  const root = canonicalPath(top.stdout.trim(), 'worktree root');
  if (root !== path) {
    fail('PATH_NOT_WORKTREE_ROOT', 'The requested path is inside another worktree, not its root.',
      {worktreePath: path, existingRoot: root});
  }
  const symbolic = git(path, ['symbolic-ref', '--quiet', 'HEAD'], {allowFailure: true});
  return {
    worktreePath: root,
    commonDirectory: commonDirectory(path),
    ref: symbolic.exitCode === 0 ? symbolic.stdout.trim() : null,
    commit: git(path, ['rev-parse', '--verify', 'HEAD']).stdout.trim(),
    dirty: git(path, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).stdout.length > 0,
  };
}

function registeredWorktrees(repositoryPath) {
  const result = git(repositoryPath, ['worktree', 'list', '--porcelain', '-z']);
  const records = [];
  let record = {};
  for (const field of result.stdout.split('\0')) {
    if (field === '') {
      if (record.path) records.push(record);
      record = {};
    } else if (field.startsWith('worktree ')) record.path = field.slice(9);
    else if (field.startsWith('branch ')) record.ref = field.slice(7);
    else if (field.startsWith('HEAD ')) record.commit = field.slice(5);
  }
  if (record.path) records.push(record);
  return records;
}

function assertMatches(actual, expected) {
  if (actual.commonDirectory !== expected.commonDirectory) {
    fail('WORKTREE_REPOSITORY_MISMATCH', 'The destination belongs to a different repository.',
      {expected, actual});
  }
  if (actual.ref !== expected.ref) {
    fail('WORKTREE_BRANCH_MISMATCH', 'The destination has a different branch or a detached HEAD.',
      {expected, actual});
  }
  if (actual.commit !== expected.commit) {
    fail('WORKTREE_COMMIT_MISMATCH', 'The destination HEAD differs from the observed commit.',
      {expected, actual});
  }
}

/**
 * Creates a new worktree, or reuses a matching worktree without changing its files.
 * Existing refs and dirty files are never reset. Missing objects require a normal
 * Git fetch elsewhere; REST metadata is never used to reconstruct commit bytes.
 */
export function prepareWorktree({repositoryPath, worktreePath, branch, expectedCommit} = {}) {
  const repo = canonicalPath(repositoryPath, 'repositoryPath');
  if (!existsSync(repo) || !statSync(repo).isDirectory()) {
    fail('INVALID_REPOSITORY', 'repositoryPath must be an existing directory.', {repositoryPath: repo});
  }
  const common = commonDirectory(repo);
  if (typeof expectedCommit !== 'string' || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(expectedCommit)) {
    fail('FULL_COMMIT_REQUIRED', 'expectedCommit must be an observed full commit SHA (40 or 64 hex digits).');
  }
  const commit = expectedCommit.toLowerCase();
  const object = git(repo, ['cat-file', '-t', commit], {allowFailure: true});
  if (object.exitCode !== 0) {
    fail('MISSING_COMMIT_OBJECT',
      'The exact commit object is missing. Fetch it through an authorized Git connection, or use the observed remote SHA with the GitHub API. Do not reconstruct it from metadata.',
      {repositoryPath: repo, expectedCommit: commit, stderr: object.stderr});
  }
  if (object.stdout.trim() !== 'commit') {
    fail('NOT_A_COMMIT', 'expectedCommit identifies a different Git object type.',
      {expectedCommit: commit, type: object.stdout.trim()});
  }
  if (typeof branch !== 'string' || !branch || branch.startsWith('refs/') || branch.startsWith('-')) {
    fail('INVALID_BRANCH', 'branch must be a short branch name, such as fix/work-session.', {branch});
  }
  const validBranch = git(repo, ['check-ref-format', '--branch', branch], {allowFailure: true});
  if (validBranch.exitCode !== 0 || validBranch.stdout.trim() !== branch) {
    fail('INVALID_BRANCH', 'branch is not a literal valid Git branch name.', {branch});
  }
  const ref = `refs/heads/${branch}`;
  const target = canonicalPath(worktreePath, 'worktreePath');
  if (target === common || target.startsWith(`${common}${sep}`)) {
    fail('PATH_IN_GIT_DIRECTORY', 'Choose a destination outside the Git metadata directory.',
      {worktreePath: target, commonDirectory: common});
  }
  const expected = {commonDirectory: common, ref, commit};
  if (existsSync(target)) {
    if (!statSync(target).isDirectory()) {
      fail('WORKTREE_PATH_OCCUPIED', 'The destination exists and is not a directory.', {worktreePath: target});
    }
    const actual = inspectWorktree(target);
    if (actual) {
      assertMatches(actual, expected);
      return {action: 'reused', repositoryPath: repo, worktreePath: target, branch, commit,
        commonDirectory: common, dirty: actual.dirty, createdBranch: false};
    }
    if (readdirSync(target).length > 0) {
      fail('WORKTREE_PATH_OCCUPIED', 'The destination contains files and is not the requested worktree.',
        {worktreePath: target});
    }
  } else {
    // Do not place a new worktree inside another working directory.
    let parent = dirname(target);
    while (!existsSync(parent) && parent !== dirname(parent)) parent = dirname(parent);
    const enclosing = git(parent, ['rev-parse', '--show-toplevel'], {allowFailure: true});
    if (enclosing.exitCode === 0) {
      fail('PATH_INSIDE_WORKTREE', 'Choose a destination outside the existing worktree.',
        {worktreePath: target, existingRoot: enclosing.stdout.trim()});
    }
  }
  const branchLines = git(repo, ['for-each-ref', '--format=%(refname)%00%(objectname)', 'refs/heads/'])
    .stdout.trimEnd().split('\n');
  const existing = branchLines.find(line => line.startsWith(`${ref}\0`));
  const observed = existing?.slice(ref.length + 1);
  if (observed && observed !== commit) {
    fail('BRANCH_COMMIT_MISMATCH', 'The existing branch points to another commit; it was not changed.',
      {branch, expectedCommit: commit, observedCommit: observed});
  }
  const registrations = registeredWorktrees(repo);
  const occupied = registrations.find(item => item.ref === ref);
  if (occupied) {
    fail('BRANCH_IN_USE', 'The existing branch is already checked out at another worktree.',
      {branch, worktreePath: occupied.path, commit: occupied.commit});
  }
  const registered = registrations.find(item => resolve(item.path) === target);
  if (registered) {
    fail('WORKTREE_PATH_REGISTERED', 'The destination is already registered. Inspect that worktree before retrying.',
      {worktree: registered});
  }
  const args = observed ? ['worktree', 'add', '--', target, branch]
    : ['worktree', 'add', '-b', branch, '--', target, commit];
  git(repo, args);
  const actual = inspectWorktree(target);
  if (!actual) {
    fail('WORKTREE_VERIFICATION_FAILED', 'Git returned success but the destination is not a worktree.',
      {worktreePath: target});
  }
  // Concurrent ref changes are reported; a mismatch never triggers a destructive rollback.
  assertMatches(actual, expected);
  return {action: 'created', repositoryPath: repo, worktreePath: target, branch, commit,
    commonDirectory: common, dirty: actual.dirty, createdBranch: !observed};
}

export function main(args = process.argv.slice(2)) {
  try {
    const {values} = parseArgs({args, strict: true, options: {
      repo: {type: 'string'}, worktree: {type: 'string'}, branch: {type: 'string'},
      commit: {type: 'string'}, help: {type: 'boolean'},
    }});
    if (values.help) {
      process.stdout.write('Usage: node tools/prepare-worktree.mjs --repo PATH --worktree PATH --branch NAME --commit FULL_SHA\n');
      return 0;
    }
    const result = prepareWorktree({repositoryPath: values.repo, worktreePath: values.worktree,
      branch: values.branch, expectedCommit: values.commit});
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${JSON.stringify({name: error.name, code: error.code ?? 'UNEXPECTED_ERROR',
      message: error.message, details: error.details ?? {}})}\n`);
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = main();
}
