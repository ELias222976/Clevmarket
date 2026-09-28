/* Clevmarket — main.js | Store, tracking, render, filtros, toasts (compartido con admin.js) */
'use strict';
const DB_KEY = 'clevmarket_db_v3';
const URL_RE = /^https?:\/\/[^\s/$.?#][^\s]*$/i;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uuid = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : r & 3 | 8).toString(16); });
const fmt = n => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

/* Motor de almacenamiento con esquema validado */
const Store = {
  norm(p) { // Devuelve un producto válido y saneado, o null
    if (!p || typeof p !== 'object') return null;
    const s = k => typeof p[k] === 'string' ? p[k].trim() : '';
    const n = p.precio_oferta === '' || p.precio_oferta == null ? null : Number(p.precio_oferta);
    const o = {
      id: s('id') || uuid(), titulo: s('titulo'), descripcion_corta: s('descripcion_corta'),
      descripcion_detallada: s('descripcion_detallada'), categoria: s('categoria'),
      precio_oferta: Number.isFinite(n) && n >= 0 ? n : null,
      url_imagen: s('url_imagen'), url_afiliado: s('url_afiliado'),
      clicks: Math.max(0, parseInt(p.clicks, 10) || 0), fecha_creacion: Number(p.fecha_creacion) || Date.now(),
      esTendencia: !!p.esTendencia, esNovedad: !!p.esNovedad, esPatrocinado: !!p.esPatrocinado
    };
    return o.titulo && o.categoria && URL_RE.test(o.url_afiliado) && URL_RE.test(o.url_imagen) ? o : null;
  },
  all() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw === null) return Store.seed();
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a.map(Store.norm).filter(Boolean) : [];
    } catch { return []; }
  },
  save(list) { localStorage.setItem(DB_KEY, JSON.stringify(list)); },
  seed() { // Datos de ejemplo en la primera visita
    const P = 'https://images.unsplash.com/', Q = '?w=600&q=70&auto=format&fit=crop';
    const l = [
      ['Auriculares Studio Pro', 'Cancelación de ruido y 40 h de batería.', 'Auriculares inalámbricos Bluetooth 5.3 con estuche de viaje.', 'Tecnología', 79.99, 'photo-1505740420928-5e560c06d30e', 1, 0, 1],
      ['Reloj clásico minimal', 'Acero inoxidable, resistente al agua.', 'Reloj analógico de cuarzo con correa de cuero.', 'Accesorios', 49.9, 'photo-1523275335684-37898b6baf30', 1, 1, 0],
      ['Zapatillas urbanas', 'Ligeras y cómodas para todo el día.', 'Suela de goma antideslizante y plantilla acolchada.', 'Moda', 64.5, 'photo-1542291026-7eec264c27ff', 0, 1, 0],
      ['Gafas de sol polarizadas', 'Protección UV400 con montura ligera.', 'Lentes polarizadas con estuche rígido.', 'Accesorios', 29.99, 'photo-1572635196237-14b3f281503f', 0, 1, 0],
      ['Cámara compacta 4K', 'Video 4K y estabilización.', 'Cámara para viajes con pantalla abatible y Wi-Fi.', 'Tecnología', 349, 'photo-1526170375885-4d8ecf77b99f', 1, 0, 0]
    ].map((d, i) => Store.norm({
      titulo: d[0], descripcion_corta: d[1], descripcion_detallada: d[2], categoria: d[3], precio_oferta: d[4],
      url_imagen: P + d[5] + Q, url_afiliado: 'https://example.com/oferta-' + (i + 1), clicks: 0,
      fecha_creacion: Date.now() - i * 864e5, esTendencia: !!d[6], esNovedad: !!d[7], esPatrocinado: !!d[8]
    }));
    Store.save(l); return l;
  }
};

/* Tracking silencioso: suma el clic y abre el enlace de afiliado */
function registrarClic(id, url) {
  const l = Store.all(), p = l.find(x => x.id === id);
  if (p) { p.clicks++; Store.save(l); }
  window.open(url, '_blank', 'noopener');
}

/* Toasts */
function toast(msg, type = 'ok') {
  let w = $('.toasts');
  if (!w) { w = document.createElement('div'); w.className = 'toasts'; w.setAttribute('role', 'status'); w.setAttribute('aria-live', 'polite'); document.body.append(w); }
  const t = document.createElement('div'); t.className = 'toast toast--' + type; t.textContent = msg; w.append(t);
  setTimeout(() => t.remove(), 3200);
}

/* Renderizado (las métricas nunca se pintan en el frontend público) */
const cardHTML = p => `<article class="card">
<div class="card__media"><img class="card__img" src="${esc(p.url_imagen)}" alt="${esc(p.titulo)}" loading="lazy"><span class="card__badge">${esc(p.categoria)}</span>${p.esPatrocinado ? '<span class="card__sponsor">Patrocinado</span>' : ''}</div>
<div class="card__body"><h3 class="card__title">${esc(p.titulo)}</h3><p class="card__text">${esc(p.descripcion_corta)}</p>
<div class="card__foot">${p.precio_oferta != null ? `<span class="card__price">${fmt(p.precio_oferta)}</span>` : ''}<button class="card__cta" type="button" data-id="${esc(p.id)}">Ver oferta</button></div></div></article>`;

function renderGrid(sel, list, emptyMsg) {
  const el = $(sel); if (!el) return;
  el.innerHTML = list.length ? list.map(cardHTML).join('') : `<div class="empty"><h3>Sin resultados</h3><p>${esc(emptyMsg)}</p></div>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('.card__cta'); if (!b) return;
  const p = Store.all().find(x => x.id === b.dataset.id);
  if (p) registrarClic(p.id, p.url_afiliado);
});

function initHome() { // Solo banderas editoriales, sin algoritmos
  const l = Store.all();
  renderGrid('#grid-tendencias', l.filter(p => p.esTendencia), 'Pronto habrá nuevas tendencias.');
  renderGrid('#grid-novedades', l.filter(p => p.esNovedad).sort((a, b) => b.fecha_creacion - a.fecha_creacion), 'Vuelve pronto para ver novedades.');
}

function initCatalogo() { // Búsqueda + categoría = intersección
  const list = Store.all(), st = { q: '', cat: 'Todas' };
  const cats = ['Todas', ...new Set(list.map(p => p.categoria))];
  $('#pills').innerHTML = cats.map(c => `<button type="button" class="pill${c === 'Todas' ? ' pill--on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  const apply = () => {
    const q = st.q.toLowerCase();
    renderGrid('#grid-catalogo', list.filter(p => (st.cat === 'Todas' || p.categoria === st.cat) &&
      (!q || [p.titulo, p.descripcion_corta, p.descripcion_detallada, p.categoria].join(' ').toLowerCase().includes(q))),
      'Prueba con otra búsqueda o cambia de categoría.');
  };
  $('#buscador').addEventListener('input', debounce(e => { st.q = e.target.value.trim(); apply(); }, 300));
  $('#pills').addEventListener('click', e => {
    const b = e.target.closest('.pill'); if (!b) return;
    st.cat = b.dataset.cat;
    document.querySelectorAll('.pill').forEach(x => x.classList.toggle('pill--on', x === b));
    apply();
  });
  apply();
}

function initContacto() {
  $('#form-contacto').addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    if (!f.checkValidity()) return f.reportValidity();
    try {
      const r = await fetch(f.action, { method: 'POST', body: new FormData(f), headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error();
      f.reset(); toast('Mensaje enviado');
    } catch { toast('No se pudo enviar el mensaje. Inténtalo de nuevo.', 'err'); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if ($('#grid-tendencias')) initHome();
  if ($('#grid-catalogo')) initCatalogo();
  if ($('#form-contacto')) initContacto();
});
