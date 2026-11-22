/* global React */
/* История цен: data/history.json — { updated, items: { item_id: { "YYYY-MM-DD": цена } } }.
   В карточке — линия цены по датам, изменение к прошлой цене, табличный вид. */
import { boardPrice, fmtDate } from './board.js';
import { Icon } from './sources.js';

const HISTORY_URL = './data/history.json';
let cache = null;

/** Загрузка истории один раз за сеанс; без файла — пустая история */
export function loadHistory() {
  if (!cache) {
    cache = fetch(HISTORY_URL, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : { items: {} }))
      .catch(() => ({ items: {} }));
  }
  return cache;
}

/** Точки предмета [[дата, цена], ...] по возрастанию даты */
export function pointsOf(hist, item) {
  const m = hist && hist.items && hist.items[item.item_id];
  if (!m) return [];
  return Object.keys(m).sort().map(d => [d, Number(m[d])]).filter(p => p[1] > 0);
}

const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));

/** Изменение текущей цены к предыдущей точке истории */
export function changeOf(points) {
  if (points.length < 2) return null;
  const [d1, p1] = points[points.length - 2];
  const [, p2] = points[points.length - 1];
  return { pct: Math.round((p2 - p1) / p1 * 100), from: p1, date: d1 };
}

/** Линия цены: одна серия, ось времени по датам, подсказка при наведении */
function Spark({ points }) {
  const h = React.createElement;
  const { useState } = React;
  const [hover, setHover] = useState(null);
  const W = 320, H = 72, PX = 6, PT = 8, PB = 8;
  const vals = points.map(p => p[1]);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (lo === hi) { lo *= 0.9; hi *= 1.1; }
  // точки через равные промежутки: замеры бывают с перерывами в месяцы, на шкале времени они слиплись бы;
  // перерыв дольше 60 дней показан пунктиром, даты — в подсказке и таблице
  const n = points.length;
  const xi = (i) => PX + (n === 1 ? (W - 2 * PX) / 2 : i / (n - 1) * (W - 2 * PX));
  const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const xy = points.map(([, v], i) => [xi(i), y(v)]);
  const seg = (i) => 'M' + xy[i - 1][0].toFixed(1) + ' ' + xy[i - 1][1].toFixed(1) + 'L' + xy[i][0].toFixed(1) + ' ' + xy[i][1].toFixed(1);
  const gap = (i) => day(points[i][0]) - day(points[i - 1][0]) > 60 * 864e5;
  const solid = xy.slice(1).map((_, k) => k + 1).filter(i => !gap(i)).map(seg).join(' ');
  const dashed = xy.slice(1).map((_, k) => k + 1).filter(gap).map(seg).join(' ');

  const move = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * W;
    let best = 0;
    for (let i = 1; i < xy.length; i++) if (Math.abs(xy[i][0] - mx) < Math.abs(xy[best][0] - mx)) best = i;
    setHover(best);
  };
  const hp = hover != null ? points[hover] : null;

  return h('div', { className: 'spark' }, h('div', { className: 'spark-plot' },
    h('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none', className: 'spark-svg',
      onMouseMove: move, onMouseLeave: () => setHover(null), role: 'img',
      'aria-label': 'Цена по датам: ' + points.map(([d, v]) => fmtDate(d) + ' ' + boardPrice(v)).join(', ') },
      h('line', { x1: 0, x2: W, y1: H - 1, y2: H - 1, className: 'spark-base' }),
      solid ? h('path', { d: solid, className: 'spark-line', vectorEffect: 'non-scaling-stroke' }) : null,
      dashed ? h('path', { d: dashed, className: 'spark-line is-gap', vectorEffect: 'non-scaling-stroke' }) : null,
      hover != null ? h('line', { x1: xy[hover][0], x2: xy[hover][0], y1: 0, y2: H, className: 'spark-cross', vectorEffect: 'non-scaling-stroke' }) : null
    ),
    // маркеры — HTML-точки поверх SVG (SVG растянут, круги в нём стали бы овалами)
    xy.map(([a, b], i) => h('span', { key: i, className: 'spark-dot' + (i === hover ? ' is-on' : ''),
      style: { left: (a / W * 100) + '%', top: (b / H * 100) + '%' } })),
    hp ? h('div', { className: 'spark-tip', style: { left: (xy[hover][0] / W * 100) + '%',
      transform: 'translate(' + (hover === 0 ? '-10%' : hover === n - 1 ? '-90%' : '-50%') + ', 0)' } },
      h('span', null, fmtDate(hp[0])), ' ', h('b', null, boardPrice(hp[1]))) : null),
    h('div', { className: 'spark-axis' },
      h('span', null, fmtDate(points[0][0])), h('span', null, fmtDate(points[points.length - 1][0])))
  );
}

/** Блок «История цены» для карточки */
export function PriceHistory({ points }) {
  const h = React.createElement;
  if (points.length < 2) return null;
  const ch = changeOf(points);
  return h('div', { className: 'hist' },
    h('div', { className: 'hist-head' },
      h('span', { className: 'src-head' }, 'История цены'),
      ch ? h('span', { className: 'hist-delta' },
        ch.pct === 0 ? 'без изменений' : h(React.Fragment, null,
          h(Icon, { name: 'chevron', size: 11, cls: 'hist-arrow ' + (ch.pct > 0 ? 'up' : 'down') }),
          (ch.pct > 0 ? '+' : '') + ch.pct + '%'),
        h('span', { className: 'muted' }, ' к ' + fmtDate(ch.date))) : null),
    h(Spark, { points }),
    h('details', { className: 'hist-table' },
      h('summary', null, 'Все цены (' + points.length + ')'),
      h('table', null, h('tbody', null, points.slice().reverse().map(([d, v]) =>
        h('tr', { key: d }, h('td', null, fmtDate(d)), h('td', null, boardPrice(v)))))))
  );
}
