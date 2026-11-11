import { useId } from 'react';

// Собственная графика NNATO: маршрут Казахстан → США в плоском «плакатном» стиле.
// Без градиентов и скруглений; цвета — из CSS-токенов (светлая и тёмная тема).

export function HeroArt() {
  const id = useId().replace(/:/g, '');
  const stops = [
    { x: 300, y: 178, t: 'ЗАЯВКА', n: '01' },
    { x: 480, y: 112, t: 'ОФФЕР', n: '02' },
    { x: 720, y: 112, t: 'DS-2019', n: '03' },
    { x: 900, y: 178, t: 'ВИЗА J-1', n: '04' },
  ];
  return (
    <svg className="hero-art" viewBox="0 0 1200 520" role="img" aria-labelledby={`t-${id}`}>
      <title id={`t-${id}`}>Маршрут из Казахстана в США над линией горизонта</title>
      <rect width="1200" height="520" fill="var(--art-bg)" />
      {/* модульная сетка */}
      {[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100].map((x) => (
        <line key={`v${x}`} x1={x} x2={x} y1="0" y2="392" stroke="var(--art-line)" strokeWidth="1" />
      ))}
      {[98, 196, 294].map((y) => (
        <line key={`h${y}`} x1="0" x2="1200" y1={y} y2={y} stroke="var(--art-line)" strokeWidth="1" />
      ))}
      {/* солнце — плоский полукруг */}
      <path d="M450 392 a150 150 0 0 1 300 0z" fill="var(--art-route)" />
      {/* горизонт */}
      <rect y="392" width="1200" height="128" fill="var(--art-ground)" />
      <rect x="0" y="410" width="1200" height="2" fill="var(--art-bg)" opacity="0.5" />
      {/* маршрут */}
      <path d="M150 330 C 380 40, 820 40, 1050 330" fill="none" stroke="var(--text)" strokeWidth="2" strokeDasharray="8 10" className="route-path" />
      {[150, 1050].map((x) => (
        <g key={x}>
          <rect x={x - 10} y="320" width="20" height="20" fill="var(--text)" />
          <rect x={x - 22} y="308" width="44" height="44" fill="none" stroke="var(--text)" strokeWidth="1" />
        </g>
      ))}
      <text x="150" y="380" textAnchor="middle" className="art-label">Казахстан</text>
      <text x="1050" y="380" textAnchor="middle" className="art-label">США</text>
      {/* этапы */}
      {stops.map((c) => (
        <g key={c.t} transform={`translate(${c.x} ${c.y})`}>
          <rect x="-70" y="-22" width="140" height="44" fill="var(--art-chip)" stroke="var(--text)" strokeWidth="1" />
          <rect x="-70" y="-22" width="34" height="44" fill="var(--text)" />
          <text x="-53" y="5" textAnchor="middle" className="art-chip-text" style={{ fill: 'var(--art-chip)' }}>{c.n}</text>
          <text x="17" y="5" textAnchor="middle" className="art-chip-text">{c.t}</text>
        </g>
      ))}
    </svg>
  );
}
