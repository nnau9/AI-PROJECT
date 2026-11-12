// Генерирует битовую маску суши для глобуса на главной (web/src/assets/land-mask.js).
// Источник — Natural Earth 1:110m land (общественное достояние) в виде TopoJSON
// из пакета world-atlas@2.0.2: https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json
//
// Запуск: node scripts/build-land-mask.mjs <путь к land-110m.json>
// Результат: сетка 360×180 (1° на клетку), 1 бит на клетку, base64. Строка 0 — 89.5° с. ш.,
// столбец 0 — 179.5° з. д. Сайт не загружает внешние данные: маска лежит в сборке (~11 КБ).
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const input = process.argv[2];
if (!input) {
  console.error('Укажите путь к land-110m.json');
  process.exit(1);
}
const topo = JSON.parse(readFileSync(input, 'utf8'));
const { scale, translate } = topo.transform;

// Декодирование дуг TopoJSON (дельта-кодирование + квантование).
const arcs = topo.arcs.map((arc) => {
  let x = 0;
  let y = 0;
  return arc.map(([dx, dy]) => {
    x += dx;
    y += dy;
    return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
  });
});
const arcPoints = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = (indices) => indices.flatMap((i, k) => (k ? arcPoints(i).slice(1) : arcPoints(i)));

const rings = [];
for (const geom of topo.objects.land.geometries) {
  const polys = geom.type === 'Polygon' ? [geom.arcs] : geom.arcs;
  for (const poly of polys) for (const r of poly) rings.push(ring(r));
}
const boxed = rings.map((pts) => {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { pts, minX, maxX, minY, maxY };
});

// Чётно-нечётное правило по всем кольцам (дыры — озёра — вычитаются сами).
function isLand(lon, lat) {
  let inside = false;
  for (const r of boxed) {
    if (lat < r.minY || lat > r.maxY || lon < r.minX || lon > r.maxX) continue;
    const p = r.pts;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const [xi, yi] = p[i];
      const [xj, yj] = p[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

const W = 360;
const H = 180;
const bytes = new Uint8Array((W * H) / 8);
let landCells = 0;
for (let row = 0; row < H; row++) {
  const lat = 89.5 - row;
  let line = '';
  for (let col = 0; col < W; col++) {
    const lon = -179.5 + col;
    const land = isLand(lon, lat);
    if (land) {
      const bit = row * W + col;
      bytes[bit >> 3] |= 1 << (bit & 7);
      landCells++;
    }
    if (row % 6 === 0 && col % 3 === 0) line += land ? '#' : '.';
  }
  if (row % 6 === 0) console.log(line);
}

const out = fileURLToPath(new URL('../src/assets/land-mask.js', import.meta.url));
writeFileSync(
  out,
  `// Сгенерировано scripts/build-land-mask.mjs — не редактировать вручную.\n` +
    `// Natural Earth 1:110m land (общественное достояние), world-atlas@2.0.2.\n` +
    `// ${W}×${H}, 1 бит на клетку 1°×1°; строка 0 — 89.5° с. ш., столбец 0 — 179.5° з. д.\n` +
    `export const LAND_MASK = { width: ${W}, height: ${H}, data: '${Buffer.from(bytes).toString('base64')}' };\n`,
);
console.log(`Суша: ${landCells} из ${W * H} клеток. Записано: ${out}`);
