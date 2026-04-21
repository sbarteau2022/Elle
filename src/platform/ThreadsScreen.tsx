import React from 'react';
import type { User } from '../lib/types';

interface Props {
  user: User;
  token: string;
}

export function ThreadsScreen({ user: _user, token: _token }: Props) {
  return (
    <div style={{ padding: '48px', maxWidth: 800, animation: 'slideIn 0.4s ease forwards' }}>
      <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.6rem', letterSpacing: '0.2em', color: '#8B1A1A', textTransform: 'uppercase', marginBottom: 4, margin: '0 0 4px' }}>
        My Threads
      </p>
      <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', marginBottom: 32, margin: '0 0 32px' }}>
        Ongoing situations Elle is tracking for you across sessions.
      </p>

      <div style={{ padding: 48, textAlign: 'center', border: '1px solid rgba(139,26,26,0.2)' }}>
        <p style={{ fontFamily: '"Space Mono", monospace', fontSize: '0.5rem', color: '#8B1A1A', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Coming in Phase 2
        </p>
        <p style={{ fontFamily: '"Playfair Display", serif', color: '#F5F0E8', fontSize: '1.1rem', marginBottom: 12 }}>
          Threads build as you use Elle.
        </p>
        <p style={{ fontFamily: '"Barlow Condensed", sans-serif', color: '#6a6a7a', lineHeight: 1.6, margin: 0 }}>
          Every Ask Elle conversation will become a thread Elle can reference and continue.
          She won't wait to be asked — when the autonomous cycle fires, she'll check your threads
          and reach out if something warrants it.
        </p>
      </div>
    </div>
  );
}
