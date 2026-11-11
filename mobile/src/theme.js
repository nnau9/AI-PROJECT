// NNATO — те же токены, что и в web/src/styles/tokens.css («Poster Modernist»):
// кремовый фон, графитовый текст, один акцент — кобальтовый синий, без скруглений и теней.
const signature = { sig1: '#1351aa', sig2: '#1351aa' };

const light = {
  ...signature,
  bg: '#e3e2de',
  surface: '#e3e2de',
  surfaceMuted: '#dad9d4',
  text: '#141414',
  muted: '#444343',
  label: '#636363',
  border: '#c7c7c7',
  accent: '#1351aa',
  accentSoft: '#d3d8e0',
  onAccent: '#e3e2de',
  ok: '#1f6b3a',
  okSoft: '#d5ddd4',
  warn: '#8a4b00',
  warnSoft: '#e0d8cc',
  danger: '#b3261e',
  sigInk: '#1351aa',
  sigSoft: '#dad9d4',
  ink: '#141414',
  onInk: '#e3e2de',
};

const dark = {
  ...signature,
  sig1: '#6f9ce6',
  sig2: '#6f9ce6',
  bg: '#141414',
  surface: '#141414',
  surfaceMuted: '#1c1c1c',
  text: '#e3e2de',
  muted: '#b5b4b0',
  label: '#8e8e8e',
  border: '#333333',
  accent: '#6f9ce6',
  accentSoft: '#1d2533',
  onAccent: '#141414',
  ok: '#74c98f',
  okSoft: '#18231b',
  warn: '#f3b860',
  warnSoft: '#2a2318',
  danger: '#f08a83',
  sigInk: '#6f9ce6',
  sigSoft: '#1c1c1c',
  ink: '#e3e2de',
  onInk: '#141414',
};

export const getColors = (scheme) => (scheme === 'dark' ? dark : light);

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32 };
export const radius = { s: 0, m: 0, l: 0 };
export const TAP = 44;
