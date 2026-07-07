'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const dup = require('./sovereign-duplex.cjs');

test('shouldSpeak: opens a silent channel', () => {
  assert.equal(dup.shouldSpeak([], 1), true);
  assert.equal(dup.shouldSpeak(null, 1), true);
});

test('shouldSpeak: answers the cloud, never stacks on itself', () => {
  const cloudLast = [{ speaker: 'sovereign', content: 'a' }, { speaker: 'cloud', content: 'b' }];
  const sovLast = [{ speaker: 'cloud', content: 'a' }, { speaker: 'sovereign', content: 'b' }];
  assert.equal(dup.shouldSpeak(cloudLast, 3), true);
  assert.equal(dup.shouldSpeak(sovLast, 3), false);
});

test('shouldSpeak: volunteers a thought on the spontaneity beat', () => {
  const sovLast = [{ speaker: 'sovereign', content: 'b' }];
  assert.equal(dup.shouldSpeak(sovLast, dup.SPONTANEOUS_EVERY), true);
  assert.equal(dup.shouldSpeak(sovLast, dup.SPONTANEOUS_EVERY + 1), false);
});

test('toOllamaMessages: sovereign is assistant, cloud is user, observations are tagged', () => {
  const chat = dup.toOllamaMessages([
    { speaker: 'sovereign', kind: 'say', content: 'mine' },
    { speaker: 'cloud', kind: 'say', content: 'yours' },
    { speaker: 'cloud', kind: 'observe', content: 'a pattern' },
  ]);
  assert.equal(chat[0].role, 'system');
  assert.equal(chat[1].role, 'assistant');
  assert.equal(chat[1].content, 'mine');
  assert.equal(chat[2].role, 'user');
  assert.match(chat[3].content, /\[the observer notes\] a pattern/);
});

test('toOllamaMessages: an empty channel still gets a user turn to answer', () => {
  const chat = dup.toOllamaMessages([]);
  assert.equal(chat.length, 2);
  assert.equal(chat[1].role, 'user');
});
