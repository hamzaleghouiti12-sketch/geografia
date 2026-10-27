// Núcleo de la app: utilidades, progreso, navegación, inicio, conceptos y comentario.
// Los mapas (político, físico, coordenadas y escalas) están en mapa.js.

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true && !k.startsWith('aria-') ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const azar = arr => arr[Math.floor(Math.random() * arr.length)];
const barajar = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const coma = n => String(Math.round(n * 100) / 100).replace('.', ',');

// Texto sin tildes ni mayúsculas ni signos, para comparar respuestas escritas
function norm(t) {
  return ' ' + String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
}
// Cada clave son alternativas «a|b|c»; una alternativa de varias palabras casa si cada palabra
// del texto empieza por la de la clave, en orden («pino canario» casa con «pinos canarios»)
const palabras = t => (String(t).match(/[\p{L}\d]+/gu) || []).map(w => ({ o: w, n: norm(w).trim() }));
function casaEn(ws, alt) {
  const q = norm(alt).trim().split(' ');
  for (let i = 0; i + q.length <= ws.length; i++)
    if (q.every((w, j) => ws[i + j].n.startsWith(w))) return ws.slice(i, i + q.length).map(x => x.o).join(' ');
  return null;
}
function comprobar(texto, claves) {
  const ws = palabras(texto), si = [], no = [];
  for (const c of claves) (c.split('|').some(alt => casaEn(ws, alt)) ? si : no).push(c);
  return { si, no, r: claves.length ? si.length / claves.length : 0 };
}
// La etiqueta visible es la palabra tal como aparece en la respuesta modelo (con tildes y entera)
function etiquetaClave(c, fuente = '') {
  const ws = palabras(fuente);
  for (const alt of c.split('|')) { const r = casaEn(ws, alt); if (r) return r; }
  return c.split('|')[0];
}
// Distancia de edición pequeña: acepta erratas de una letra en nombres de más de 5 letras
function parecido(a, b) {
  a = norm(a).trim(); b = norm(b).trim();
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || b.length < 6) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= 1;
}
const acierta = (resp, nombres) => nombres.some(n => parecido(resp, n));

// ---------- Progreso (solo en este navegador) ----------
const CLAVE_GUARDADO = 'geografia-v1';
let P = { conceptos: {}, politico: {}, fisico: {}, coord: { ok: 0, n: 0 }, escala: { ok: 0, n: 0 }, coment: { a: 0, b: 0 }, borrador: { a: '', b: '' } };
try { Object.assign(P, JSON.parse(localStorage.getItem(CLAVE_GUARDADO)) || {}); } catch (e) {}
function guardar() { try { localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(P)); } catch (e) {} }
// Racha por elemento: sube al acertar, baja al fallar (0..3). Se usa para elegir qué preguntar.
function anotar(cubo, id, bien) {
  const v = P[cubo][id] ?? 0;
  P[cubo][id] = Math.max(0, Math.min(3, v + (bien ? 1 : -1)));
  guardar();
}
// Elige primero lo que menos se domina
function elegir(cubo, ids, evitar) {
  const peso = id => (P[cubo][id] ?? 0) * 2 + Math.random() * 2.5;
  return ids.filter(id => id !== evitar).sort((a, b) => peso(a) - peso(b))[0];
}
const dominio = (cubo, ids) => ids.reduce((s, id) => s + Math.min(P[cubo][id] ?? 0, 2), 0) / (ids.length * 2);

// ---------- Efectos ----------
function chispas(x, y, n = 14) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colores = ['#8f7ff2', '#5ea8e4', '#4cb796', '#ef9a78', '#e9c46a'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = 40 + Math.random() * 70;
    const s = h('i', { class: 'chispa' });
    s.style.cssText = `left:${x}px;top:${y}px;background:${azar(colores)};--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r - 30}px;--g:${Math.random() * 360}deg`;
    document.body.append(s); setTimeout(() => s.remove(), 1000);
  }
}
function chispasEn(el) { const r = el.getBoundingClientRect(); chispas(r.left + r.width / 2, r.top + r.height / 2); }
function temblar(el) { el.classList.remove('temblor'); void el.offsetWidth; el.classList.add('temblor'); }
let tToast;
function aviso(txt) {
  const t = $('#toast'); t.textContent = txt; t.classList.add('ver');
  clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('ver'), 2200);
}
// La luz del vidrio sigue al dedo o al ratón
document.addEventListener('pointermove', e => {
  const g = e.target.closest && e.target.closest('.glass'); if (!g) return;
  const r = g.getBoundingClientRect();
  g.style.setProperty('--lx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
  g.style.setProperty('--ly', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
}, { passive: true });

// Pastilla que se estira hasta el destino y luego se recoge (efecto líquido)
function moverPastilla(cont, btn, primera) {
  const pill = $('.pill', cont); if (!pill || !btn) return;
  const cr = cont.getBoundingClientRect(), br = btn.getBoundingClientRect();
  const left = br.left - cr.left, width = br.width;
  if (primera || !pill.style.width) { pill.style.transition = 'none'; pill.style.left = left + 'px'; pill.style.width = width + 'px'; void pill.offsetWidth; pill.style.transition = ''; return; }
  const viejoL = parseFloat(pill.style.left), viejoW = parseFloat(pill.style.width);
  const l = Math.min(viejoL, left), r = Math.max(viejoL + viejoW, left + width);
  pill.classList.add('estira'); pill.style.left = l + 'px'; pill.style.width = (r - l) + 'px';
  setTimeout(() => { pill.classList.remove('estira'); pill.style.left = left + 'px'; pill.style.width = width + 'px'; }, 170);
}
function segmentado(cont, alCambiar) {
  const botones = $$('button', cont);
  botones.forEach(b => b.addEventListener('click', () => {
    if (b.getAttribute('aria-selected') === 'true') return;
    botones.forEach(x => x.setAttribute('aria-selected', x === b));
    moverPastilla(cont, b); alCambiar(b.dataset.m);
  }));
  requestAnimationFrame(() => moverPastilla(cont, botones.find(b => b.getAttribute('aria-selected') === 'true'), true));
  addEventListener('resize', () => moverPastilla(cont, botones.find(b => b.getAttribute('aria-selected') === 'true'), true));
}
// Las pastillas de una vista oculta miden 0: se recolocan al mostrarla
function recolocarSegmentos() {
  $$('.vista.on .seg').forEach(s => moverPastilla(s, $('button[aria-selected="true"]', s), true));
}
function chipsUnaOpcion(cont, opciones, actual, alCambiar) {
  cont.replaceChildren(...opciones.map(([id, txt]) => h('button', { class: 'chip', 'aria-pressed': id === actual, onclick: e => {
    $$('.chip', cont).forEach(c => c.setAttribute('aria-pressed', c === e.currentTarget)); alCambiar(id);
  } }, txt)));
}

// ---------- Navegación ----------
const vistas = { inicio: pintarInicio, conceptos: () => {}, mapas: () => window.abrirMapas && window.abrirMapas(), comentario: () => {} };
function ir(v) {
  $$('.vista').forEach(s => s.classList.toggle('on', s.id === 'v-' + v));
  const tabs = $$('#tabbar .tab');
  tabs.forEach(t => t.setAttribute('aria-selected', t.dataset.v === v));
  moverPastilla($('#tabbar'), tabs.find(t => t.dataset.v === v));
  $('#tabbar').style.setProperty('--c', getComputedStyle(tabs.find(t => t.dataset.v === v)).getPropertyValue('--c'));
  vistas[v] && vistas[v]();
  recolocarSegmentos();
  if (scrollY > 0) scrollTo(0, 0);
  try { sessionStorage.setItem('geo-vista', v); } catch (e) {}
}
$$('#tabbar .tab').forEach(t => t.addEventListener('click', () => ir(t.dataset.v)));

// ---------- Inicio ----------
const ICONOS = {
  politico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  fisico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m2.5 19 6.5-11 4 6 2.5-3.5L21.5 19z"/></svg>',
  conceptos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="6" width="12" height="15" rx="3"/><path d="M8 3h9a3 3 0 0 1 3 3v12"/></svg>',
  comentario: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 20 4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11z"/><path d="M13 20h8"/></svg>',
};
function progresoBloque(id) {
  if (id === 'conceptos') return dominio('conceptos', CONCEPTOS.map(c => c.t));
  if (id === 'politico') return 0.6 * dominio('politico', Object.keys(PROVINCIAS)) + 0.2 * Math.min(1, P.coord.ok / 20) + 0.2 * Math.min(1, P.escala.ok / 10);
  if (id === 'fisico') return dominio('fisico', UNIDADES.map(u => u.id));
  if (id === 'comentario') return 0.2 * P.coment.a + 0.8 * P.coment.b;
  return 0;
}
function pintarInicio() {
  let total = 0;
  $('#bloques').replaceChildren(...EXAMEN.map(b => {
    const p = progresoBloque(b.id); total += p * b.pts;
    const barra = h('div', { class: 'barra' }, h('i'));
    const el = h('button', { class: `glass bloque t-${b.color}`, onclick: () => abrirBloque(b.id) },
      h('span', { class: 'ico', html: ICONOS[b.id] }),
      h('span', { class: 'pts' }, `${coma(p * b.pts)} / 2,5`),
      h('h3', {}, b.n), h('p', {}, b.que), barra);
    requestAnimationFrame(() => requestAnimationFrame(() => { $('i', barra).style.width = Math.round(p * 100) + '%'; }));
    return el;
  }));
  $('#nota-total').textContent = coma(Math.round(total * 10) / 10);
  requestAnimationFrame(() => $('#anillo-total').style.setProperty('--p', total * 10));
}
function abrirBloque(id) {
  if (id === 'conceptos') return ir('conceptos');
  if (id === 'comentario') return ir('comentario');
  window.modoMapa = id; ir('mapas');
}

// ---------- Conceptos ----------
const C = { modo: 'tarjetas', grupo: 'todos', cola: [], i: 0, examen: null };
function conceptosFiltrados() { return CONCEPTOS.filter(c => C.grupo === 'todos' || c.g === C.grupo); }
function pintarGrupos() {
  chipsUnaOpcion($('#grupos-conceptos'), [['todos', 'Todos'], ...Object.entries(GRUPOS_CONCEPTOS)], C.grupo, g => { C.grupo = g; empezarConceptos(); });
}
function empezarConceptos() {
  const lista = conceptosFiltrados();
  C.cola = [...lista].sort((a, b) => ((P.conceptos[a.t] ?? 0) - (P.conceptos[b.t] ?? 0)) || Math.random() - .5);
  C.i = 0;
  if (C.modo === 'tarjetas') tarjeta();
  else if (C.modo === 'escribir') escribirConcepto();
  else { C.examen = { lista: barajar(CONCEPTOS).slice(0, 10), i: 0, nota: 0, fallos: [] }; escribirConcepto(); }
}
function tarjeta(llega) {
  const zona = $('#zona-conceptos');
  if (C.i >= C.cola.length) { C.i = 0; C.cola = barajar(C.cola); aviso('¡Vuelta completa! Empezamos otra'); }
  const c = C.cola[C.i], nivel = P.conceptos[c.t] ?? 0;
  const carta = h('div', { class: 'carta' + (llega ? ' llega' : ''), tabindex: 0, role: 'button', 'aria-label': 'Dar la vuelta' },
    h('div', { class: 'glass cara' },
      h('span', { class: 'grupo' }, GRUPOS_CONCEPTOS[c.g]),
      h('h2', {}, c.t),
      h('p', { class: 'pista' }, '¿Sabes definirlo? Dilo en voz alta y toca para ver la respuesta.')),
    h('div', { class: 'glass cara atras' },
      h('span', { class: 'grupo' }, c.t),
      h('p', { class: 'def' }, c.d),
      h('div', { class: 'claves' }, c.claves.map(k => h('span', { class: 'clave si' }, etiquetaClave(k, c.d))))));
  const girar = () => carta.classList.toggle('vuelta');
  carta.addEventListener('click', girar);
  carta.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); girar(); } });
  const notar = (bien, dx, rot) => e => {
    if (bien === true) chispasEn(e.currentTarget);
    if (bien !== null) anotar('conceptos', c.t, bien);
    else { P.conceptos[c.t] = Math.max(0, Math.min(1, P.conceptos[c.t] ?? 0)); guardar(); }
    carta.style.setProperty('--dx', dx); carta.style.setProperty('--rot', rot); carta.classList.add('sale');
    setTimeout(() => { C.i++; tarjeta(true); }, 380);
  };
  zona.replaceChildren(
    h('div', { class: 'contador' }, h('span', {}, `${C.i + 1} de ${C.cola.length}`), h('span', {}, ['Nuevo', 'Flojo', 'Casi', 'Dominado'][nivel])),
    h('div', { class: 'mazo' }, carta),
    h('div', { class: 'notas3' },
      h('button', { class: 'btn b-mal', onclick: notar(false, '-120%', '-14deg') }, 'No lo sé'),
      h('button', { class: 'btn b-duda', onclick: notar(null, '0%', '0deg') }, 'Dudo'),
      h('button', { class: 'btn b-ok', onclick: notar(true, '120%', '14deg') }, 'Lo sé')));
}
function escribirConcepto() {
  const zona = $('#zona-conceptos'), ex = C.examen && C.modo === 'examen' ? C.examen : null;
  if (ex && ex.i >= ex.lista.length) return finExamenConceptos();
  const c = ex ? ex.lista[ex.i] : C.cola[C.i % C.cola.length];
  const ta = h('textarea', { placeholder: 'Escribe la definición como en el examen…', 'aria-label': 'Definición' });
  const res = h('div', { style: 'display:grid;gap:12px' });
  const btn = h('button', { class: 'btn', onclick: corregir }, 'Corregir');
  function corregir() {
    if (!ta.value.trim()) { temblar(ta); return; }
    const k = comprobar(ta.value, c.claves);
    const pts = k.r >= .75 ? .25 : k.r >= .4 ? .125 : 0;
    anotar('conceptos', c.t, pts === .25);
    if (ex) { ex.nota += pts; if (pts < .25) ex.fallos.push(c.t); }
    if (pts === .25) chispasEn(btn);
    btn.disabled = true; ta.readOnly = true;
    res.replaceChildren(
      h('div', { class: 'veredicto ' + (pts === .25 ? 'ok' : pts ? 'medio' : 'mal') },
        h('b', {}, pts === .25 ? '¡Completa! +0,25' : pts ? 'Incompleta · +0,125' : 'Le faltan las ideas clave · 0'),
        h('span', { class: 'peq' }, `Has puesto ${k.si.length} de ${c.claves.length} ideas clave. En verde las que están; en rojo, las que faltan.`)),
      h('div', { class: 'claves' }, c.claves.map(x => h('span', { class: 'clave ' + (k.si.includes(x) ? 'si' : 'no') }, etiquetaClave(x, c.d)))),
      h('div', { class: 'modelo' }, h('b', {}, 'Definición modelo. '), c.d),
      h('button', { class: 'btn', onclick: () => { if (ex) ex.i++; else C.i++; escribirConcepto(); } }, ex && ex.i === ex.lista.length - 1 ? 'Ver la nota' : 'Siguiente'));
  }
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) corregir(); });
  zona.replaceChildren(h('div', { class: 'glass tarjeta' },
    h('div', { class: 'contador' }, h('span', {}, ex ? `Concepto ${ex.i + 1} de 10` : GRUPOS_CONCEPTOS[c.g]),
      ex ? h('span', { class: 'marcador' }, `${coma(ex.nota)} pts`) : h('span', {}, '')),
    h('h2', {}, c.t), ta, h('div', { class: 'fila' }, btn, h('span', { class: 'mut peq' }, 'Ctrl + Enter también corrige')), res));
  ta.focus({ preventScroll: true });
}
function finExamenConceptos() {
  const ex = C.examen, nota = ex.nota;
  if (nota >= 2) chispas(innerWidth / 2, innerHeight / 3, 30);
  $('#zona-conceptos').replaceChildren(h('div', { class: 'glass tarjeta' },
    h('span', { class: 'cab' }, h('span', { class: 'eti' }, 'Resultado')),
    h('div', { class: 'nota-total' }, h('div', { class: 'anillo', style: `--p:${nota / 2.5 * 100}` }, h('div', {}, h('b', {}, coma(nota)), h('small', {}, 'de 2,5'))),
      h('p', {}, nota >= 2 ? 'Muy bien: esta pregunta está casi asegurada.' : nota >= 1.25 ? 'Vas por buen camino. Repasa en tarjetas los que han fallado.' : 'Vuelve a las tarjetas y repite el examen.')),
    ex.fallos.length ? h('p', { class: 'mut' }, 'Para repasar: ' + ex.fallos.join(', ') + '.') : null,
    h('button', { class: 'btn', onclick: empezarConceptos }, 'Otro examen')));
}
segmentado($('#seg-conceptos'), m => { C.modo = m; $('#grupos-conceptos').style.display = m === 'examen' ? 'none' : ''; empezarConceptos(); });
pintarGrupos(); empezarConceptos();

// ---------- Comentario ----------
const K = { parte: 'a', reloj: null, seg: 0 };
function pintarComentario() {
  const D = COMENTARIO, zona = $('#zona-comentario');
  const seg = h('div', { class: 'glass seg', role: 'tablist' }, h('span', { class: 'pill' }),
    D.partes.map(p => h('button', { role: 'tab', 'data-m': p.id, 'aria-selected': p.id === K.parte }, `${p.id}) ${p.pts === 2 ? 'Comentario · 2' : 'Clasificación · 0,5'}`)));
  const cuerpo = h('div', { style: 'display:grid;gap:14px' });
  zona.replaceChildren(
    h('figure', { class: 'glass foto', style: 'margin:0' }, h('img', { src: D.img, alt: 'Volcán Tajogaite: cono negro de ceniza con pinos canarios quemados y la copa de una palmera asomando', loading: 'lazy' }), h('figcaption', {}, D.fuente)),
    h('p', { class: 'mut peq' }, D.enunciado), seg, cuerpo);
  segmentado(seg, m => { K.parte = m; pintarParte(cuerpo); });
  pintarParte(cuerpo);
}
function pintarParte(cuerpo) {
  const D = COMENTARIO, p = D.partes.find(x => x.id === K.parte);
  pararReloj();
  const ta = h('textarea', { placeholder: p.id === 'a' ? 'Clasifica, justifica y di la tipología…' : 'Escribe el comentario siguiendo el guion…', style: `min-height:${p.id === 'a' ? 180 : 320}px` });
  ta.value = P.borrador[p.id] || '';
  const chipsClaves = h('div', { class: 'claves' });
  const barra = h('div', { class: 'barra' }, h('i'));
  const pct = h('b', {}, '0 %');
  function vivo() {
    const k = comprobar(ta.value, p.claves);
    chipsClaves.replaceChildren(...p.claves.map(x => h('span', { class: 'clave' + (k.si.includes(x) ? ' si' : '') }, etiquetaClave(x, p.modelo))));
    $('i', barra).style.width = Math.round(k.r * 100) + '%'; pct.textContent = Math.round(k.r * 100) + ' %';
    P.borrador[p.id] = ta.value; guardar();
    return k;
  }
  let t; ta.addEventListener('input', () => { clearTimeout(t); t = setTimeout(vivo, 250); });
  const reloj = h('span', { class: 'reloj' }, '00:00');
  const btnReloj = h('button', { class: 'btn sec', onclick: () => K.reloj ? pararReloj() : arrancarReloj(reloj, btnReloj, p.id === 'a' ? 5 : 20) }, 'Cronometrar');
  const res = h('div', { style: 'display:grid;gap:12px' });
  const btnCorregir = h('button', { class: 'btn', onclick: () => {
    if (ta.value.trim().length < 40) { temblar(ta); aviso('Escribe un poco más antes de corregir'); return; }
    pararReloj();
    const k = vivo();
    const pts = Math.round(Math.min(1, k.r / .8) * p.pts * 4) / 4;
    P.coment[p.id] = Math.max(P.coment[p.id] * .5, Math.min(1, k.r / .8)); guardar();
    if (k.r >= .7) chispasEn(btnCorregir);
    res.replaceChildren(
      h('div', { class: 'veredicto ' + (k.r >= .7 ? 'ok' : k.r >= .4 ? 'medio' : 'mal') },
        h('b', {}, `Estimación: ${coma(pts)} de ${coma(p.pts)}`),
        h('span', { class: 'peq' }, `Has tocado ${k.si.length} de ${p.claves.length} ideas clave. La redacción, el orden y la relación entre ideas los valora tu profesor: esto solo mide el contenido.`)),
      k.no.length ? h('p', {}, h('b', {}, 'Te faltan: '), k.no.map(x => etiquetaClave(x, p.modelo)).join(', ') + '.') : h('p', {}, '¡Están todas las ideas clave!'),
      h('details', {}, h('summary', {}, 'Ver la respuesta modelo'), h('div', { class: 'modelo' }, p.modelo)));
  } }, 'Corregir');
  cuerpo.replaceChildren(...[
    h('div', { class: 'glass tarjeta' }, h('h3', {}, 'Guion de la respuesta'), h('div', { class: 'pasos' }, p.pasos.map(([a, b]) => h('div', { class: 'paso' }, h('b', {}, a), h('span', {}, b))))),
    h('div', { class: 'glass tarjeta' },
      h('div', { class: 'fila', style: 'justify-content:space-between' }, h('h3', {}, 'Tu respuesta'), h('div', { class: 'fila' }, reloj, btnReloj)),
      ta,
      h('div', { class: 'cobertura' }, h('span', { class: 'peq mut' }, 'Ideas clave'), barra, pct),
      chipsClaves,
      h('div', { class: 'fila' }, btnCorregir, h('button', { class: 'btn fant', onclick: () => { ta.value = ''; vivo(); res.replaceChildren(); } }, 'Borrar')),
      res),
    p.id === 'b' ? h('div', { class: 'glass tarjeta' }, h('h3', {}, 'Palabras clave'),
      h('p', { class: 'mut peq' }, 'Toca una para ver qué significa.'),
      h('div', { class: 'chips' }, D.palabras.map(([w, def]) => h('button', { class: 'chip palabra', onclick: () => aviso(`${w}: ${def}`) }, w)))) : null,
    p.id === 'b' ? h('div', { class: 'glass tarjeta' }, h('h3', {}, 'Datos importantes'),
      h('div', { class: 'datos' }, D.datos.map(([a, b]) => h('div', { class: 'dato' }, h('b', {}, a), h('span', {}, b)))),
      h('p', { class: 'aviso' }, D.avisoDatos)) : null].filter(Boolean));
  vivo();
}
function arrancarReloj(el, btn, min) {
  K.seg = 0; btn.textContent = 'Parar';
  K.reloj = setInterval(() => {
    K.seg++;
    el.textContent = String(Math.floor(K.seg / 60)).padStart(2, '0') + ':' + String(K.seg % 60).padStart(2, '0');
    el.style.color = K.seg > min * 60 ? 'var(--mal)' : '';
    if (K.seg === min * 60) aviso(`Llevas ${min} minutos: en el examen ya tocaría pasar a otra pregunta`);
  }, 1000);
  K.btn = btn;
}
function pararReloj() { clearInterval(K.reloj); K.reloj = null; if (K.btn) K.btn.textContent = 'Cronometrar'; }
pintarComentario();

// Arranque
pintarInicio();
requestAnimationFrame(() => {
  moverPastilla($('#tabbar'), $('#tabbar .tab[aria-selected="true"]'), true);
  let v = null; try { v = sessionStorage.getItem('geo-vista'); } catch (e) {}
  if (v && v !== 'inicio') ir(v);
});
addEventListener('resize', () => moverPastilla($('#tabbar'), $('#tabbar .tab[aria-selected="true"]'), true));
