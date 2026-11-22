/* global React */
/* Блок «Как получить / Где используется» для карточки предмета.
   Данные — data/sources.json (собирается tools/wiki_sources.py со страниц so-wiki.ru). */

import { TradeBlock } from './trade.js';

const SRC_DIR = './data/src/';
const META_URL = './data/meta.json';
const WIKI = 'https://so-wiki.ru/wiki/';
const SHOW = 10; // сколько пунктов показывать до «ещё N»

// SVG-иконки (24×24, контур цветом текста). Эмодзи не используем.
const ICONS = {
  crate:  [['path', { d: 'M3 8h18v12H3z' }], ['path', { d: 'M3 8l2-4h14l2 4' }], ['path', { d: 'M10 12h4' }]],
  paw:    [['path', { d: 'M12 13c-3 0-5.5 3-5.5 5s2 3 5.5 3 5.5-1 5.5-3-2.5-5-5.5-5z' }],
           ['circle', { cx: 5.5, cy: 10, r: 1.8 }], ['circle', { cx: 9.5, cy: 5.5, r: 1.8 }],
           ['circle', { cx: 14.5, cy: 5.5, r: 1.8 }], ['circle', { cx: 18.5, cy: 10, r: 1.8 }]],
  box:    [['path', { d: 'M3 8l9-5 9 5-9 5z' }], ['path', { d: 'M3 8v8l9 5 9-5V8' }], ['path', { d: 'M12 13v8' }]],
  cart:   [['path', { d: 'M2 4h3l2.5 11h11L21 7H6.5' }], ['circle', { cx: 9, cy: 19.5, r: 1.5 }], ['circle', { cx: 17, cy: 19.5, r: 1.5 }]],
  swap:   [['path', { d: 'M4 8h15l-4-4' }], ['path', { d: 'M20 16H5l4 4' }]],
  hammer: [['path', { d: 'M13 3l8 8-3 3-8-8z' }], ['path', { d: 'M11.5 9.5L3 18l3 3 8.5-8.5' }]],
  pot:    [['path', { d: 'M4 11h16v4a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z' }], ['path', { d: 'M2 11h2M20 11h2' }],
           ['path', { d: 'M9 3c0 1.5 1 1.5 1 3M14 3c0 1.5 1 1.5 1 3' }]],
  wrench: [['path', { d: 'M14.5 4a4.5 4.5 0 0 0-4.3 5.8L3 17l4 4 7.2-7.2A4.5 4.5 0 0 0 20 9.5l-3 3-3-1-1-3 3-3a4.5 4.5 0 0 0-1.5-1.5z' }]],
  medal:  [['circle', { cx: 12, cy: 15, r: 5 }], ['path', { d: 'M8 3l2.5 7M16 3l-2.5 7' }]],
  trophy: [['path', { d: 'M7 4h10v5a5 5 0 0 1-10 0z' }], ['path', { d: 'M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4' }],
           ['path', { d: 'M12 14v4M8 21h8M10 18h4' }]],
  coins:  [['circle', { cx: 9, cy: 9, r: 5.5 }], ['path', { d: 'M14.3 8.3A5.5 5.5 0 1 1 8.3 14.3' }]],
  list:   [['path', { d: 'M9 6h11M9 12h11M9 18h11' }], ['circle', { cx: 4.5, cy: 6, r: 1 }],
           ['circle', { cx: 4.5, cy: 12, r: 1 }], ['circle', { cx: 4.5, cy: 18, r: 1 }]],
  chevron: [['path', { d: 'M9 6l6 6-6 6' }]],
  clock:  [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M12 7.5V12l3 2' }]],
  plus:   [['path', { d: 'M12 5v14M5 12h14' }]],
  minus:  [['path', { d: 'M5 12h14' }]],
  close:  [['path', { d: 'M6 6l12 12M18 6L6 18' }]],
  prev:   [['path', { d: 'M15 6l-6 6 6 6' }]],
  next:   [['path', { d: 'M9 6l6 6-6 6' }]],
  first:  [['path', { d: 'M17 6l-6 6 6 6' }], ['path', { d: 'M7 5v14' }]],
  last:   [['path', { d: 'M7 6l6 6-6 6' }], ['path', { d: 'M17 5v14' }]],
  search: [['circle', { cx: 10.5, cy: 10.5, r: 6 }], ['path', { d: 'M15 15l5 5' }]],
  refresh:[['path', { d: 'M19 8a8 8 0 1 0 1 5' }], ['path', { d: 'M20 4v4h-4' }]],
  rows:   [['path', { d: 'M4 6h16M4 12h16M4 18h16' }]],
  cells:  [['path', { d: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z' }]],
  cube:   [['path', { d: 'M12 3l8 4.5v9L12 21l-8-4.5v-9z' }], ['path', { d: 'M4 7.5l8 4.5 8-4.5M12 12v9' }]],
  spark:  [['path', { d: 'M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8' }],
           ['circle', { cx: 12, cy: 12, r: 2 }]],
  bullet: [['path', { d: 'M10 21V10c0-3 1-5.5 2-7 1 1.5 2 4 2 7v11z' }], ['path', { d: 'M10 17h4' }]],
  link:   [['path', { d: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1' }], ['path', { d: 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1' }]],
  check:  [['path', { d: 'M5 12.5l4.5 4.5L19 7.5' }]],
  // категории
  rifle:   [['path', { d: 'M2 8.5h20M5.5 8.5v4H17v-4' }], ['path', { d: 'M2 8.5V15l3.5-2.5' }], ['path', { d: 'M10 12.5L9 18h2.8l.9-5.5' }], ['path', { d: 'M14.5 12.5l1 3' }], ['path', { d: 'M18.5 8.5V6.5' }]],
  scope:   [['path', { d: 'M2.5 6.5h4L8 9h8l1.5-2.5h4v9h-4L16 13H8l-1.5 2.5h-4z' }], ['path', { d: 'M10 13v4.5M14 13v4.5M8.5 17.5h7' }]],
  grenade: [['circle', { cx: 11, cy: 14.5, r: 6 }], ['path', { d: 'M9 8.7V6h4v2.7' }], ['path', { d: 'M13 6l5-2.5' }], ['path', { d: 'M11 11.5v6M8 14.5h6' }]],
  vest:    [['path', { d: 'M8 3.5h2.5L12 6l1.5-2.5H16l4 3.5v13.5H4V7z' }], ['path', { d: 'M12 6v14.5M7.5 13h3M13.5 13h3' }]],
  medkit:  [['path', { d: 'M3 7h18v13H3z' }], ['path', { d: 'M9 7V4.5h6V7' }], ['path', { d: 'M12 10.5v6M9 13.5h6' }]],
  crystal: [['path', { d: 'M12 2.5l6 6.5-6 12.5L6 9z' }], ['path', { d: 'M6 9h12M12 2.5L10 9l2 12.5L14 9z' }]],
  // сортировка, вкладки, окна
  alpha:   [['path', { d: 'M3 18L7 6l4 12M4.5 14h5' }], ['path', { d: 'M18 5v14M15 16l3 3 3-3' }]],
  tag:     [['path', { d: 'M3 12V3.5h8.5L21 13l-8 8z' }], ['circle', { cx: 7.5, cy: 7.5, r: 1.5 }]],
  tagoff:  [['path', { d: 'M3 12V3.5h8.5L21 13l-8 8z' }], ['path', { d: 'M3 3l18 18' }]],
  calc:    [['path', { d: 'M5 3h14v18H5z' }], ['path', { d: 'M8 6.5h8v3H8z' }],
            ['path', { d: 'M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01' }]],
  chart:   [['path', { d: 'M4 4v16h16' }], ['path', { d: 'M7.5 14.5l3.5-4 3 3 5-6' }]],
  scales:  [['path', { d: 'M12 4v16M8 20h8M5 7h14' }], ['path', { d: 'M5 7l-3 6.5h6zM19 7l-3 6.5h6z' }]],
  pin:     [['path', { d: 'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z' }], ['circle', { cx: 12, cy: 9.5, r: 2.5 }]],
  external:[['path', { d: 'M14 4h6v6M20 4l-9 9' }], ['path', { d: 'M18 14v6H4V6h6' }]],
  weight:  [['path', { d: 'M5.5 20l2-11h9l2 11z' }], ['circle', { cx: 12, cy: 5.5, r: 2 }]],
  star:    [['path', { d: 'M12 3.5l2.5 5.3 5.8.7-4.3 4 1.1 5.7L12 16.4l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z' }]],
  folder:  [['path', { d: 'M3 6h6l2 2h10v11H3z' }]],
  sell:    [['path', { d: 'M4 14v6h16v-6' }], ['path', { d: 'M12 15V4M7.5 8.5L12 4l4.5 4.5' }]],
  wallet: [['path', { d: 'M3 7h16a2 2 0 0 1 2 2v9H3z' }], ['path', { d: 'M3 7l12-3v3' }], ['path', { d: 'M16 13h2' }]],
};

/** <svg> по имени иконки */
export function Icon({ name, size = 14, cls = 'src-svg' }) {
  const h = React.createElement;
  const parts = ICONS[name];
  if (!parts) return null;
  return h('svg', {
    className: cls, viewBox: '0 0 24 24', width: size, height: size, fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
    'aria-hidden': 'true', focusable: 'false'
  }, parts.map(([tag, attrs], i) => h(tag, { key: i, ...attrs })));
}

// «Совместимость и ремонт»: патроны/оружие и ремкомплекты — не способ получения
// «610, 21, 55, 40» -> «610 м/с, износ 21, ост. эффект 55%, шанс 40%» (столбцы таблицы вики)
const ammoNote = (v) => {
  const m = String(v).split(/,\s*/);
  if (m.length !== 4) return v;
  return m[0] + ' м/с, износ ' + m[1] + ', ост. эффект ' + m[2] + '%, шанс ' + m[3] + '%';
};
const SERVICE = [
  { t: 'Подходящие патроны', src: ['Зависимые характеристики боеприпаса'], icon: 'bullet', fmt: ammoNote,
    hint: 'скорость пули, износ оружия, останавливающий эффект и его шанс' },
  { t: 'Ремонт', src: ['Ремонтируется с помощью', 'Восстанавливается с помощью'], icon: 'wrench', hint: 'ремкомплекты' },
];
const SERVICE_SRC = SERVICE.flatMap(x => x.src);

// порядок и подписи разделов «как получить»
const GET_ORDER = [
  { t: 'Можно найти в', icon: 'crate', hint: 'схроны и контейнеры' },
  { t: 'Добывается из', icon: 'paw', hint: 'мобы и NPC' },
  { t: 'Выпадает из',   icon: 'box', hint: 'при открытии предметов' },
  { t: 'Продаёт', icon: 'cart', hint: 'купить у NPC' },
  { t: 'Меняет', icon: 'swap', hint: 'обмен у NPC' },
  { t: 'Рецепт для создания', icon: 'hammer', hint: 'крафт' },
  { t: 'Готовится в котелке из', icon: 'pot', hint: 'ингредиенты' },
  { t: 'Порождается аномалией', icon: 'spark', hint: 'артефакты' },
  { t: 'Выдается в награду за задание', icon: 'medal', hint: 'задания' },
  { t: 'Выдается в награду за событие', icon: 'trophy', hint: '' },
  { t: 'Выдается в награду за PvP сезон', icon: 'trophy', hint: '' },
];

const srcCache = new Map();
/** Сведения одного предмета: data/src/<item_id>.json (null — сведений нет). Кэш на сеанс. */
export function loadSource(id) {
  if (!srcCache.has(id)) {
    srcCache.set(id, fetch(SRC_DIR + encodeURIComponent(id) + '.json')
      .then(r => (r.ok ? r.json() : (r.status === 404 ? null : Promise.reject(new Error('HTTP ' + r.status)))))
      .catch(e => { srcCache.delete(id); throw e; }));
  }
  return srcCache.get(id);
}

let metaCache = null;
/** Категории и дата сведений: data/meta.json */
export function loadMeta() {
  if (!metaCache) {
    metaCache = fetch(META_URL, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : { groups: [], g: {} }))
      .catch(() => ({ groups: [], g: {} }));
  }
  return metaCache;
}

/** Ссылка на страницу вики по названию (как MediaWiki: пробелы -> «_») */
export const wikiUrl = (name) => WIKI + encodeURIComponent(String(name).replace(/ /g, '_'));

function Chips({ sec, expanded, onExpand }) {
  const h = React.createElement;
  const names = expanded ? sec.n : sec.n.slice(0, SHOW);
  return h('div', { className: 'src-chips' },
    names.map(n => h('a', {
      key: n, className: 'src-chip', href: wikiUrl(n), target: '_blank', rel: 'noreferrer noopener',
      title: sec.x && sec.x[n] ? n + ' — ' + sec.x[n] : n
    }, n, sec.x && sec.x[n] ? h('span', { className: 'src-note' }, ' · ' + sec.x[n]) : null)),
    (!expanded && sec.n.length > SHOW)
      ? h('button', { className: 'src-more', onClick: onExpand }, 'ещё ' + (sec.n.length - SHOW))
      : null
  );
}

/** Заголовок сворачиваемого раздела: стрелка, иконка, название, счётчик, подсказка */
function Summary({ icon, title, count, hint }) {
  const h = React.createElement;
  return h('summary', { className: 'src-title', title: hint ? title + ' — ' + hint : title },
    icon ? h(Icon, { name: icon }) : h('span', { className: 'src-svg' }),
    h('span', { className: 'src-tt' }, title),
    h('span', { className: 'src-count' }, String(count)),
    h(Icon, { name: 'chevron', size: 12, cls: 'src-chev' })
  );
}

/** Раздел — <details>, изначально свёрнут */
function Section({ sec, meta, expanded, onExpand }) {
  const h = React.createElement;
  return h('details', { className: 'src-sec' },
    h(Summary, { icon: meta && meta.icon, title: sec.t, count: sec.n.length, hint: meta && meta.hint }),
    h(Chips, { sec, expanded, onExpand })
  );
}

/** Карточка: пометки, «Как получить», «Где используется», описание */
export function SourcesBlock({ item }) {
  const h = React.createElement;
  const { useEffect, useState } = React;
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  const [open, setOpen] = useState({}); // раскрытые разделы

  useEffect(() => {
    let alive = true;
    setOpen({});
    setState({ loading: true, data: null, error: '' });
    Promise.all([loadSource(item.item_id), loadMeta()])
      .then(([rec, meta]) => alive && setState({ loading: false, data: { rec, updated: meta.src_updated }, error: '' }))
      .catch(e => alive && setState({ loading: false, data: null, error: e.message || String(e) }));
    return () => { alive = false; };
  }, [item && item.item_id]);

  if (state.loading) return h('div', { className: 'src muted' }, 'Загрузка сведений…');
  if (state.error) return h('div', { className: 'src muted' }, 'Сведения о получении недоступны (' + state.error + ')');

  const rec = state.data && state.data.rec;
  if (!rec) return h('div', { className: 'src muted' }, 'На SO-Wiki нет сведений о получении.');

  const info = rec.info || {};
  const secs = rec.sections || [];
  const get = [];
  for (const o of GET_ORDER) { const s = secs.find(x => x.t === o.t); if (s) get.push([s, o]); }
  for (const s of secs) if ((s.k === 'get' || s.k === 'other') && !SERVICE_SRC.includes(s.t) && !GET_ORDER.some(o => o.t === s.t)) get.push([s, null]);
  // ремонт и патроны — отдельный блок; одноимённые разделы сливаются
  const service = [];
  for (const m of SERVICE) {
    const sec = { t: m.t, n: [], x: {} };
    for (const s of secs) if (m.src.includes(s.t)) for (const n of s.n) {
      if (!sec.n.includes(n)) { sec.n.push(n); if (s.x && s.x[n]) sec.x[n] = m.fmt ? m.fmt(s.x[n]) : s.x[n]; }
    }
    // у патрона этот раздел перечисляет оружие, у оружия — патроны
    if (m.fmt && sec.n.length && !sec.n.some(n => /^(Патрон|Пул|Дроб|Картечь|Снаряд|Выстрел)/i.test(n))) sec.t = 'Подходит к оружию';
    if (sec.n.length) service.push([sec, m]);
  }
  const use = secs.filter(s => s.k === 'use');
  const sell = secs.filter(s => s.k === 'sell');
  // все разделы «при продаже» — одним разделом «Кому продать NPC»
  const sellSec = { t: 'Кому продать NPC', n: [], x: {} };
  for (const s of sell) for (const n of s.n) {
    if (!sellSec.n.includes(n)) { sellSec.n.push(n); if (s.x && s.x[n]) sellSec.x[n] = s.x[n]; }
  }
  const useTotal = use.reduce((a, s) => a + s.n.length, 0);

  const badges = [];
  if (info.personal) badges.push(['Персональный — нельзя продать', 'warn']);
  if (info.lifetime) badges.push(['Пропадёт через ' + info.lifetime, 'warn']);
  if (info.no_drop) badges.push(['Не выпадает при смерти', '']);

  const sec = (s, meta) => h(Section, {
    key: s.t, sec: s, meta, expanded: !!open[s.t],
    onExpand: () => setOpen(o => ({ ...o, [s.t]: true }))
  });

  const facts = [['Категория', info.category, 'folder'], ['Уровень', info.level, 'star'], ['Вес', info.weight, 'weight']].filter(x => x[1]);

  return h('div', { className: 'src' },
    facts.length ? h('dl', { className: 'src-facts' },
      facts.map(([k, v, ic]) => h('div', { key: k }, h('dt', null, h(Icon, { name: ic, size: 12, cls: 'fact-ico' }), k), h('dd', null, v)))) : null,
    badges.length ? h('div', { className: 'src-badges' },
      badges.map(([t, c]) => h('span', { key: t, className: 'src-badge ' + c }, t))) : null,
    h(TradeBlock, { item, rec }),
    h('div', { className: 'src-head' }, h(Icon, { name: 'pin', size: 13, cls: 'head-ico' }), 'Как получить'),
    get.length
      ? h('div', { className: 'src-list' }, get.map(([s, m]) => sec(s, m)))
      : h('div', { className: 'muted text-sm' }, 'Способ получения на SO-Wiki не указан.'),
    (sell.length || use.length) ? h('div', { className: 'src-list' },
      sell.length ? sec(sellSec, { icon: 'coins', hint: 'скупщики' }) : null,
      use.length ? h('details', { key: 'use', className: 'src-sec' },
        h(Summary, { icon: 'list', title: 'Где используется', count: useTotal }),
        h('div', { className: 'src-list src-nested' }, use.map(s => sec(s, null)))) : null) : null,
    service.length ? h('div', { className: 'src-head' }, h(Icon, { name: 'wrench', size: 13, cls: 'head-ico' }), 
      service.length > 1 ? 'Совместимость и ремонт' : service[0][1].fmt ? 'Совместимость' : 'Ремонт') : null,
    service.length ? h('div', { className: 'src-list' }, service.map(([s, m]) => sec(s, m))) : null,
    info.desc ? h('p', { className: 'src-desc muted' }, info.desc) : null,
    state.data.updated ? h('div', { className: 'src-upd muted' }, 'Данные SO-Wiki от ' + state.data.updated) : null
  );
}
