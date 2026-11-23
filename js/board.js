/* global React */
/* Компоненты в стиле интерфейса Stay Out: окна с полосой-заголовком (как «Инвентарь [I]»),
   строки как в настройках клавиатуры (цена — в тёмной «клавише» справа), ячейки инвентаря. */
import { getIconCandidates } from './utils.js';
import { Icon } from './sources.js';

export const PAGE_SIZE = 25;       // строк на странице (список)
export const GRID_PAGE_SIZE = 60;  // ячеек на странице (сетка)

/** Цена как в игре: 1`009`100р. ; 0 — объявлений нет */
export function boardPrice(v) {
  const n = Number(v);
  if (!(n > 0)) return '—';
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '`') + 'р.';
}

/** Коротко, для угла ячейки инвентаря: 950, 35к, 1.2м */
export function shortPrice(v) {
  const n = Number(v);
  if (!(n > 0)) return '';
  if (n < 1000) return String(Math.round(n));
  if (n < 1e6) return (n < 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') : Math.round(n / 1e3)) + 'к';
  return (n < 1e7 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') : Math.round(n / 1e6)) + 'м';
}

/** Цвет цены по уровню (как разноцветные цены в игре) */
export function priceTone(v) {
  const n = Number(v);
  if (!(n > 0)) return 'tone-none';
  if (n < 1000) return 'tone-white';
  if (n < 10000) return 'tone-blue';
  if (n < 100000) return 'tone-green';
  if (n < 1000000) return 'tone-yellow';
  if (n < 10000000) return 'tone-orange';
  if (n < 100000000) return 'tone-violet';
  return 'tone-red';
}

export const fmtDate = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.slice(8, 10) + '.' + s.slice(5, 7) + '.' + s.slice(0, 4) : '');

function onIconError(cands) {
  return (e) => {
    const el = e.currentTarget;
    let i = Number(el.dataset.fidx || 0);
    if (i < cands.length - 1) { i += 1; el.dataset.fidx = String(i); el.src = cands[i]; }
    else { el.classList.add('error'); el.removeAttribute('src'); }
  };
}

/** Иконка в ячейке инвентаря */
export function ItemIcon({ path, size = 44, corner, tone }) {
  const h = React.createElement;
  const cands = getIconCandidates(path);
  return h('div', { className: 'slot' + (tone ? ' ' + tone : '') },
    cands.length
      ? h('img', { src: cands[0], alt: '', width: size, height: size, decoding: 'async', loading: 'lazy',
          'data-fidx': '0', onError: onIconError(cands) })
      : null,
    corner ? h('span', { className: 'slot-count' }, corner) : null
  );
}

/** Строка списка — как строка настроек клавиатуры: название слева, цена в «клавише» справа */
export const BoardRow = React.memo(function BoardRow({ r, selected, onSelect, onAdd, Highlight, query }) {
  const h = React.createElement;
  const key = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } };
  const has = Number(r.price) > 0;
  return h('div', {
    className: 'row' + (selected ? ' is-selected' : ''), role: 'button', tabIndex: 0,
    onClick: onSelect, onKeyDown: key, 'aria-pressed': selected ? 'true' : 'false'
  },
    h(ItemIcon, { path: r.icon_local_path, size: 36 }),
    h('div', { className: 'row-name' }, h(Highlight, { text: r.item_name, query })),
    h('div', { className: 'row-date', title: has ? 'Цена с доски объявлений от этой даты' : '' },
      has && r.price_updated ? fmtDate(r.price_updated) : ''),
    h('div', { className: 'key ' + priceTone(r.price), title: has ? '' : 'Нет объявлений на доске' }, boardPrice(r.price)),
    h('button', {
      className: 'row-add', title: 'Добавить в калькулятор', 'aria-label': 'Добавить в калькулятор',
      onClick: (e) => { e.stopPropagation(); onAdd(); }
    }, h(Icon, { name: 'plus', size: 14, cls: 'ico' }))
  );
});

/** Подсказка у правого края окна открывается влево */
function flipTip(e) {
  const el = e.currentTarget;
  const box = el.closest('.win') || document.body;
  el.classList.toggle('tip-left', el.getBoundingClientRect().right + 240 > box.getBoundingClientRect().right);
}

/** Ячейка инвентаря (режим «сетка»): цена в углу, подсказка как в игре */
export const GridCell = React.memo(function GridCell({ r, selected, onSelect, onAdd }) {
  const h = React.createElement;
  const has = Number(r.price) > 0;
  const key = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
    if (e.key === '+') { e.preventDefault(); onAdd(); }
  };
  return h('div', {
    className: 'cell' + (selected ? ' is-selected' : '') + (has ? '' : ' is-empty'), role: 'button', tabIndex: 0,
    onClick: onSelect, onDoubleClick: onAdd, onKeyDown: key, onMouseEnter: flipTip, onFocus: flipTip, 'aria-label': r.item_name + ', ' + (has ? boardPrice(r.price) : 'нет объявлений')
  },
    h(ItemIcon, { path: r.icon_local_path, size: 52, corner: shortPrice(r.price), tone: priceTone(r.price) }),
    h('div', { className: 'tip', role: 'tooltip' },
      h('div', { className: 'tip-name' }, r.item_name),
      h('div', null, 'Цена: ', h('span', { className: priceTone(r.price) }, has ? boardPrice(r.price) : 'нет объявлений')),
      has && r.price_updated ? h('div', null, 'Обновлено: ' + fmtDate(r.price_updated)) : null,
      h('div', { className: 'tip-hint' }, 'Двойной щелчок — в калькулятор'))
  );
});

/** Переключатель сортировки (как флажок «Автосортировка» в инвентаре) */
export function SortHead({ label, k, sort, setSort, icon }) {
  const h = React.createElement;
  const active = sort.key === k;
  const click = () => setSort(s => (s.key === k ? { key: k, dir: -s.dir } : { key: k, dir: 1 }));
  return h('button', { className: 'sort' + (active ? ' is-active' : ''), onClick: click, 'aria-pressed': active ? 'true' : 'false',
    title: active ? 'Сменить направление' : 'Сортировать: ' + label },
    icon ? h(Icon, { name: icon, size: 13, cls: 'sort-lead' }) : null,
    label,
    h(Icon, { name: 'chevron', size: 11, cls: 'sort-ico' + (active && sort.dir < 0 ? ' up' : '') })
  );
}

/** Подвал окна: страницы */
export function Pager({ page, pages, setPage }) {
  const h = React.createElement;
  const btn = (label, to, dis, icon, after) => h('button', {
    className: 'btn btn-pg', disabled: dis, onClick: () => setPage(to), 'aria-label': label, title: label
  }, after ? null : h(Icon, { name: icon, size: 12, cls: 'ico' }), h('span', { className: 'lbl' }, label),
     after ? h(Icon, { name: icon, size: 12, cls: 'ico' }) : null);
  return h('div', { className: 'pager' },
    btn('В начало', 0, page === 0, 'first'),
    btn('Назад', page - 1, page === 0, 'prev'),
    h('span', { className: 'pager-info' }, (pages ? page + 1 : 0) + ' / ' + pages),
    btn('Далее', page + 1, page >= pages - 1, 'next', true),
    btn('В конец', pages - 1, page >= pages - 1, 'last', true)
  );
}

/** Окно игры: полоса-заголовок «Название [клавиша]» + инструменты справа, вкладки, содержимое, подвал */
export function Window({ title, hotkey, icon, tools, tabs, foot, className, bodyClass, children }) {
  const h = React.createElement;
  return h('section', { className: 'win ' + (className || '') },
    h('header', { className: 'win-bar' },
      icon ? h(Icon, { name: icon, size: 16, cls: 'win-ico' }) : null,
      h('h2', { className: 'win-title' }, title, hotkey ? h('span', { className: 'win-key' }, ' [' + hotkey + ']') : null),
      tools ? h('div', { className: 'win-tools' }, tools) : null
    ),
    tabs || null,
    h('div', { className: 'win-body ' + (bodyClass || '') }, children),
    foot ? h('footer', { className: 'win-foot' }, foot) : null
  );
}

/** Вкладки, как в окне персонажа (Экипировка / Достижения / …) */
export function Tabs({ items, value, onChange, label }) {
  const h = React.createElement;
  return h('div', { className: 'tabs', role: 'tablist', 'aria-label': label },
    items.map(([k, t, n, icon]) => h('button', {
      key: k, role: 'tab', 'aria-selected': value === k ? 'true' : 'false',
      className: 'tab' + (value === k ? ' is-active' : ''), onClick: () => onChange(k)
    }, icon ? h(Icon, { name: icon, size: 13, cls: 'tab-ico' }) : null, t, n != null ? h('span', { className: 'tab-n' }, n) : null))
  );
}

/** «Скопировать ссылку» на предмет (…/#название) */
function CopyLink({ name }) {
  const h = React.createElement;
  const [done, setDone] = React.useState(false);
  const url = location.origin + location.pathname + '#' + encodeURIComponent(name);
  const copy = () => {
    const ok = () => { setDone(true); setTimeout(() => setDone(false), 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, () => prompt('Ссылка на предмет:', url));
    else prompt('Ссылка на предмет:', url);
  };
  return h('button', { className: 'link link-btn', onClick: copy, title: url, 'aria-live': 'polite' },
    h(Icon, { name: done ? 'check' : 'link', size: 13, cls: 'ico' }), done ? 'Ссылка скопирована' : 'Скопировать ссылку');
}

/** Шапка карточки: иконка на оливковом свечении (как силуэт в окне снаряжения), название, цена */
export function ItemHead({ item, points = [] }) {
  const h = React.createElement;
  const has = Number(item.price) > 0;
  const last = !has && points.length ? points[points.length - 1] : null; // последняя известная цена
  return h('div', { className: 'card-head' },
    h('div', { className: 'card-stage' }, h(ItemIcon, { path: item.icon_local_path, size: 72 })),
    h('div', { className: 'card-info' },
      h('div', { className: 'card-name' }, item.item_name),
      h('div', { className: 'card-price ' + priceTone(item.price) }, has ? boardPrice(item.price) : 'Нет объявлений'),
      h('div', { className: 'card-sub' },
        has && item.price_updated ? 'минимальная цена на доске, ' + fmtDate(item.price_updated)
          : last ? h(React.Fragment, null, 'на доске сейчас никто не продаёт; последняя цена ',
              h('b', { className: priceTone(last[1]) }, boardPrice(last[1])), ', ' + fmtDate(last[0]))
          : 'на доске сейчас никто не продаёт'),
      h('div', { className: 'card-links' },
        h(CopyLink, { name: item.item_name }),
        item.Url ? h('a', { className: 'link link-btn', href: item.Url, target: '_blank', rel: 'noreferrer noopener' },
          h(Icon, { name: 'external', size: 13, cls: 'ico' }), 'Открыть на SO-Wiki') : null)
    )
  );
}

/** Строка калькулятора */
export function CalcRow({ it, onQty, onRemove }) {
  const h = React.createElement;
  const qty = Number(it.qty) || 1;
  const sum = it.stale ? 0 : (Number(it.price) || 0) * qty;
  return h('div', { className: 'calc-row' + (it.stale ? ' is-stale' : '') },
    h(ItemIcon, { path: it.icon_local_path, size: 30 }),
    h('div', { className: 'calc-main' },
      h('div', { className: 'calc-name', title: it.item_name }, it.item_name),
      h('div', { className: 'calc-sub' },
        it.stale ? 'нет в каталоге'
          : [h('span', { key: 'p', className: priceTone(it.price) }, boardPrice(it.price)),
             qty > 1 && sum ? h('span', { key: 's', className: 'calc-sum' }, ' × ' + qty + ' = ' + boardPrice(sum)) : null])
    ),
    h('div', { className: 'qty' },
      h('button', { className: 'qty-btn', 'aria-label': 'Уменьшить', onClick: () => onQty(Math.max(1, qty - 1)) },
        h(Icon, { name: 'minus', size: 12, cls: 'ico' })),
      h('input', { className: 'qty-input', type: 'number', min: 1, value: qty, 'aria-label': 'Количество',
        onChange: (e) => onQty(Math.max(1, Math.floor(+e.target.value) || 1)) }),
      h('button', { className: 'qty-btn', 'aria-label': 'Увеличить', onClick: () => onQty(qty + 1) },
        h(Icon, { name: 'plus', size: 12, cls: 'ico' }))
    ),
    h('button', { className: 'calc-del', title: 'Убрать', 'aria-label': 'Убрать из калькулятора', onClick: onRemove },
      h(Icon, { name: 'close', size: 12, cls: 'ico' }))
  );
}

/** Иконки категорий (ключи из data/meta.json) */
export const GROUP_ICON = { all: 'cells', weapons: 'rifle', mods: 'scope', ammo: 'bullet', grenades: 'grenade',
  equip: 'vest', med: 'medkit', arts: 'crystal', troph: 'paw', items: 'box',
  'items/parts': 'wrench', 'items/mutant': 'paw', 'items/tech': 'chip', 'items/chem': 'flask', 'items/food': 'pot',
  'items/plants': 'leaf', 'items/tools': 'hammer', 'items/blue': 'list', 'items/misc': 'box' };

/** Список категорий с иконками (обычный <select> не показывает картинки в пунктах) */
export function CatSelect({ options, value, onChange }) {
  const h = React.createElement;
  const { useState, useEffect, useRef } = React;
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const ref = useRef(null);
  const cur = options.find(o => o.key === value) || options[0];

  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  useEffect(() => { if (open) setHi(Math.max(0, options.findIndex(o => o.key === value))); }, [open]);

  const pick = (k) => { onChange(k); setOpen(false); ref.current && ref.current.querySelector('.cat-btn').focus(); };
  const key = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHi(i => (i + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
    }
    if ((e.key === 'Enter' || e.key === ' ') && open) { e.preventDefault(); pick(options[hi].key); }
  };
  const item = (o) => [h(Icon, { key: 'i', name: GROUP_ICON[o.key] || 'box', size: 15, cls: 'cat-ico' }),
    h('span', { key: 't', className: 'cat-t' }, o.label), h('span', { key: 'n', className: 'cat-n' }, o.count)];

  return h('div', { className: 'cat' + (open ? ' is-open' : ''), ref, onKeyDown: key },
    h('button', { className: 'cat-btn', 'aria-haspopup': 'listbox', 'aria-expanded': open ? 'true' : 'false',
      'aria-label': 'Категория: ' + cur.label, onClick: () => setOpen(o => !o) },
      item(cur), h(Icon, { name: 'chevron', size: 11, cls: 'cat-chev' })),
    open ? h('ul', { className: 'cat-list', role: 'listbox', 'aria-label': 'Категория' },
      options.map((o, i) => h('li', {
        key: o.key, role: 'option', 'aria-selected': o.key === value ? 'true' : 'false',
        className: 'cat-opt' + (o.sub ? ' is-sub' : '') + (i === hi ? ' is-hi' : '') + (o.key === value ? ' is-cur' : ''),
        onMouseEnter: () => setHi(i), onClick: () => pick(o.key)
      }, item(o)))) : null
  );
}
