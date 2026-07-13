'use strict';
// node --test electron/native/providers/local-embed.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseEmbedResponse, vectorProblem, BGE_LARGE_DIMS } = require('./local-embed.cjs');

const good = () => {
  const v = new Array(BGE_LARGE_DIMS).fill(0);
  v[1] = 0.4; v[999] = -0.02;
  return v;
};

test('parseEmbedResponse: newer /api/embed shape ({embeddings: [[…]]})', () => {
  assert.deepEqual(parseEmbedResponse({ embeddings: [[1, 2, 3]] }), [1, 2, 3]);
});

test('parseEmbedResponse: legacy /api/embeddings shape ({embedding: […]})', () => {
  assert.deepEqual(parseEmbedResponse({ embedding: [4, 5] }), [4, 5]);
});

test('parseEmbedResponse: garbage shapes yield null, not a throw', () => {
  assert.equal(parseEmbedResponse(null), null);
  assert.equal(parseEmbedResponse({}), null);
  assert.equal(parseEmbedResponse({ embeddings: 'x' }), null);
  assert.equal(parseEmbedResponse({ embeddings: [] }), null);
});

test('vectorProblem: a well-formed 1024-dim vector passes', () => {
  assert.equal(vectorProblem(good()), '');
});

test('vectorProblem: wrong dims names both numbers — the wrong-model tell', () => {
  const p = vectorProblem(new Array(768).fill(0.1));
  assert.match(p, /768/);
  assert.match(p, /1024/);
});

test('vectorProblem: non-finite entry names the index', () => {
  const v = good(); v[13] = Infinity;
  assert.match(vectorProblem(v), /\[13\]/);
});

test('vectorProblem: all-zero vector is degenerate, not usable', () => {
  assert.match(vectorProblem(new Array(BGE_LARGE_DIMS).fill(0)), /zero/);
});

test('vectorProblem: null (no embedding parsed) reads as missing', () => {
  assert.match(vectorProblem(null), /no embedding/);
});
