import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareWorktree, WorktreePreparationError} from '../tools/prepare-worktree.mjs';

const helperPath = fileURLToPath(new URL('../tools/prepare-worktree.mjs', import.meta.url));

function git(cwd, args, env = {}) {
  const result = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8', env: {...process.env, GIT_CONFIG_NOSYSTEM: '1', ...env},
  });
  assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
  return result.stdout.trimEnd();
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'adv-worktree-'));
  t.after(() => rmSync(root, {recursive: true, force: true}));
  const repo = join(root, 'source');
  mkdirSync(repo);
  git(repo, ['init', '-b', 'main']);
  git(repo, ['config', 'user.name', 'Worktree Test']);
  git(repo, ['config', 'user.email', 'worktree-test@example.invalid']);
  git(repo, ['config', 'commit.gpgsign', 'false']);
  git(repo, ['config', 'core.autocrlf', 'false']);
  git(repo, ['config', 'core.hooksPath', join(root, 'no-hooks')]);
  writeFileSync(join(repo, 'tracked.txt'), 'original\n');
  git(repo, ['add', 'tracked.txt']);
  git(repo, ['commit', '-m', 'initial +0900 commit'], {
    GIT_AUTHOR_DATE: '2026-11-04T22:50:03+0900',
    GIT_COMMITTER_DATE: '2026-11-04T22:50:03+0900',
  });
  const commit = git(repo, ['rev-parse', 'HEAD']);
  const target = join(root, 'worktree');
  const options = {repositoryPath: repo, worktreePath: target, branch: 'fix/execution', expectedCommit: commit};
  return {root, repo, target, commit, options};
}

function refs(repo) {
  return git(repo, ['for-each-ref', '--format=%(refname) %(objectname)']);
}

function expectError(code, fn) {
  assert.throws(fn, error => {
    assert.ok(error instanceof WorktreePreparationError);
    assert.equal(error.code, code);
    return true;
  });
}

test('uses the exact +0900 Git object and creates a worktree without reconstructing it', t => {
  const f = fixture(t);
  const objectBefore = git(f.repo, ['cat-file', 'commit', f.commit]);
  assert.match(objectBefore, /author .* \d+ \+0900\n/);
  assert.match(objectBefore, /committer .* \d+ \+0900\n/);
  const result = prepareWorktree(f.options);
  assert.equal(result.action, 'created');
  assert.equal(result.createdBranch, true);
  assert.equal(result.dirty, false);
  assert.equal(result.commit, f.commit);
  assert.equal(git(f.target, ['rev-parse', 'HEAD']), f.commit);
  assert.equal(git(f.repo, ['cat-file', 'commit', f.commit]), objectBefore);
  assert.equal(readFileSync(join(f.target, 'tracked.txt'), 'utf8'), 'original\n');
  assert.equal(git(f.repo, ['symbolic-ref', '--short', 'HEAD']), 'main');
});

test('repeated preparation reuses the matching worktree and preserves dirty and untracked files', t => {
  const f = fixture(t);
  prepareWorktree(f.options);
  writeFileSync(join(f.target, 'tracked.txt'), 'user edits\n');
  writeFileSync(join(f.target, 'untracked.txt'), 'unfinished work\n');
  const refsBefore = refs(f.repo);
  const statusBefore = git(f.target, ['status', '--porcelain=v1']);
  const result = prepareWorktree(f.options);
  assert.equal(result.action, 'reused');
  assert.equal(result.dirty, true);
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(git(f.target, ['status', '--porcelain=v1']), statusBefore);
  assert.equal(readFileSync(join(f.target, 'tracked.txt'), 'utf8'), 'user edits\n');
  assert.equal(readFileSync(join(f.target, 'untracked.txt'), 'utf8'), 'unfinished work\n');
});

test('attaches an existing matching branch instead of asserting that it must be absent', t => {
  const f = fixture(t);
  git(f.repo, ['branch', f.options.branch, f.commit]);
  const refsBefore = refs(f.repo);
  const result = prepareWorktree(f.options);
  assert.equal(result.action, 'created');
  assert.equal(result.createdBranch, false);
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(git(f.target, ['symbolic-ref', '--short', 'HEAD']), f.options.branch);
});

test('refuses a mismatched existing branch without changing refs or creating the destination', t => {
  const f = fixture(t);
  writeFileSync(join(f.repo, 'tracked.txt'), 'second commit\n');
  git(f.repo, ['commit', '-am', 'later work']);
  git(f.repo, ['branch', f.options.branch]);
  const refsBefore = refs(f.repo);
  expectError('BRANCH_COMMIT_MISMATCH', () => prepareWorktree(f.options));
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(existsSync(f.target), false);
});

test('refuses missing commit objects and abbreviated IDs without creating refs', t => {
  const f = fixture(t);
  const refsBefore = refs(f.repo);
  expectError('MISSING_COMMIT_OBJECT', () => prepareWorktree({...f.options, expectedCommit: '0'.repeat(40)}));
  expectError('FULL_COMMIT_REQUIRED', () => prepareWorktree({...f.options, expectedCommit: f.commit.slice(0, 7)}));
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(existsSync(f.target), false);
});

test('refuses a full SHA for a tree rather than silently peeling or inventing a commit', t => {
  const f = fixture(t);
  const tree = git(f.repo, ['rev-parse', 'HEAD^{tree}']);
  const refsBefore = refs(f.repo);
  expectError('NOT_A_COMMIT', () => prepareWorktree({...f.options, expectedCommit: tree}));
  assert.equal(refs(f.repo), refsBefore);
});

test('refuses a destination belonging to another repository and preserves its files', t => {
  const f = fixture(t);
  const other = fixture(t);
  writeFileSync(join(other.repo, 'untracked.txt'), 'other user work');
  const before = refs(f.repo);
  expectError('WORKTREE_REPOSITORY_MISMATCH', () => prepareWorktree({...f.options, worktreePath: other.repo}));
  assert.equal(refs(f.repo), before);
  assert.equal(readFileSync(join(other.repo, 'untracked.txt'), 'utf8'), 'other user work');
});

test('refuses an occupied non-worktree path without overwriting files', t => {
  const f = fixture(t);
  mkdirSync(f.target);
  writeFileSync(join(f.target, 'keep.txt'), 'existing output');
  const refsBefore = refs(f.repo);
  expectError('WORKTREE_PATH_OCCUPIED', () => prepareWorktree(f.options));
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(readFileSync(join(f.target, 'keep.txt'), 'utf8'), 'existing output');
});

test('refuses destinations inside existing worktrees, including empty directories', t => {
  const f = fixture(t);
  const newNested = join(f.repo, 'nested', 'worktree');
  expectError('PATH_INSIDE_WORKTREE', () => prepareWorktree({...f.options, worktreePath: newNested}));
  assert.equal(existsSync(newNested), false);
  const existingNested = join(f.repo, 'empty');
  mkdirSync(existingNested);
  expectError('PATH_NOT_WORKTREE_ROOT', () => prepareWorktree({...f.options, worktreePath: existingNested}));
});

test('refuses destinations inside Git metadata without creating a branch or directory', t => {
  const f = fixture(t);
  const target = join(f.repo, '.git', 'nested-worktree');
  const refsBefore = refs(f.repo);
  expectError('PATH_IN_GIT_DIRECTORY', () => prepareWorktree({...f.options, worktreePath: target}));
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(existsSync(target), false);
});

test('refuses an existing worktree with the wrong branch or HEAD without resetting it', t => {
  const f = fixture(t);
  prepareWorktree(f.options);
  const refsBefore = refs(f.repo);
  expectError('WORKTREE_BRANCH_MISMATCH', () => prepareWorktree({...f.options, branch: 'fix/other'}));
  assert.equal(refs(f.repo), refsBefore);
  writeFileSync(join(f.target, 'tracked.txt'), 'later worktree commit\n');
  git(f.target, ['commit', '-am', 'worktree progress']);
  const laterRefs = refs(f.repo);
  expectError('WORKTREE_COMMIT_MISMATCH', () => prepareWorktree(f.options));
  assert.equal(refs(f.repo), laterRefs);
  assert.equal(readFileSync(join(f.target, 'tracked.txt'), 'utf8'), 'later worktree commit\n');
});

test('refuses using a branch already checked out at another path', t => {
  const f = fixture(t);
  prepareWorktree(f.options);
  const anotherPath = join(f.root, 'second-worktree');
  const refsBefore = refs(f.repo);
  expectError('BRANCH_IN_USE', () => prepareWorktree({...f.options, worktreePath: anotherPath}));
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(existsSync(anotherPath), false);
});

test('rejects option-like and invalid branch names without executing shell content', t => {
  const f = fixture(t);
  const refsBefore = refs(f.repo);
  for (const branch of ['--force', '../elsewhere', 'refs/heads/other', 'bad branch', 'HEAD']) {
    expectError('INVALID_BRANCH', () => prepareWorktree({...f.options, branch}));
  }
  assert.equal(refs(f.repo), refsBefore);
  assert.equal(existsSync(f.target), false);
});

test('CLI emits a usable result and explicit missing-object error', t => {
  const f = fixture(t);
  const argv = [helperPath, '--repo', f.repo, '--worktree', f.target,
    '--branch', f.options.branch, '--commit', f.commit];
  const created = spawnSync(process.execPath, argv, {encoding: 'utf8', cwd: dirname(helperPath)});
  assert.equal(created.status, 0, created.stderr);
  assert.equal(JSON.parse(created.stdout).commit, f.commit);
  const failed = spawnSync(process.execPath, [...argv.slice(0, -1), 'f'.repeat(40)], {encoding: 'utf8'});
  assert.equal(failed.status, 1);
  assert.equal(JSON.parse(failed.stderr).code, 'MISSING_COMMIT_OBJECT');
  assert.equal(git(f.target, ['rev-parse', 'HEAD']), f.commit);
});
