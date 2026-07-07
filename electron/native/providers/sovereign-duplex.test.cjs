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

test('shouldWakeCloud: wakes normally for the first few reciprocal rounds', () => {
  const oneRound = [{ speaker: 'sovereign', content: 'a', created_at: 1 }, { speaker: 'cloud', content: 'b', created_at: 2 }];
  assert.equal(dup.shouldWakeCloud(oneRound, 1000), true);
});

test('shouldWakeCloud: backs off once MAX_CONSECUTIVE_ROUNDS trip, then requires a real cooldown', () => {
  const base = Date.now();
  const messages = [];
  for (let i = 0; i < dup.MAX_CONSECUTIVE_ROUNDS; i++) {
    messages.push({ speaker: 'sovereign', content: `s${i}`, created_at: base + i * 2 });
    messages.push({ speaker: 'cloud', content: `c${i}`, created_at: base + i * 2 + 1 });
  }
  const lastCloudAt = messages[messages.length - 1].created_at;
  // Right after the last round closes: still within cooldown, do not wake.
  assert.equal(dup.shouldWakeCloud(messages, lastCloudAt + 1000), false);
  // Long enough silence: the backoff lifts and it may wake again.
  assert.equal(dup.shouldWakeCloud(messages, lastCloudAt + dup.WAKE_COOLDOWN_MS), true);
});

test('shouldWakeCloud: an observation breaks the round count (not a ping-pong turn)', () => {
  const messages = [
    { speaker: 'sovereign', content: 'a', created_at: 1 },
    { speaker: 'cloud', content: 'b', kind: 'observe', created_at: 2 },
  ];
  assert.equal(dup.trailingRounds(messages), 0);
  assert.equal(dup.shouldWakeCloud(messages, 1000), true);
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

test('stripThinking: complete think blocks are removed, the said part stays', () => {
  assert.equal(dup.stripThinking('<think>private reasoning</think>Hello cloud.'), 'Hello cloud.');
  assert.equal(dup.stripThinking('a<think>x</think>b<think>y</think>c'), 'abc');
});

test('stripThinking: orphaned closer drops everything before it', () => {
  assert.equal(dup.stripThinking('leaked reasoning</think>The message.'), 'The message.');
});

test('stripThinking: unclosed opener yields nothing said', () => {
  assert.equal(dup.stripThinking('<think>still thinking when cut off'), '');
});

test('stripThinking: plain text passes untouched', () => {
  assert.equal(dup.stripThinking('just a message'), 'just a message');
  assert.equal(dup.stripThinking(null), '');
});
