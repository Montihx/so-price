/* global React */
/* «Доска или NPC — где выгоднее»: цены скупки и продажи у NPC берутся из примечаний разделов
   sources.json («Везувий, 6 254 р. · +4 очк. торговли (…)»). */
import { boardPrice } from './board.js';
import { Icon } from './sources.js';

const SELL_TITLES = ['Повышает очки торговли при продаже'];   // NPC покупает у игрока
const BUY_TITLE = 'Продаёт';                                    // NPC продаёт игроку

/** «Тунгуска, 3 565 р. · …» -> { price: 3565, place: 'Тунгуска' } */
export function parseMoney(note) {
  const s = String(note || '');
  const m = s.match(/(\d[\d\s ]*)\s*р\./);
  if (!m) return null;
  const price = Number(m[1].replace(/\D/g, ''));
  if (!(price > 0)) return null;
  const before = s.slice(0, m.index).replace(/[,\s]+$/, '');
  const pt = s.match(/\+(\d+)\s*очк\.\s*торговли(?:\s*\(([^)]*)\))?/);
  return { price, place: before || '', points: pt ? Number(pt[1]) : 0, faction: pt && pt[2] ? pt[2] : '' };
}

function offers(rec, test) {
  const out = [];
  for (const s of (rec && rec.sections) || []) {
    if (!test(s)) continue;
    for (const n of s.n) {
      const p = parseMoney(s.x && s.x[n]);
      if (p) out.push({ npc: n, ...p });
    }
  }
  return out;
}

/** Лучшая цена скупки (NPC платит больше всех) */
export function npcSell(rec) {
  const o = offers(rec, s => s.k === 'sell' || SELL_TITLES.includes(s.t));
  return o.length ? o.reduce((a, b) => (b.price > a.price ? b : a)) : null;
}

/** Самая низкая цена у NPC-продавца */
export function npcBuy(rec) {
  const o = offers(rec, s => s.t === BUY_TITLE);
  return o.length ? o.reduce((a, b) => (b.price < a.price ? b : a)) : null;
}

/** Сколько выручить за предмет лучшим способом: { board, npc, best, where } */
export function bestSale(price, rec) {
  const board = Number(price) > 0 ? Number(price) : 0;
  const s = npcSell(rec);
  const npc = s ? s.price : 0;
  return { board, npc, best: Math.max(board, npc), where: npc > board ? 'npc' : (board ? 'board' : '') };
}

const who = (o) => o.npc + (o.place ? ', ' + o.place : '');
/** Очки торговли: при покупке у NPC их нужно иметь, при продаже NPC — начисляют */
const ptsText = (o, buying) => (o && o.points
  ? (buying ? 'нужно ' : '+') + o.points + ' очк. торговли' + (o.faction ? ' (' + o.faction + ')' : '') : '');
/** «нужно 260 очк. торговли (…)» вместо «+260 очк.» в примечаниях раздела «Продаёт» */
export const buyNote = (note) => String(note || '').replace(/\+(\d+)\s*очк\.\s*торговли/, 'нужно $1 очк. торговли');

/** Блок в карточке: продать (доска / NPC) и купить (доска / NPC) */
export function TradeBlock({ item, rec }) {
  const h = React.createElement;
  const board = Number(item.price) > 0 ? Number(item.price) : 0;
  const sell = npcSell(rec), buy = npcBuy(rec);
  if (!sell && !buy) return null;

  const row = (label, value, note, win, req) => h('div', { className: 'trade-row' + (win ? ' is-win' : '') },
    h('span', { className: 'trade-lbl' }, label),
    h('span', { className: 'trade-val' }, value ? boardPrice(value) : '—'),
    h('span', { className: 'trade-note', title: note || '' }, win ? h('span', { className: 'trade-tag' }, 'выгоднее') : note || ''),
    req ? h('span', { className: 'trade-req' + (req.need ? ' is-need' : '') },
      h(Icon, { name: req.need ? 'tagoff' : 'plus', size: 11, cls: 'head-ico' }), req.text) : null);

  // вторая строка NPC: очки торговли; имя NPC — если его место в строке заняла метка «выгоднее»
  const req = (o, buying, win) => {
    const parts = [ptsText(o, buying), win ? who(o) : ''].filter(Boolean);
    return parts.length ? { need: buying && !!o.points, text: parts.join(' — ') } : null;
  };

  return h('div', { className: 'trade' },
    h('div', { className: 'src-head' }, h(Icon, { name: 'scales', size: 13, cls: 'head-ico' }), 'Где выгоднее'),
    sell ? h('div', { className: 'trade-grp' },
      h('div', { className: 'trade-cap' }, h(Icon, { name: 'sell', size: 12, cls: 'head-ico' }), 'Продать'),
      row('На доске', board, board ? 'по минимальной цене' : 'нет объявлений', board > sell.price),
      row('NPC', sell.price, who(sell), sell.price >= board, req(sell, false, sell.price >= board))) : null,
    buy ? h('div', { className: 'trade-grp' },
      h('div', { className: 'trade-cap' }, h(Icon, { name: 'cart', size: 12, cls: 'head-ico' }), 'Купить'),
      row('На доске', board, board ? '' : 'нет объявлений', board > 0 && board < buy.price),
      row('NPC', buy.price, who(buy), !board || buy.price <= board, req(buy, true, !board || buy.price <= board)),
      h('div', { className: 'trade-foot' }, 'У некоторых торговцев товар открывается только после их заданий — на SO-Wiki это не указано.')) : null
  );
}
