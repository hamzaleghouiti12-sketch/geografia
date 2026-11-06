// Historia: tarjetas de fechas. Se describe el suceso y se escribe el año (o los dos años de una etapa).
// Lo fallado vuelve a salir tres tarjetas después; la nota cuenta solo el primer intento.

const H = { etapa: 'todas', cola: [], i: 0, ok: 0, vistas: new Set(), fallos: [] };
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
chipsUnaOpcion($('#etapas-historia'), [['todas', 'Todas'], ...ETAPAS.map((e, i) => [e.id, `${i + 1}. ${e.corto}`])], H.etapa, id => { H.etapa = id; pintarEtapa(); empezarHistoria(); });
function pintarEtapa() {
  const e = ETAPAS.find(x => x.id === H.etapa);
  $('#etapa-historia').textContent = e ? `${e.n} (${e.años}) · ${FECHAS.filter(f => f.e === e.id).length} fechas` : `Las seis etapas mezcladas · tandas de 25 de las ${FECHAS.length} fechas, primero las que menos dominas`;
}
pintarEtapa(); empezarHistoria();
