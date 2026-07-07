'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseDotEnv, loadDotEnv } = require('./load-env.cjs');

test('parseDotEnv: plain, exported, and quoted values', () => {
  const out = parseDotEnv([
    'ELLE_SANDBOX_KEY=abc123!',
    'export ELLE_LOCAL_MODEL=qwen3:4b',
    'QUOTED="a value with spaces"',
    "SINGLE='kept as-is'",
  ].join('\n'));
  assert.equal(out.ELLE_SANDBOX_KEY, 'abc123!');
  assert.equal(out.ELLE_LOCAL_MODEL, 'qwen3:4b');
  assert.equal(out.QUOTED, 'a value with spaces');
  assert.equal(out.SINGLE, 'kept as-is');
});

test('parseDotEnv: comments and junk are skipped, # inside a value survives', () => {
  const out = parseDotEnv('# a comment\n\nnot a kv line\nKEY=value#with#hashes\n');
  assert.deepEqual(Object.keys(out), ['KEY']);
  assert.equal(out.KEY, 'value#with#hashes');
});

test('loadDotEnv: applies file vars but never overrides the shell', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'elle-env-'));
  const file = path.join(dir, '.env');
  fs.writeFileSync(file, 'ELLE_TEST_FILE_ONLY=from-file\nELLE_TEST_SHELL_WINS=from-file\n');
  process.env.ELLE_TEST_SHELL_WINS = 'from-shell';
  delete process.env.ELLE_TEST_FILE_ONLY;
  const applied = loadDotEnv([file]);
  assert.equal(applied, 1);
  assert.equal(process.env.ELLE_TEST_FILE_ONLY, 'from-file');
  assert.equal(process.env.ELLE_TEST_SHELL_WINS, 'from-shell');
  delete process.env.ELLE_TEST_FILE_ONLY;
  delete process.env.ELLE_TEST_SHELL_WINS;
  fs.rmSync(dir, { recursive: true, force: true });
});

test('loadDotEnv: no .env anywhere is a quiet zero', () => {
  assert.equal(loadDotEnv(['/definitely/not/a/real/.env']), 0);
});
