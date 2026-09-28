/* Clevmarket — admin.js | Login, KPIs, CRUD, exportar/importar (requiere main.js) */
'use strict';
const PASS = 'adminPro2026', AUTH = 'clev_auth';
const F = id => document.getElementById(id);
const TEXT = ['titulo', 'categoria', 'descripcion_corta', 'descripcion_detallada', 'precio_oferta', 'url_imagen', 'url_afiliado'];
const FLAGS = ['esPatrocinado', 'esTendencia', 'esNovedad'];
const REQ = ['titulo', 'categoria', 'descripcion_corta', 'descripcion_detallada', 'url_imagen', 'url_afiliado'];

function gate() {
  const ok = sessionStorage.getItem(AUTH) === '1';
  F('login').hidden = ok; F('panel').hidden = !ok;
  if (ok) refresh();
}

function refresh() { // KPIs + tabla
  const l = Store.all();
  F('kpi-total').textContent = l.length;
  F('kpi-clicks').textContent = l.reduce((s, p) => s + p.clicks, 0);
  const star = l.reduce((m, p) => !m || p.clicks > m.clicks ? p : m, null);
  F('kpi-star').textContent = star && star.clicks > 0 ? star.titulo : '—';
  F('tbody').innerHTML = l.length ? l.map(p => `<tr><td>${esc(p.titulo)}</td><td>${esc(p.categoria)}</td>
<td>${p.precio_oferta != null ? fmt(p.precio_oferta) : '—'}</td>
<td>${[p.esTendencia && 'Tendencia', p.esNovedad && 'Novedad', p.esPatrocinado && 'Patrocinado'].filter(Boolean).join(', ') || '—'}</td>
<td><strong>${p.clicks}</strong></td>
<td class="actions"><button class="btn btn--ghost btn--sm" data-edit="${esc(p.id)}">Editar</button><button class="btn btn--danger btn--sm" data-del="${esc(p.id)}">Eliminar</button></td></tr>`).join('')
    : '<tr><td colspan="6">Aún no hay productos.</td></tr>';
}

function resetForm() {
  F('form-prod').reset(); F('prod-id').value = ''; F('form-title').textContent = 'Nuevo producto';
}

F('form-login').addEventListener('submit', e => {
  e.preventDefault();
  if (F('pass').value === PASS) { sessionStorage.setItem(AUTH, '1'); gate(); }
  else toast('Contraseña incorrecta', 'err');
});
F('btn-logout').addEventListener('click', () => { sessionStorage.removeItem(AUTH); location.reload(); });
F('btn-cancel').addEventListener('click', resetForm);

F('form-prod').addEventListener('submit', e => {
  e.preventDefault();
  const v = {}; TEXT.forEach(k => v[k] = F(k).value.trim()); FLAGS.forEach(k => v[k] = F(k).checked);
  const miss = REQ.find(k => !v[k]);
  if (miss) { F(miss).focus(); return toast('Completa todos los campos obligatorios', 'err'); }
  const bad = ['url_imagen', 'url_afiliado'].find(k => !URL_RE.test(v[k]));
  if (bad) { F(bad).focus(); return toast('La URL debe empezar por http:// o https://', 'err'); }
  if (v.precio_oferta !== '' && !(Number(v.precio_oferta) >= 0)) return toast('El precio no es válido', 'err');
  const l = Store.all(), id = F('prod-id').value, i = l.findIndex(p => p.id === id), prev = i >= 0 ? l[i] : {};
  const p = Store.norm({ ...prev, ...v, id: id || uuid(), clicks: prev.clicks || 0, fecha_creacion: prev.fecha_creacion || Date.now() });
  if (!p) return toast('No se pudo guardar el producto', 'err');
  if (i >= 0) l[i] = p; else l.push(p);
  Store.save(l); resetForm(); refresh(); toast('Producto guardado');
});

F('tbody').addEventListener('click', e => {
  const ed = e.target.dataset.edit, dl = e.target.dataset.del;
  if (ed) {
    const p = Store.all().find(x => x.id === ed); if (!p) return;
    F('prod-id').value = p.id; TEXT.forEach(k => F(k).value = p[k] ?? ''); FLAGS.forEach(k => F(k).checked = p[k]);
    F('form-title').textContent = 'Editar producto'; F('form-prod').scrollIntoView({ behavior: 'smooth' });
  }
  if (dl && confirm('¿Eliminar este producto? No se puede deshacer.')) {
    Store.save(Store.all().filter(p => p.id !== dl)); refresh(); toast('Producto eliminado');
  }
});

F('btn-export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(Store.all(), null, 2)], { type: 'application/json' }));
  a.download = `clevmarket_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Copia exportada');
});

F('file-import').addEventListener('change', async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const a = JSON.parse(await f.text()); if (!Array.isArray(a)) throw new Error();
    const l = a.map(Store.norm).filter(Boolean); if (!l.length) throw new Error();
    if (!confirm(`Se restaurarán ${l.length} productos y se reemplazará el catálogo actual. ¿Continuar?`)) return;
    Store.save(l); refresh(); toast('Base de datos restaurada');
  } catch { toast('El archivo JSON no es válido', 'err'); }
  e.target.value = '';
});

gate();
