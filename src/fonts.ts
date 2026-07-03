// ============================================================
// ELLE — self-hosted fonts (Cloudflare-native, no external CDN)
// Replaces the Google Fonts <link>/@import that used to fetch from
// fonts.googleapis.com. @fontsource bundles the woff2 files into the
// app's own build, so nothing is fetched from outside at runtime.
// Weights mirror the original Google Fonts requests exactly.
// ============================================================

// Workbench UI — App.tsx (var(--mono) / var(--ui))
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

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
