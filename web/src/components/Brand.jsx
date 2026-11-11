/** Знак NNATO: плоский чёрный квадрат с синим «солнцем над горизонтом». Без градиентов и скруглений. */
export function BrandMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="brand-mark">
      <rect width="32" height="32" fill="var(--text)" />
      <path d="M7 21a9 9 0 0 1 18 0z" fill="var(--accent)" />
      <rect x="4" y="22.5" width="24" height="2" fill="var(--bg)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      <BrandMark />
      <span className="wordmark__text">NNATO</span>
    </span>
  );
}
