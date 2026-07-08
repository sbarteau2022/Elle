// ============================================================
// SSE PARSER — src/sse.ts
//
// The client half of the worker's live wire (elle-worker src/stream.ts).
// Incremental by construction: network chunks split frames anywhere, so the
// parser buffers until a blank line closes a frame, then emits
// { event, data }. Pure — no fetch, no timers — so it is tested against
// recorded worker output and the two ends cannot drift silently.
// ============================================================

export interface SseEvent {
  event: string;
  data: string; // raw JSON text; caller parses (a bad frame shouldn't kill the stream)
}

export interface SseParser {
  feed(chunk: string): SseEvent[];
  flush(): SseEvent[];
}

export function createSseParser(): SseParser {
  let buffer = '';

  function parseFrame(frame: string): SseEvent | null {
    let event = 'message';
    const data: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).trimStart());
      // comments (:) and unknown fields are ignored, per the SSE spec
    }
    if (!data.length) return null;
    return { event, data: data.join('\n') };
  }

  return {
    feed(chunk: string): SseEvent[] {
      buffer += chunk.replace(/\r\n/g, '\n');
      const events: SseEvent[] = [];
      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const ev = parseFrame(frame);
        if (ev) events.push(ev);
      }
      return events;
    },
    // End of stream: a final unterminated frame (server closed without the
    // trailing blank line) still parses.
    flush(): SseEvent[] {
      const tail = buffer;
      buffer = '';
      if (!tail.trim()) return [];
      const ev = parseFrame(tail);
      return ev ? [ev] : [];
    },
  };
}
