import { describe, it, expect } from 'vitest';
import { createSseParser } from './sse';

// Recorded from the worker's live wire (elle-worker src/stream.ts framing):
// event name line, one JSON data line, blank line.
const RECORDED =
  'event: run_start\ndata: {"kind":"run_start","run_id":"abc123"}\n\n' +
  'event: step\ndata: {"kind":"step","step":0,"thought":"search first","tool":"search_corpus","args":{"q":"kappa"}}\n\n' +
  'event: obs\ndata: {"kind":"obs","step":0,"result":"3 passages","duration_ms":420}\n\n' +
  'event: done\ndata: {"content":"Here.","response":"Here.","session_id":"door:u1","steps":1,"kappa_dynamics":null}\n\n';

describe('createSseParser', () => {
  it('parses whole recorded worker output into ordered events', () => {
    const p = createSseParser();
    const events = p.feed(RECORDED);
    expect(events.map(e => e.event)).toEqual(['run_start', 'step', 'obs', 'done']);
    expect(JSON.parse(events[1].data).tool).toBe('search_corpus');
    expect(JSON.parse(events[3].data).session_id).toBe('door:u1');
  });

  it('survives chunks split anywhere — even mid-line', () => {
    for (const size of [1, 3, 7, 20]) {
      const p = createSseParser();
      const events = [];
      for (let i = 0; i < RECORDED.length; i += size) events.push(...p.feed(RECORDED.slice(i, i + size)));
      events.push(...p.flush());
      expect(events.map(e => e.event)).toEqual(['run_start', 'step', 'obs', 'done']);
    }
  });

  it('flush recovers a final frame the server never terminated', () => {
    const p = createSseParser();
    expect(p.feed('event: error\ndata: {"error":"x"}')).toEqual([]);
    const tail = p.flush();
    expect(tail).toHaveLength(1);
    expect(tail[0].event).toBe('error');
    expect(p.flush()).toEqual([]); // idempotent
  });

  it('normalizes CRLF and ignores comment/unknown lines', () => {
    const p = createSseParser();
    const events = p.feed(': keepalive\r\nevent: step\r\nid: 9\r\ndata: {"n":1}\r\n\r\n');
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ event: 'step', data: '{"n":1}' });
  });

  it('joins multi-data-line frames with newlines per spec', () => {
    const p = createSseParser();
    const [ev] = p.feed('event: x\ndata: a\ndata: b\n\n');
    expect(ev.data).toBe('a\nb');
  });
});
