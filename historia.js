// Historia: dos modos. Fechas: tarjetas de fechas. Se describe el suceso y se escribe el año (o los dos años de una etapa).
// Ordenar: los sucesos de un sub-bloque se colocan en orden cronológico (más abajo).
// Lo fallado vuelve a salir tres tarjetas después; la nota cuenta solo el primer intento.

const H = { modo: 'fechas', etapa: 'todas', cola: [], i: 0, ok: 0, vistas: new Set(), fallos: [] };
const añosDe = t => (String(t).match(/\d{4}/g) || []).map(Number);
const igual = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);

function fechasFiltradas() { return FECHAS.filter(f => H.etapa === 'todas' || f.e === H.etapa); }
function empezarHistoria(lista = fechasFiltradas()) {
  H.cola = [...lista].sort((a, b) => ((P.historia[a.id] ?? 0) - (P.historia[b.id] ?? 0)) || Math.random() - .5);
  if (H.etapa === 'todas' && lista.length > 25) H.cola = H.cola.slice(0, 25);
  H.i = 0; H.ok = 0; H.vistas = new Set(); H.fallos = [];
  preguntaFecha();
}
function preguntaFecha() {
  const zona = $('#zona-historia');
  if (H.i >= H.cola.length) return finHistoria();
  const f = H.cola[H.i], etapa = ETAPAS.find(e => e.id === f.e), dos = f.a.length === 2, repaso = H.vistas.has(f.id);
  const inp = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', 'aria-label': 'Año',
    placeholder: dos ? 'Año de inicio – año de fin' : 'Año' });
  const res = h('div', { style: 'display:grid;gap:12px' });
  const btn = h('button', { class: 'btn' }, 'Corregir');
  let hecho = false;
  function corregir() {
    if (hecho) return siguiente();
    const puestos = añosDe(inp.value);
    if (!puestos.length) { temblar(inp); aviso(dos ? 'Escribe los dos años, p. ej. 1808-1813' : 'Escribe el año con cuatro cifras'); return; }
    hecho = true; inp.readOnly = true;
    const bien = [f.a, ...(f.alt || [])].some(a => igual(puestos, a));
    const medio = !bien && dos && puestos.some(y => f.a.includes(y));
    if (!repaso) { H.vistas.add(f.id); if (bien) H.ok++; else H.fallos.push(f); }
    anotar('historia', f.id, bien);
    if (bien) chispasEn(btn);
    else { temblar(inp); H.cola.splice(Math.min(H.i + 4, H.cola.length), 0, f); }
    let pista = '';
    if (!bien && !dos) {
      const d = puestos[0] - f.a[0];
      pista = `Has puesto ${puestos[0]}: te has ido ${Math.abs(d)} año${Math.abs(d) === 1 ? '' : 's'} ${d > 0 ? 'de más' : 'de menos'}.`;
    } else if (medio) pista = 'Tienes uno de los dos años bien; fíjate en el otro.';
    res.replaceChildren(...[
      h('div', { class: 'veredicto ' + (bien ? 'ok' : medio ? 'medio' : 'mal') },
        h('b', {}, bien ? `¡Exacto! ${f.f}` : `Era ${f.f}`),
        pista ? h('span', { class: 'peq' }, pista) : null,
        !bien ? h('span', { class: 'peq' }, 'Volverá a salir dentro de unas tarjetas.') : null),
      h('div', { class: 'modelo' }, h('b', {}, 'Por qué importa. '), f.x),
      f.nota ? h('p', { class: 'aviso' }, f.nota) : null].filter(Boolean));
    btn.textContent = H.i === H.cola.length - 1 ? 'Ver la nota' : 'Siguiente';
    btn.focus({ preventScroll: true });
  }
  function siguiente() { H.i++; preguntaFecha(); }
  btn.addEventListener('click', corregir);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); corregir(); } });
  zona.replaceChildren(h('div', { class: 'glass tarjeta carta-fecha' },
    h('div', { class: 'contador' }, h('span', {}, `${H.i + 1} de ${H.cola.length}`),
      h('span', { class: 'marcador' }, h('span', { class: 'o' }, `✓ ${H.ok}`), h('span', { class: 'x' }, `✗ ${H.fallos.length}`))),
    h('span', { class: 'grupo' }, (repaso ? 'Repaso · ' : '') + etapa.corto),
    h('h2', {}, f.p), inp, h('div', { class: 'fila' }, btn), res));
  inp.focus({ preventScroll: true });
}
function finHistoria() {
  const total = H.vistas.size, nota = total ? H.ok / total * 10 : 0;
  if (nota >= 8) chispas(innerWidth / 2, innerHeight / 3, 30);
  $('#zona-historia').replaceChildren(h('div', { class: 'glass tarjeta' },
    h('span', { class: 'cab' }, h('span', { class: 'eti' }, 'Resultado')),
    h('div', { class: 'nota-total' }, h('div', { class: 'anillo', style: `--p:${nota * 10}` }, h('div', {}, h('b', {}, coma(Math.round(nota * 10) / 10)), h('small', {}, 'de 10'))),
      h('p', {}, `${H.ok} de ${total} a la primera. ` + (nota >= 8 ? 'Estas fechas ya las tienes.' : nota >= 5 ? 'Vas bien: repite solo las que has fallado.' : 'Haz otra vuelta: las fallidas saldrán primero.'))),
    H.fallos.length ? h('div', { class: 'datos' }, H.fallos.map(f => h('div', { class: 'dato' }, h('b', {}, f.f), h('span', {}, f.p)))) : null,
    h('div', { class: 'fila' },
      H.fallos.length ? h('button', { class: 'btn', onclick: () => empezarHistoria(H.fallos) }, 'Repetir los fallos') : null,
      h('button', { class: H.fallos.length ? 'btn sec' : 'btn', onclick: () => empezarHistoria() }, 'Otra vuelta'))));
}
// ---------- Ordenar: los sucesos de cada sub-bloque se tocan en el orden en que ocurrieron ----------
const O = { lista: [], i: 0 };
function empezarOrden() {
  O.lista = ORDEN.filter(b => H.etapa === 'todas' || b.e === H.etapa);
  O.i = 0; bloqueOrden();
}
function bloqueOrden() {
  const b = O.lista[O.i], etapa = ETAPAS.find(e => e.id === b.e);
  const todos = b.s.map((_, k) => k);
  let quedan; do quedan = barajar(todos); while (quedan.every((v, k) => v === k));
  const puestos = [];
  let comprobado = false;
  const bandeja = h('div', { class: 'sucesos' }), lista = h('ol', { class: 'cronologia' });
  const res = h('div', { style: 'display:grid;gap:12px' });
  const btn = h('button', { class: 'btn', disabled: true, onclick: comprobar }, 'Comprobar');
  const pintar = () => {
    lista.replaceChildren(...(puestos.length ? puestos.map((k, pos) => h('li', {}, h('button', {
      class: 'suceso' + (comprobado ? (k === pos ? ' ok' : ' mal') : ''), disabled: comprobado,
      onclick: () => { puestos.splice(pos, 1); quedan.push(k); pintar(); } },
      h('span', { class: 'num' }, pos + 1), h('span', {}, b.s[k][0],
        comprobado ? h('span', { class: 'fecha' }, b.s[k][1] + (k === pos ? '' : ` · va en el puesto ${k + 1}`)) : null))))
      : [h('li', { class: 'vacio' }, 'Toca abajo el suceso que ocurrió primero.')]));
    bandeja.replaceChildren(...quedan.map(k => h('button', { class: 'suceso', onclick: () => {
      quedan = quedan.filter(x => x !== k); puestos.push(k); pintar(); } }, b.s[k][0])));
    bandeja.style.display = quedan.length ? '' : 'none';
    btn.disabled = !!quedan.length && !comprobado;
  };
  function comprobar() {
    if (comprobado) return siguiente();
    comprobado = true;
    const bien = puestos.filter((k, pos) => k === pos).length, todo = bien === b.s.length;
    anotar('orden', b.id, todo);
    if (todo) chispasEn(btn); else temblar(lista);
    pintar();
    res.replaceChildren(...[
      h('div', { class: 'veredicto ' + (todo ? 'ok' : bien >= b.s.length / 2 ? 'medio' : 'mal') },
        h('b', {}, todo ? '¡Orden perfecto!' : `${bien} de ${b.s.length} en su sitio`),
        h('span', { class: 'peq' }, todo ? 'Debajo de cada suceso tienes su fecha.' : 'En rojo, los que están fuera de sitio y el puesto que les toca.')),
      !todo ? h('div', { class: 'datos' }, b.s.map(([t, f]) => h('div', { class: 'dato' }, h('b', {}, f), h('span', {}, t)))) : null,
      h('div', { class: 'fila' },
        h('button', { class: todo ? 'btn sec' : 'btn', onclick: bloqueOrden }, 'Otra vez'),
        h('button', { class: todo ? 'btn' : 'btn sec', onclick: siguiente }, O.lista.length > 1 ? 'Siguiente bloque' : 'Volver a empezar'))].filter(Boolean));
    btn.style.display = 'none';
  }
  function siguiente() { O.i = (O.i + 1) % O.lista.length; bloqueOrden(); }
  $('#zona-historia').replaceChildren(h('div', { class: 'glass tarjeta carta-fecha' },
    h('div', { class: 'contador' }, h('span', {}, `Bloque ${O.i + 1} de ${O.lista.length}`),
      h('span', {}, ['Nuevo', 'Flojo', 'Casi', 'Dominado'][P.orden[b.id] ?? 0])),
    h('span', { class: 'grupo' }, etapa.corto),
    h('h2', {}, b.n),
    h('p', { class: 'mut peq', style: 'margin:0' }, 'Ordena los sucesos del más antiguo al más reciente. Toca uno ya colocado para devolverlo.'),
    lista, bandeja, h('div', { class: 'fila' }, btn), res));
  pintar();
}

function empezarModo() { H.modo === 'ordenar' ? empezarOrden() : empezarHistoria(); }
chipsUnaOpcion($('#etapas-historia'), [['todas', 'Todas'], ...ETAPAS.map((e, i) => [e.id, `${i + 1}. ${e.corto}`])], H.etapa, id => { H.etapa = id; pintarEtapa(); empezarModo(); });
segmentado($('#seg-historia'), m => { H.modo = m; pintarEtapa(); empezarModo(); });
function pintarEtapa() {
  const e = ETAPAS.find(x => x.id === H.etapa);
  if (H.modo === 'ordenar') {
    const n = ORDEN.filter(b => !e || b.e === e.id).length;
    $('#etapa-historia').textContent = e ? `${e.n} (${e.años}) · ${n} bloques de sucesos` : `Las seis etapas seguidas · ${n} bloques de sucesos`;
  } else $('#etapa-historia').textContent = e ? `${e.n} (${e.años}) · ${FECHAS.filter(f => f.e === e.id).length} fechas` : `Las seis etapas mezcladas · tandas de 25 de las ${FECHAS.length} fechas, primero las que menos dominas`;
}
pintarEtapa(); empezarHistoria();
