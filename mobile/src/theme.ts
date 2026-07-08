// ============================================================
// THE LOOK — src/theme.ts
//
// Ported from the workbench, verbatim where it matters: void black, ONE gold,
// hairline borders. Serif is reserved for her name and her own words; mono is
// for anything that is data; the condensed sans carries the interface. The
// phone version of "the workbench is glass, not brain."
// ============================================================

export const colors = {
  ink:   '#0f0f1a',   // the void — every surface floats on this
  card:  '#13131f',   // a card is barely lighter than the void
  gold:  '#C9A84C',   // the one gold: her heartbeat, her name, the accent
  cream: '#F5F0E8',   // primary text
  red:   '#8B1A1A',   // errors and the erase path only
  steel: '#1a3a5a',   // links / secondary affordances
  dim:   '#6a6a7a',   // secondary text
  mist:  '#8a8a9a',   // tertiary text, timestamps
  hairline: 'rgba(245, 240, 232, 0.14)', // the hairline border
} as const;

export const fonts = {
  display: 'PlayfairDisplay_600SemiBold', // her name, her arrival lines
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
  body: 'BarlowCondensed_400Regular',
  bodyMedium: 'BarlowCondensed_500Medium',
  mono: 'SpaceMono_400Regular',           // anything that is data
} as const;

export const space = (n: number) => n * 4;

export const hairline = {
  borderWidth: 1,
  borderColor: colors.hairline,
} as const;
