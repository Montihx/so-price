/* global React, ReactDOM */
import {
  norm, isAscii, latinToCyrillic,
  escapeRegExp, resolveIconPath, useDebounced
} from './utils.js';
import { SourcesBlock, Icon, loadSources } from './sources.js';
import { loadHistory, pointsOf, PriceHistory } from './history.js';
import { bestSale } from './trade.js';
import { BoardRow, GridCell, SortHead, Pager, PAGE_SIZE, GRID_PAGE_SIZE, boardPrice, Window, Tabs, ItemHead, CalcRow } from './board.js';

(function () {
  const { useEffect, useMemo, useState, useCallback } = React;
  const DATA_URL = './data/data.json'; // URL для загрузки данных каталога

  /* Компонент подсветки совпадений в результатах поиска */
  function Highlight({ text, query }) {
    const src = String(text ?? '');
    if (!query) return React.createElement('span', null, src);
    
    // Нормализация запроса и транслитерация для расширенного поиска
    const qNorm = norm(query);
    const qCyr = isAscii(query) ? latinToCyrillic(query) : qNorm;
    
    // Разделение текста на части для подсветки совпадений
    const parts = src.split(new RegExp('(' + [qNorm, qCyr].filter(Boolean).map(escapeRegExp).join('|') + ')', 'gi'));
    
    return React.createElement(React.Fragment, null,
      parts.map((part, i) => i % 2
        ? React.createElement('mark', { key: i }, part) // Подсвеченная часть
        : React.createElement('span', { key: i }, part) // Обычный текст
      )
    );
  }

  /* Главный компонент приложения */
  function App() {
    // Состояния приложения
    const [data, setData] = useState([]); // Основные данные каталога
    const [query, setQuery] = useState(''); // Строка поиска
    const [selected, setSelected] = useState(null); // Выбранный товар
    const [cart, setCart] = useState(() => {
      // Восстановление корзины из localStorage
      try { return JSON.parse(localStorage.getItem('cart') || '{}'); }
      catch { return {}; }
    });
    const [loading, setLoading] = useState(false); // Статус загрузки
    const [error, setError] = useState(''); // Сообщения об ошибках
    const [sort, setSort] = useState({ key: 'name', dir: 1 }); // сортировка по заголовкам, как на доске
    const [page, setPage] = useState(0);                       // текущая страница
    const [avail, setAvail] = useState('all');                 // вкладка: все / есть на доске / нет объявлений
    const [view, setView] = useState(() => { try { return localStorage.getItem('view') === 'grid' ? 'grid' : 'list'; } catch { return 'list'; } });
    useEffect(() => { try { localStorage.setItem('view', view); } catch {} }, [view]);
    
    const qDeb = useDebounced(query, 200);
    const [hist, setHist] = useState(null);                    // история цен (data/history.json)
    useEffect(() => { loadHistory().then(setHist); }, []);
    const [srcs, setSrcs] = useState(null);                    // сведения для «доска или NPC» в калькуляторе // Дебаунс поискового запроса

    /* Загрузка данных каталога с сервера */
    const loadData = useCallback(async () => {
      try {
        setLoading(true);
        const resp = await fetch(DATA_URL, { cache: 'no-store' }); // Без кэширования
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();
        if (!Array.isArray(json)) throw new Error('Некорректный формат JSON');

        // Удаление дубликатов и обработка путей к иконкам
        const seen = new Set(); 
        const unique = [];
        for (let i = 0; i < json.length; i++) {
          const x = json[i]; 
          const id = x.item_id || x.item_name || i;
          if (!seen.has(id)) {
            seen.add(id);
            unique.push({ 
              ...x, 
              _i: i, // Внутренний индекс как fallback ID
              icon_local_path: resolveIconPath(x.icon_local_path) // Нормализация пути к иконке
            });
          }
        }
        setData(unique); 
        setError('');
      } catch (err) {
        setError('Ошибка загрузки данных: ' + (err?.message || String(err)));
      } finally {
        setLoading(false);
      }
    }, []);
    
    // Загрузка данных при монтировании компонента
    useEffect(() => { loadData(); }, [loadData]);

    /* Фильтрация данных по поисковому запросу */
    const filtered = useMemo(() => {
      const q = norm(qDeb); 
      if (!q) return data; // Если запрос пустой - возвращаем все данные
      
      // Поиск по нормализованному названию и кириллической транслитерации
      return data.filter(x => 
        norm(x.item_name).includes(q) || 
        norm(latinToCyrillic(x.item_name)).includes(q)
      );
    }, [data, qDeb]);

    /* Сортировка: «Наименование» / «Стоимость» (0 = нет объявлений — всегда в конце) */
    const counts = useMemo(() => {
      let listed = 0; for (const x of filtered) if (Number(x.price) > 0) listed++;
      return { all: filtered.length, listed, none: filtered.length - listed };
    }, [filtered]);

    const sorted = useMemo(() => {
      const arr = avail === 'all' ? filtered.slice()
        : filtered.filter(x => (Number(x.price) > 0) === (avail === 'listed'));
      const coll = new Intl.Collator('ru');
      if (sort.key === 'price') {
        arr.sort((a, b) => {
          const pa = Number(a.price) || 0, pb = Number(b.price) || 0;
          if (!pa !== !pb) return pa ? -1 : 1;
          return (pa - pb) * sort.dir || coll.compare(a.item_name, b.item_name);
        });
      } else {
        arr.sort((a, b) => coll.compare(String(a.item_name).replace(/^["«]/, ''), String(b.item_name).replace(/^["«]/, '')) * sort.dir);
      }
      return arr;
    }, [filtered, sort, avail]);
    // сетка: на странице целое число рядов (столбцов столько, сколько влезает по ширине окна)
    const [cols, setCols] = useState(10);
    useEffect(() => {
      const el = document.querySelector('.list-win .win-body');
      if (!el || typeof ResizeObserver === 'undefined') return;
      const min = () => (window.matchMedia('(max-width: 480px)').matches ? 56 : 64); // как minmax() в .cells
      const upd = () => {
        const cs = getComputedStyle(el);
        const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2;
        setCols(Math.max(1, Math.floor(w / min())));
      };
      const ro = new ResizeObserver(upd); ro.observe(el); upd();
      return () => ro.disconnect();
    }, [loading]);
    const per = view === 'grid' ? cols * Math.max(3, Math.ceil(GRID_PAGE_SIZE / cols)) : PAGE_SIZE;
    // ширина изменилась -> остаёмся на тех же предметах, а не на том же номере страницы
    const prevPer = React.useRef(per);
    useEffect(() => {
      if (prevPer.current !== per) { setPage(p => Math.floor(p * prevPer.current / per)); prevPer.current = per; }
    }, [per]);
    const pages = Math.max(1, Math.ceil(sorted.length / per));
    useEffect(() => { setPage(0); }, [qDeb, sort, avail, view]);
    const curPage = Math.min(page, pages - 1);
    const visible = sorted.slice(curPage * per, curPage * per + per);
    // Товары в корзине: цена берётся из актуальных данных (в localStorage мог остаться старый снимок)
    const byId = useMemo(() => { const m = {}; for (const x of data) m[x.item_id || x._i] = x; return m; }, [data]);
    const cartItems = Object.values(cart).map(it => {
      const cur = byId[it.item_id || it._i];
      return cur ? { ...it, price: cur.price, price_updated: cur.price_updated, icon_local_path: cur.icon_local_path, stale: false } : { ...it, stale: data.length > 0 };
    });
    const total = cartItems.reduce((s, i) => s + (i.stale ? 0 : (Number(i.price)||0) * (Number(i.qty)||0)), 0); // Общая сумма
    // «доска или NPC»: сведения грузим, только когда в калькуляторе что-то есть
    useEffect(() => { if (cartItems.length && !srcs) loadSources().then(setSrcs).catch(() => {}); }, [cartItems.length, srcs]);
    const sale = useMemo(() => {
      if (!srcs) return null;
      let best = 0, npcCount = 0, any = false;
      for (const i of cartItems) {
        if (i.stale) continue;
        const b = bestSale(i.price, srcs.items && srcs.items[i.item_id]);
        if (b.npc) any = true;
        if (b.where === 'npc') npcCount++;
        best += b.best * (Number(i.qty) || 0);
      }
      return any ? { best, npcCount } : null;
    }, [srcs, cartItems]);

    /* Добавление товара в корзину */
    const addToCart = useCallback((item, qty = 1) => {
      setCart(c => {
        const id = item.item_id || item._i;
        const n = { ...c };
        n[id] = n[id] 
          ? { ...n[id], qty: (n[id].qty || 0) + qty } // Увеличиваем количество
          : { ...item, qty }; // Добавляем новый товар
        return n;
      });
      
      // Анимация "вспышки" корзины при добавлении
      try {
        const el = document.querySelector('.calc');
        if (el) { 
          el.classList.remove('flash'); 
          void el.offsetWidth; // Принудительный reflow
          el.classList.add('flash'); 
          setTimeout(()=>el.classList.remove('flash'), 350); 
        }
      } catch {}
    }, []);

    const clearCart = useCallback(() => setCart({}), []); // Очистка корзины
    
    // Сохранение корзины в localStorage при изменении
    useEffect(() => { 
      try { 
        localStorage.setItem('cart', JSON.stringify(cart)); 
      } catch {} 
    }, [cart]);

    /* Шапка как в меню игры: «STAY OUT / ЦЕНЫ ДОСКИ», справа поиск */
    const h = React.createElement;
    const header = h('header', { className: 'top' },
      h('h1', { className: 'crumb' },
        h('span', { className: 'crumb-root' }, 'Stay Out'),
        h('span', { className: 'crumb-cur' }, ' / Цены доски')),
      h('div', { className: 'top-tools' },
        h('label', { className: 'search' },
          h(Icon, { name: 'search', size: 16, cls: 'search-ico' }),
          h('input', { className: 'field search-input', type: 'search', placeholder: 'Название предмета', value: query,
            onChange: (e) => setQuery(e.target.value), 'aria-label': 'Поиск по названию' })),
        h('button', { className: 'btn btn-icon', onClick: loadData, disabled: loading,
          title: 'Обновить данные', 'aria-label': 'Обновить данные' },
          h(Icon, { name: 'refresh', size: 16, cls: 'ico' + (loading ? ' spin' : '') })))
    );

    const isSel = (r) => !!selected && (r.item_id || r._i) === (selected.item_id || selected._i);
    const onSelect = (r) => () => {
      setSelected(r);
      // на узком экране карточка ниже списка — прокручиваем к ней
      if (window.innerWidth < 900) setTimeout(() => {
        const el = document.querySelector('.selection-card');
        if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      }, 60);
    };

    /* Окно «Предметы»: вкладки наличия, сортировка, вид, строки или ячейки, страницы */
    const viewBtn = (v, icon, label) => h('button', {
      className: 'tool' + (view === v ? ' is-active' : ''), onClick: () => setView(v),
      title: label, 'aria-label': label, 'aria-pressed': view === v ? 'true' : 'false'
    }, h(Icon, { name: icon, size: 15, cls: 'ico' }));

    const body = loading
      ? h('div', { className: 'empty' }, 'Загрузка…')
      : visible.length === 0
        ? h('div', { className: 'empty' }, qDeb ? 'По запросу «' + qDeb + '» ничего не найдено' : 'В этой вкладке пока пусто')
        : view === 'grid'
          ? h('div', { className: 'cells', style: { gridTemplateColumns: 'repeat(' + cols + ', minmax(0, 1fr))' } },
              visible.map(r => h(GridCell, {
                key: r.item_id || r._i, r, selected: isSel(r), onSelect: onSelect(r), onAdd: () => addToCart(r, 1) })),
              // неполный последний ряд добиваем пустыми ячейками, как пустые слоты инвентаря
              Array.from({ length: (cols - visible.length % cols) % cols }, (_, i) =>
                h('div', { key: 'e' + i, className: 'cell is-void', 'aria-hidden': 'true' }, h('div', { className: 'slot' }))))
          : h('div', { className: 'rows' }, visible.map(r => h(BoardRow, {
              key: r.item_id || r._i, r, query: qDeb, Highlight, selected: isSel(r),
              onSelect: onSelect(r), onAdd: () => addToCart(r, 1) })));

    const table = h(Window, {
      title: 'Предметы', icon: 'cube', className: 'list-win grid-left',
      tools: [viewBtn('list', 'rows', 'Списком'), viewBtn('grid', 'cells', 'Сеткой, как инвентарь')],
      tabs: h(Tabs, { label: 'Наличие на доске', value: avail, onChange: setAvail, items: [
        ['all', 'Все', counts.all], ['listed', 'Есть на доске', counts.listed], ['none', 'Нет объявлений', counts.none]] }),
      foot: [
        h('span', { key: 'n', className: 'foot-stat' }, h(Icon, { name: 'cube', size: 13, cls: 'ico' }), ' ' + sorted.length + ' предм.'),
        h(Pager, { key: 'p', page: curPage, pages, setPage })]
    },
      h('div', { className: 'sortbar' },
        h('span', { className: 'sortbar-lbl' }, 'Сортировка:'),
        h(SortHead, { label: 'Название', k: 'name', sort, setSort }),
        h(SortHead, { label: 'Цена', k: 'price', sort, setSort })),
      body
    );

    /* Правая панель: окно предмета и калькулятор */
    const idOf = (x) => x.item_id || x._i;
    const selectionCard = h(Window, { title: selected ? 'Предмет' : 'Предмет не выбран', className: 'selection-card' },
      selected
        ? h(React.Fragment, null,
            h(ItemHead, { item: selected, points: pointsOf(hist, selected) }),
            h(PriceHistory, { points: pointsOf(hist, selected), key: 'h' + idOf(selected) }),
            h(SourcesBlock, { item: selected, key: idOf(selected) }))
        : h('div', { className: 'win-empty' }, 'Выберите предмет в списке: здесь появятся цена и где его взять.')
    );

    const calc = h(Window, {
      title: 'Калькулятор', className: 'calc',
      tools: cartItems.length ? h('span', { className: 'win-count' }, String(cartItems.length)) : null,
      foot: cartItems.length > 0 ? [
        h('div', { key: 't', className: 'money', title: 'Сумма по минимальным ценам' },
          h(Icon, { name: 'wallet', size: 15, cls: 'ico' }), ' ' + boardPrice(total)),
        h('button', { key: 'c', className: 'btn', onClick: clearCart }, 'Очистить')] : null
    },
      cartItems.length === 0
        ? h('div', { className: 'win-empty' }, 'Нажмите «+» в строке предмета, чтобы посчитать сумму.')
        : h('div', { className: 'calc-list' }, cartItems.map(it => h(CalcRow, {
            key: idOf(it), it,
            onQty: (q) => setCart(c => ({ ...c, [idOf(it)]: { ...it, qty: q } })),
            onRemove: () => setCart(c => { const n = { ...c }; delete n[idOf(it)]; return n; })
          }))),
      sale && cartItems.length > 0 ? h('div', { className: 'calc-best' },
        h('div', { className: 'calc-best-row' }, h('span', null, 'Всё на доске'), h('span', null, boardPrice(total))),
        h('div', { className: 'calc-best-row is-win' },
          h('span', null, 'Лучшим способом',
            h('span', { className: 'muted' }, sale.npcCount ? ' (NPC: ' + sale.npcCount + ' предм.)' : ' (всё на доске)')),
          h('span', null, boardPrice(sale.best)))) : null
    );

    const panel = h('aside', { className: 'side-panel grid-right' }, selectionCard, calc);

    return h('div', { className: 'app' },
      header,
      error && h('div', { className: 'alert show' }, error),
      h('main', { className: 'grid-main' }, table, panel)
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
})();
