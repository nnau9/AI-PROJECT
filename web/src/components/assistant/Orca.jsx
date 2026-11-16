import { useId } from 'react';

// Маскот помощника — косатка. Собственная графика из простых фигур:
// эллипсы (тело, пятна, грудной плавник, лопасти хвоста), дуги (спинной плавник)
// и квадраты (брызги). Плоские заливки без градиентов; плитка повторяет знак NNATO —
// фигура над линией горизонта. Цвета тела фиксированы (чёрно-белая косатка одинакова
// в светлой и тёмной теме), фон плитки — акцент сайта (см. assistant.css: --orca-*).
//
// compact — для мелких размеров (иконка в шапке): без воды и брызг, косатка крупнее.

export default function Orca({ size = 48, compact = false, title, className = '' }) {
  const clipId = `orca-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={`orca ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="0" cy="0" rx="23" ry="10.5" />
        </clipPath>
      </defs>
      <rect width="64" height="64" fill="var(--orca-tile)" />
      {compact ? null : (
        <>
          {/* линия воды и брызги-квадраты */}
          <rect x="8" y="53" width="48" height="3" fill="var(--orca-white)" />
          <rect x="4" y="42" width="4" height="4" fill="var(--orca-white)" />
          <rect x="19" y="47" width="3" height="3" fill="var(--orca-white)" />
        </>
      )}
      <g className="orca__figure">
        <g transform={compact ? 'translate(40 30.7) rotate(-24) scale(0.9)' : 'translate(37.8 26.4) rotate(-24) scale(0.8)'}>
          {/* хвост: стебель и две лопасти */}
          <path d="M-14 -6 L-30 -2 L-30 2.5 L-14 7 Z" fill="var(--orca-body)" />
          <ellipse cx="-33" cy="-5" rx="7" ry="3" transform="rotate(38 -33 -5)" fill="var(--orca-body)" />
          <ellipse cx="-33" cy="5.5" rx="7" ry="3" transform="rotate(-38 -33 5.5)" fill="var(--orca-body)" />
          {/* спинной плавник */}
          <path d="M7 -8 Q3 -21 -5 -26 Q-5 -15 -9 -8 Z" fill="var(--orca-body)" />
          {/* тело */}
          <ellipse cx="0" cy="0" rx="23" ry="10.5" fill="var(--orca-body)" />
          {/* пятна: белое брюхо, белый бок, серое «седло» за плавником */}
          <g clipPath={`url(#${clipId})`}>
            <ellipse cx="7" cy="10" rx="19" ry="7" fill="var(--orca-white)" />
            <ellipse cx="-11" cy="5.5" rx="7" ry="3.2" transform="rotate(-24 -11 5.5)" fill="var(--orca-white)" />
            <ellipse cx="-12" cy="-7.5" rx="5.5" ry="2.4" transform="rotate(12 -12 -7.5)" fill="var(--orca-saddle)" />
          </g>
          {/* грудной плавник */}
          <ellipse cx="6" cy="10" rx="7.5" ry="3.4" transform="rotate(58 6 10)" fill="var(--orca-body)" />
          {/* белое пятно у глаза и глаз */}
          <ellipse cx="12.5" cy="-3" rx="4.8" ry="2.5" transform="rotate(-14 12.5 -3)" fill="var(--orca-white)" />
          <circle cx="14.4" cy="-2.9" r="1.1" fill="var(--orca-body)" />
        </g>
      </g>
    </svg>
  );
}
