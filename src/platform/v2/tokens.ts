export const DARK = {
  bg: '#0d0b09', bgElev: 'rgba(28,22,18,0.55)', surface: '#16120f',
  surfaceSoft: '#1d1915', border: 'rgba(255,240,220,0.08)',
  borderStrong: 'rgba(255,240,220,0.14)', ink: '#f5efe6', ink2: '#cfc4b5',
  ink3: '#928876', mute: '#6b6253', accent: '#ff6a42', accent2: '#ff8a5c',
  accentSoft: 'rgba(255,106,66,0.14)', accentTint: 'rgba(255,106,66,0.22)',
  success: '#2fd2a0', warn: '#f0a650', danger: '#ff6d55',
  aiGrad: 'linear-gradient(135deg,#ff6a42 0%,#ff8a5c 50%,#ffc08a 100%)',
  bgGrad: 'radial-gradient(1200px 600px at 20% -10%,rgba(255,138,92,0.18),transparent 60%),radial-gradient(900px 500px at 100% 100%,rgba(255,90,54,0.10),transparent 60%),#0d0b09',
};

export const LIGHT = {
  bg: '#f7f5f0', bgElev: 'rgba(255,255,255,0.72)', surface: '#ffffff',
  surfaceSoft: '#f0ece5', border: 'rgba(30,24,18,0.08)',
  borderStrong: 'rgba(30,24,18,0.14)', ink: '#1a1613', ink2: '#3d342d',
  ink3: '#6b6158', mute: '#9c928a', accent: '#ff5a36', accent2: '#ff8a5c',
  accentSoft: 'rgba(255,90,54,0.10)', accentTint: 'rgba(255,90,54,0.18)',
  success: '#0a9671', warn: '#d97a1f', danger: '#c8321a',
  aiGrad: 'linear-gradient(135deg,#ff5a36 0%,#ff8a5c 50%,#ffb27a 100%)',
  bgGrad: 'radial-gradient(1200px 600px at 20% -10%,rgba(255,138,92,0.18),transparent 60%),radial-gradient(900px 500px at 100% 100%,rgba(255,90,54,0.10),transparent 60%),#f7f5f0',
};

export const FONTS = {
  sans: "'Geist','Inter',-apple-system,BlinkMacSystemFont,system-ui,sans-serif",
  serif: "'Instrument Serif','Cormorant Garamond','Times New Roman',serif",
  mono: "'JetBrains Mono',ui-monospace,'SF Mono',Menlo,monospace",
};

export type Theme = typeof DARK & { fonts: typeof FONTS; density: string; mode: string; setMode: (m:string)=>void; setAccent: (a:string)=>void; setDensity: (d:string)=>void; };
