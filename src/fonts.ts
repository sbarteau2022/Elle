// ============================================================
// ELLE — self-hosted fonts (Cloudflare-native, no external CDN)
// Replaces the Google Fonts <link>/@import that used to fetch from
// fonts.googleapis.com. @fontsource bundles the woff2 files into the
// app's own build, so nothing is fetched from outside at runtime.
// Weights mirror the original Google Fonts requests exactly.
//
// Workbench chrome runs on the Industry design system's type pair —
// Barlow Condensed for headings/labels (var(--serif) in App.tsx, despite
// the name — kept to avoid touching every call site) and Barlow for body
// UI (var(--ui)). JetBrains Mono stays for the terminal/code/data
// readouts, which are genuinely monospace content, not brand chrome.
// ============================================================

// Workbench UI — App.tsx (var(--mono) / var(--ui) / var(--serif))
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/400.css';
import '@fontsource/barlow-condensed/600.css';

// Optimus panel — OptimusPanel.tsx
import '@fontsource/playfair-display/500.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/500-italic.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
