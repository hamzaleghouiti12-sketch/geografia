// Mapas interactivos: político, físico, coordenadas y escalas. Dibuja SVG a partir de datos-mapa.js.
const NS = 'http://www.w3.org/2000/svg';
const MP = window.MAPA;
function s(tag, attrs = {}, ...hijos) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v);
  }
  for (const c of hijos.flat()) if (c != null) el.append(c.nodeType ? c : document.createTextNode(c));
  return el;
}
const RECUADRO = { x: 16, y: 598, w: 252, h: 148 };
const enRecuadro = (x, y) => x >= RECUADRO.x && x <= RECUADRO.x + RECUADRO.w && y >= RECUADRO.y && y <= RECUADRO.y + RECUADRO.h;
function proy(lon, lat) {
  const f = MP.marcos[lat < 30.5 && lon < -12 ? 'can' : 'pen'];
  return [(lon - f.lon0) * MP.KX + f.ox, (f.lat0 - lat) * MP.S + f.oy];
}
function inversa(x, y) {
  const f = MP.marcos[enRecuadro(x, y) ? 'can' : 'pen'];
  return [(x - f.ox) / MP.KX + f.lon0, f.lat0 - (y - f.oy) / MP.S];
}
const linea = pts => 'M' + pts.map(([lon, lat]) => proy(lon, lat).map(n => n.toFixed(1)).join(',')).join('L');
const poligono = pts => linea(pts) + 'Z';
function puntoSVG(svg, e) {
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(svg.getScreenCTM().inverse());
}
const gms = (v, pos, neg) => { const a = Math.abs(v), g = Math.floor(a), m = Math.round((a - g) * 60); return `${m === 60 ? g + 1 : g}° ${String(m === 60 ? 0 : m).padStart(2, '0')}′ ${v >= 0 ? pos : neg}`; };
const verLL = ([lat, lon]) => `${gms(lat, 'N', 'S')} · ${gms(lon, 'E', 'O')}`;
function kmEntre([la1, lo1], [la2, lo2]) {
  const R = 6371, r = Math.PI / 180, dLa = (la2 - la1) * r, dLo = (lo2 - lo1) * r;
  const a = Math.sin(dLa / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// ---------- Mapa de España ----------
function mapaEspana({ fisico = false } = {}) {
  const [W, H] = MP.vb;
  const svg = s('svg', { class: 'mapa', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Mapa de España' });
  const defs = s('defs', {},
    s('clipPath', { id: 'clip-pen' }, s('rect', { x: 0, y: 0, width: W, height: 588 })),
    s('clipPath', { id: 'clip-tierra' }, MP.prov.map(p => s('path', { d: p.d }))));
  svg.append(defs, s('rect', { class: 'mar', width: W, height: H, rx: 18 }));
  svg.append(s('g', { 'clip-path': 'url(#clip-pen)' }, MP.vecinos.map(d => s('path', { class: 'vecino', d }))));
  // Retícula: 1° fina, rótulos cada 2° como en el mapa del examen
  const ret = s('g', { 'clip-path': 'url(#clip-pen)' }), rot = s('g');
  for (let lon = -10; lon <= 4; lon++) {
    const [x] = proy(lon, 40);
    ret.append(s('line', { class: 'reticula' + (lon === 0 ? ' fuerte' : ''), x1: x, x2: x, y1: 0, y2: 588 }));
    if (lon % 2 === 0) rot.append(s('text', { class: 'grad', x, y: 13, 'text-anchor': 'middle' }, lon === 0 ? '0°' : `${Math.abs(lon)}° ${lon < 0 ? 'O' : 'E'}`));
  }
  for (let lat = 35; lat <= 44; lat++) {
    const [, y] = proy(0, lat);
    ret.append(s('line', { class: 'reticula', x1: 0, x2: W, y1: y, y2: y }));
    if (lat % 2 === 0) rot.append(s('text', { class: 'grad', x: W - 6, y: y - 3, 'text-anchor': 'end' }, `${lat}° N`));
  }
  svg.append(ret, rot);
  // Recuadro de Canarias con su propia retícula
  const can = s('g');
  can.append(s('rect', { class: 'mar', x: RECUADRO.x, y: RECUADRO.y, width: RECUADRO.w, height: RECUADRO.h, rx: 10 }));
  for (let lon = -18; lon <= -14; lon++) {
    const [x] = proy(lon, 28);
    can.append(s('line', { class: 'reticula', x1: x, x2: x, y1: RECUADRO.y, y2: RECUADRO.y + RECUADRO.h }));
    if (lon % 2 === 0) can.append(s('text', { class: 'grad', x, y: RECUADRO.y + 12, 'text-anchor': 'middle' }, `${-lon}° O`));
  }
  for (const lat of [28, 29]) {
    const [, y] = proy(-15, lat);
    can.append(s('line', { class: 'reticula', x1: RECUADRO.x, x2: RECUADRO.x + RECUADRO.w, y1: y, y2: y }));
    can.append(s('text', { class: 'grad', x: RECUADRO.x + RECUADRO.w - 4, y: y - 3, 'text-anchor': 'end' }, `${lat}° N`));
  }
  can.append(s('rect', { class: 'recuadro', x: RECUADRO.x, y: RECUADRO.y, width: RECUADRO.w, height: RECUADRO.h, rx: 10 }));
  svg.append(can);
  // Tierra
  const gProv = s('g'), provs = new Map();
  for (const p of MP.prov) {
    const el = s('path', { class: fisico ? 'tierra-f' : 'prov', d: p.d, 'data-cod': p.cod });
    provs.set(p.cod, el); gProv.append(el);
  }
  svg.append(gProv);
  if (!fisico) svg.append(s('g', {}, MP.ccaa.map(c => s('path', { class: 'borde-cc', d: c.d }))));
  // Escala gráfica (0,539 px por km a 40° N)
  const pxKm = MP.KX / (111.32 * Math.cos(40 * Math.PI / 180));
  const ex = 470, ey = 712;
  svg.append(s('g', {},
    s('rect', { x: ex, y: ey - 5, width: 100 * pxKm, height: 5, fill: '#5d5a74', rx: 1 }),
    s('rect', { x: ex + 100 * pxKm, y: ey - 5, width: 100 * pxKm, height: 5, fill: '#fff', stroke: '#5d5a74', rx: 1 }),
    ['0', '100', '200 km'].map((t, i) => s('text', { class: 'grad', x: ex + i * 100 * pxKm, y: ey + 13, 'text-anchor': 'middle' }, t)),
    s('text', { class: 'grad', x: ex, y: ey - 12 }, 'Escala gráfica')));
  const capas = { rotulos: s('g'), puntos: s('g') };
  return { svg, provs, capas, pxKm };
}

// ---------- Estado de la sección ----------
const Mz = { seg: 'politico', sub: {}, ronda: null };
const SUBS = {
  politico: [['explorar', 'Explorar'], ['provincia', 'Encuentra la provincia'], ['comunidad', 'Encuentra la comunidad'], ['escribe', 'Escribe el nombre'], ['capital', 'Capitales'], ['fijas', 'Preguntas fijas']],
  fisico: [['explorar', 'Explorar'], ['unidad', 'Encuentra la unidad'], ['escribe', 'Escribe el nombre'], ['formacion', '¿Cómo se formó?'], ['evolucion', 'Evolución geológica']],
  coord: [['leer', 'Lee las coordenadas'], ['colocar', 'Coloca el punto'], ['mundo', 'Mapa del mundo'], ['extremos', '¿Cuál está más…?'], ['teoria', 'Lo que hay que saber']],
  escala: [['problemas', 'Problemas'], ['teoria', 'Lo que hay que saber']],
};
const CABECERAS = {
  politico: ['Mapa político · 2,5 puntos', 'Comunidades, capitales y provincias', 'Toca, encuentra y escribe nombres sobre el mapa mudo, como en el examen.', 't-cielo'],
  fisico: ['Mapa físico · 2,5 puntos', 'Relieve, roquedo y formación', 'Unidades del relieve, tipos de roquedo, cómo se formó cada unidad y la evolución geológica.', 't-menta'],
  coord: ['Mapa político · coordenadas', 'Coordenadas geográficas', 'Latitud y longitud de puntos en el mapa de España y en el del mundo.', 't-cielo'],
  escala: ['Mapa político · escalas', 'Escalas', 'Escala numérica y gráfica: pasar del mapa a la realidad y al revés.', 't-cielo'],
};
let mapasListos = false;
window.abrirMapas = function () {
  if (!mapasListos) {
    mapasListos = true;
    segmentado($('#seg-mapas'), m => { Mz.seg = m; pintarSeccion(); });
  }
  if (window.modoMapa) {
    const b = $(`#seg-mapas button[data-m="${window.modoMapa}"]`);
    if (b && b.getAttribute('aria-selected') !== 'true') b.click();
    else { Mz.seg = window.modoMapa; pintarSeccion(); }
    window.modoMapa = null; return;
  }
  if (!$('#zona-mapas').children.length) pintarSeccion();
};
function pintarSeccion() {
  const [eti, tit, desc, tema] = CABECERAS[Mz.seg];
  $('#eti-mapa').textContent = eti; $('#tit-mapa').textContent = tit; $('#desc-mapa').textContent = desc;
  const v = $('#v-mapas'); v.classList.remove('t-cielo', 't-menta'); v.classList.add(tema);
  const sub = Mz.sub[Mz.seg] || SUBS[Mz.seg][0][0];
  chipsUnaOpcion($('#sub-mapas'), SUBS[Mz.seg], sub, id => { Mz.sub[Mz.seg] = id; pintarSub(); });
  pintarSub();
}
function pintarSub() {
  const sub = Mz.sub[Mz.seg] || SUBS[Mz.seg][0][0];
  const zona = $('#zona-mapas'); zona.replaceChildren();
  clearTimeout(Mz.t);
  ({ politico: politico, fisico: fisico, coord: coordenadas, escala: escalas })[Mz.seg](sub, zona);
}
function cajaMapa(svg) { return h('div', { class: 'glass mapa-caja' }, svg); }
function rotulo(capa, x, y, txt) { capa.append(s('text', { class: 'rotulo', x, y }, txt)); }

// Ronda de 10 preguntas con marcador
function nuevaRonda(total = 10) { return { n: 0, ok: 0, total }; }
function marcador(r) { return h('span', { class: 'marcador' }, h('span', { class: 'o' }, '✓ ' + r.ok), h('span', { class: 'x' }, '✗ ' + (r.n - r.ok)), h('span', { class: 'mut' }, ` · ${Math.min(r.n + 1, r.total)}/${r.total}`)); }
function finRonda(zona, r, otra) {
  const nota = r.ok / r.total;
  if (nota >= .8) chispas(innerWidth / 2, innerHeight / 3, 30);
  zona.prepend(h('div', { class: 'glass tarjeta' },
    h('div', { class: 'nota-total' }, h('div', { class: 'anillo', style: `--p:${nota * 100}` }, h('div', {}, h('b', {}, r.ok), h('small', {}, 'de ' + r.total))),
      h('p', {}, nota >= .8 ? '¡Lo tienes! Prueba otro modo.' : nota >= .5 ? 'Bien, pero repite: lo fallado vuelve antes.' : 'Repite la ronda: las que fallas te salen más.')),
    h('button', { class: 'btn', onclick: otra }, 'Otra ronda')));
}

// ---------- POLÍTICO ----------
const nombreProv = cod => PROVINCIAS[cod].n;
const ccDe = cod => MP.prov.find(p => p.cod === cod).cc;
const provsDeCC = cc => MP.prov.filter(p => p.cc === cc).map(p => p.cod);
function fichaProvincia(cod) {
  const p = PROVINCIAS[cod], cc = CCAA[ccDe(cod)];
  return h('div', { class: 'glass tarjeta ficha' },
    h('h3', {}, p.n),
    h('dl', {},
      h('dt', {}, 'Capital de provincia'), h('dd', {}, p.cap),
      h('dt', {}, cc.ciudad ? 'Ciudad autónoma' : 'Comunidad autónoma'), h('dd', {}, cc.n),
      cc.ciudad ? null : [h('dt', {}, 'Capital de la comunidad'), h('dd', {}, cc.cap)],
      h('dt', {}, 'Coordenadas de la capital'), h('dd', {}, verLL(p.ll))),
    cc.nota ? h('p', { class: 'mut peq' }, cc.nota) : null);
}
function politico(sub, zona) {
  const m = mapaEspana(); m.svg.append(m.capas.rotulos, m.capas.puntos);
  const panel = h('div', { style: 'display:grid;gap:14px' });
  zona.append(panel, cajaMapa(m.svg));
  const limpiar = () => m.provs.forEach(el => el.classList.remove('sel', 'ok', 'mal', 'pista', 'hecho'));
  const ids = Object.keys(PROVINCIAS);

  if (sub === 'explorar') {
    panel.append(h('p', { class: 'mut' }, 'Toca una provincia para ver su comunidad y sus capitales.'));
    m.svg.addEventListener('click', e => {
      const cod = e.target.dataset && e.target.dataset.cod; if (!cod) return;
      limpiar(); provsDeCC(ccDe(cod)).forEach(c => m.provs.get(c).classList.add('hecho'));
      m.provs.get(cod).classList.remove('hecho'); m.provs.get(cod).classList.add('sel');
      panel.replaceChildren(fichaProvincia(cod));
    });
    return;
  }

  if (sub === 'provincia' || sub === 'comunidad') {
    const esCC = sub === 'comunidad', r = nuevaRonda();
    const ccIds = Object.keys(CCAA);
    let objetivo, bloqueado = false;
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      limpiar(); bloqueado = false;
      objetivo = esCC ? elegir('politico', ccIds.map(c => 'cc' + c), objetivo).slice(2) : elegir('politico', ids, objetivo);
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, esCC ? 'Toca cualquier provincia de…' : 'Toca la provincia de…'), marcador(r)),
        h('p', { class: 'pregunta' }, h('em', {}, esCC ? CCAA[objetivo].n : nombreProv(objetivo)))));
    };
    m.svg.addEventListener('click', e => {
      const cod = e.target.dataset && e.target.dataset.cod; if (!cod || bloqueado) return;
      bloqueado = true;
      const bien = esCC ? ccDe(cod) === objetivo : cod === objetivo;
      const correctas = esCC ? provsDeCC(objetivo) : [objetivo];
      anotar('politico', esCC ? 'cc' + objetivo : objetivo, bien);
      r.n++; if (bien) r.ok++;
      if (bien) { correctas.forEach(c => m.provs.get(c).classList.add('ok')); chispas(e.clientX, e.clientY); }
      else {
        m.provs.get(cod).classList.add('mal'); correctas.forEach(c => m.provs.get(c).classList.add('pista'));
        aviso(`Eso es ${esCC ? CCAA[ccDe(cod)].n : nombreProv(cod)}`);
      }
      Mz.t = setTimeout(preg, bien ? 900 : 2000);
    });
    preg(); return;
  }

  if (sub === 'escribe' || sub === 'capital') {
    const esCap = sub === 'capital', r = nuevaRonda();
    const ccIds = Object.keys(CCAA).filter(c => !CCAA[c].ciudad);
    let objetivo;
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      limpiar(); m.capas.puntos.replaceChildren();
      objetivo = esCap ? elegir('politico', ccIds.map(c => 'cap' + c), objetivo).slice(3) : elegir('politico', ids, objetivo);
      (esCap ? provsDeCC(objetivo) : [objetivo]).forEach(c => m.provs.get(c).classList.add('sel'));
      const inp = h('input', { type: 'text', placeholder: esCap ? 'Capital de esta comunidad' : 'Nombre de la provincia', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Respuesta' });
      const res = h('div');
      const btn = h('button', { class: 'btn' }, 'Comprobar');
      btn.onclick = corregir;
      function corregir() {
        if (!inp.value.trim()) { temblar(inp); return; }
        let bien, sol;
        if (esCap) { const cc = CCAA[objetivo]; sol = cc.cap; bien = acierta(inp.value, [cc.cap, ...(cc.capAlias || [])]); }
        else { const p = PROVINCIAS[objetivo]; sol = p.n; bien = acierta(inp.value, [p.n, ...(p.alias || [])]); }
        anotar('politico', esCap ? 'cap' + objetivo : objetivo, bien);
        r.n++; if (bien) { r.ok++; chispasEn(btn); } else temblar(inp);
        (esCap ? provsDeCC(objetivo) : [objetivo]).forEach(c => { const el = m.provs.get(c); el.classList.remove('sel'); el.classList.add(bien ? 'ok' : 'mal'); });
        const extra = esCap ? `Comunidad: ${CCAA[objetivo].n}.` : `${CCAA[ccDe(objetivo)].n} · capital de provincia: ${PROVINCIAS[objetivo].cap}.`;
        res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Correcto!' : `Era ${sol}`), h('span', { class: 'peq' }, extra)));
        btn.textContent = 'Siguiente'; btn.dataset.fin = '1';
        btn.onclick = preg; inp.readOnly = true;
      }
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); btn.dataset.fin ? preg() : corregir(); } });
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, esCap ? '¿Cuál es la capital de la comunidad marcada?' : '¿Qué provincia está marcada?'), marcador(r)),
        h('div', { class: 'fila', style: 'flex-wrap:nowrap' }, inp, btn), res));
      inp.focus({ preventScroll: true });
    };
    preg(); return;
  }

  if (sub === 'fijas') {
    let fija = FIJAS[0];
    const empezar = () => {
      limpiar();
      let paso = 0, fallos = 0;
      const orden = h('div', { class: 'orden' });
      const estado = h('p', { class: 'mut peq' }, 'Toca las provincias en el orden correcto.');
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'chips' }, FIJAS.map(f => h('button', { class: 'chip', 'aria-pressed': f === fija, onclick: () => { fija = f; empezar(); } }, f.id === 'portugal' ? 'Frontera con Portugal' : 'Más septentrionales'))),
        h('p', { class: 'pregunta' }, fija.p), estado, orden));
      m.svg.onclick = e => {
        const cod = e.target.dataset && e.target.dataset.cod; if (!cod || paso >= fija.orden.length) return;
        if (fija.orden.indexOf(cod) > -1 && fija.orden.indexOf(cod) < paso) return;
        const esperado = fija.orden[paso];
        if (cod === esperado) {
          m.provs.get(cod).classList.remove('pista'); m.provs.get(cod).classList.add('ok');
          orden.append(h('span', {}, nombreProv(cod))); paso++; chispas(e.clientX, e.clientY, 8);
        } else {
          fallos++; m.provs.get(cod).classList.add('mal'); setTimeout(() => m.provs.get(cod).classList.remove('mal'), 700);
          temblar(orden);
          estado.textContent = fija.orden.includes(cod) ? `${nombreProv(cod)} va, pero no ahora: ¿cuál toca antes?` : `${nombreProv(cod)} no entra en la lista.`;
          if (fallos % 2 === 0) m.provs.get(esperado).classList.add('pista');
        }
        if (paso === fija.orden.length) {
          estado.replaceChildren(h('div', { class: 'veredicto ' + (fallos ? 'medio' : 'ok') }, h('b', {}, fallos ? `Completada con ${fallos} fallo${fallos > 1 ? 's' : ''}` : '¡Perfecta!'), h('span', { class: 'peq' }, fija.nota)));
          if (!fallos) chispasEn(orden);
        }
      };
    };
    empezar(); return;
  }
}

// ---------- FÍSICO ----------
function capaRoquedo(m) {
  const g = s('g', { 'clip-path': 'url(#clip-tierra)' });
  const [W, H] = MP.vb;
  g.append(s('rect', { class: 'roq', x: 0, y: 0, width: W, height: 590, fill: ROQUEDO.caliza.color, 'data-roq': 'caliza' }));
  g.append(s('rect', { class: 'roq', x: RECUADRO.x, y: RECUADRO.y, width: RECUADRO.w, height: RECUADRO.h, fill: ROQUEDO.volcanica.color, 'data-roq': 'volcanica' }));
  for (const tipo of ['arcillosa', 'silicea']) for (const pol of ROQUEDO[tipo].pol)
    g.append(s('path', { class: 'roq', d: poligono(pol), fill: ROQUEDO[tipo].color, 'data-roq': tipo }));
  return g;
}
function fichaUnidad(u) {
  const roq = ROQUEDO[u.roq];
  return h('div', { class: 'glass tarjeta ficha' },
    h('span', { class: 'cab' }, h('span', { class: 'eti' }, u.tipo)), h('h3', {}, u.n),
    h('dl', {},
      h('dt', {}, 'Cómo se formó'), h('dd', {}, u.form),
      h('dt', {}, 'Roquedo'), h('dd', {}, roq ? `${roq.n}: ${roq.rocas}.` : 'Mixto: zócalo paleozoico silíceo y cobertera caliza.'),
      h('dt', {}, 'Tipo de relieve'), h('dd', {}, u.relieve),
      u.alt ? [h('dt', {}, 'Cumbre'), h('dd', {}, u.alt)] : null));
}
function fichaRoquedo(id) {
  const r = ROQUEDO[id];
  return h('div', { class: 'glass tarjeta ficha' }, h('h3', {}, r.n),
    h('dl', {}, h('dt', {}, 'Rocas'), h('dd', {}, r.rocas), h('dt', {}, 'Edad y origen'), h('dd', {}, r.era),
      h('dt', {}, 'Dónde'), h('dd', {}, r.donde), h('dt', {}, 'Tipo de relieve'), h('dd', {}, r.relieve)));
}
function dibujarUnidades(m, conRotulos) {
  const g = s('g'), els = new Map();
  for (const u of UNIDADES) {
    let vis, toque;
    if (u.linea) {
      vis = s('path', { class: 'unidad linea', d: linea(u.linea) });
      toque = s('path', { class: 'toque', d: linea(u.linea), 'data-u': u.id });
    } else if (u.zona) {
      vis = s('path', { class: 'unidad zona', d: poligono(u.zona) });
      toque = s('path', { class: 'toque area', d: poligono(u.zona), 'data-u': u.id });
    } else {
      const [x, y] = proy(...u.centro), r = u.id === 'canarias' ? 34 : u.id === 'baleares' ? 26 : 30;
      vis = s('ellipse', { class: 'unidad zona', cx: x, cy: y, rx: r * 1.5, ry: r });
      toque = s('ellipse', { class: 'toque area', cx: x, cy: y, rx: r * 1.5, ry: r, 'data-u': u.id });
    }
    els.set(u.id, vis); g.append(vis, toque);
    if (conRotulos) {
      const c = u.rot || (u.linea ? u.linea[Math.floor(u.linea.length / 2)] : u.zona ? u.zona[0] : u.centro);
      const [x, y] = proy(...c); rotulo(m.capas.rotulos, x, u.rot ? y : y - 9, u.n.replace(/ \(.*\)/, ''));
    }
  }
  for (const id of ['aneto', 'mulhacen', 'teide']) {
    const e = EXTREMOS.find(x => x.id === id), [x, y] = proy(e.ll[1], e.ll[0]);
    g.append(s('path', { class: 'cima', d: `M${x},${y - 7}l6,10h-12z` }));
  }
  return { g, els };
}
function fisico(sub, zona) {
  if (sub === 'evolucion') return evolucion(zona);
  const m = mapaEspana({ fisico: true });
  const panel = h('div', { style: 'display:grid;gap:14px' });
  const roq = capaRoquedo(m);
  const { g: gU, els } = dibujarUnidades(m, sub === 'explorar');
  m.svg.append(roq, gU, m.capas.rotulos, m.capas.puntos);
  const leyenda = h('div', { class: 'leyenda' }, ['silicea', 'caliza', 'arcillosa', 'volcanica'].map(id => h('span', {}, h('i', { style: `background:${ROQUEDO[id].color}` }), ROQUEDO[id].n)),
    h('span', {}, h('i', { style: 'background:#8a6a52;height:5px;border-radius:3px' }), 'Cordilleras y sierras'), h('span', {}, '▲ Cumbres'));
  zona.append(panel, h('div', { class: 'glass mapa-caja', style: 'display:grid;gap:10px' }, m.svg, h('div', { style: 'padding:0 8px 8px;display:grid;gap:6px' }, leyenda,
    h('p', { class: 'mut peq' }, 'Roquedo en esquema simplificado (las tres Españas: silícea, caliza y arcillosa).'))));
  const limpiar = () => els.forEach(el => el.classList.remove('sel', 'ok', 'mal'));
  const ids = UNIDADES.map(u => u.id);
  const U = id => UNIDADES.find(u => u.id === id);

  if (sub === 'explorar') {
    const capas = h('div', { class: 'chips' });
    chipsUnaOpcion(capas, [['ambas', 'Relieve y roquedo'], ['unidades', 'Solo relieve'], ['roquedo', 'Solo roquedo']], 'ambas', v => {
      roq.style.display = v === 'unidades' ? 'none' : ''; gU.style.display = m.capas.rotulos.style.display = v === 'roquedo' ? 'none' : '';
    });
    panel.append(capas, h('p', { class: 'mut' }, 'Toca una cordillera, una cuenca o una mancha de color del roquedo.'));
    m.svg.addEventListener('click', e => {
      const u = e.target.dataset && e.target.dataset.u, rq = e.target.dataset && e.target.dataset.roq;
      if (u) { limpiar(); els.get(u).classList.add('sel'); panel.replaceChildren(capas, fichaUnidad(U(u))); }
      else if (rq) { limpiar(); panel.replaceChildren(capas, fichaRoquedo(rq)); }
    });
    return;
  }

  if (sub === 'unidad') {
    const r = nuevaRonda(); let obj, bloq = false;
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      limpiar(); bloq = false; obj = elegir('fisico', ids, obj);
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, 'Toca en el mapa…'), marcador(r)),
        h('p', { class: 'pregunta' }, h('em', {}, U(obj).n))));
    };
    m.svg.addEventListener('click', e => {
      const u = e.target.dataset && e.target.dataset.u; if (!u || bloq) return;
      bloq = true; const bien = u === obj;
      anotar('fisico', obj, bien); r.n++; if (bien) r.ok++;
      els.get(obj).classList.add(bien ? 'ok' : 'sel');
      if (bien) chispas(e.clientX, e.clientY); else { els.get(u).classList.add('mal'); aviso(`Eso es ${U(u).n}`); }
      Mz.t = setTimeout(preg, bien ? 900 : 2000);
    });
    preg(); return;
  }

  if (sub === 'escribe' || sub === 'formacion') {
    const esForm = sub === 'formacion', r = nuevaRonda(esForm ? 5 : 10); let obj;
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      limpiar(); obj = elegir('fisico', ids, obj); const u = U(obj);
      els.get(obj).classList.add('sel');
      const campo = esForm ? h('textarea', { placeholder: 'Unidad morfoestructural, era, orogenia, cómo se formó y qué roquedo tiene…' })
        : h('input', { type: 'text', placeholder: 'Nombre de la unidad marcada', autocomplete: 'off' });
      const res = h('div', { style: 'display:grid;gap:12px' });
      const btn = h('button', { class: 'btn' }, 'Comprobar');
      const corregir = () => {
        if (!campo.value.trim()) { temblar(campo); return; }
        let bien;
        if (esForm) {
          const k = comprobar(campo.value, u.claves); bien = k.r >= .6;
          res.replaceChildren(
            h('div', { class: 'veredicto ' + (bien ? 'ok' : k.r >= .35 ? 'medio' : 'mal') }, h('b', {}, `${k.si.length} de ${u.claves.length} ideas clave`), h('span', { class: 'peq' }, bien ? 'Explicación completa.' : 'Te faltan ideas importantes: mira las rojas.')),
            h('div', { class: 'claves' }, u.claves.map(x => h('span', { class: 'clave ' + (k.si.includes(x) ? 'si' : 'no') }, etiquetaClave(x, u.form + ' ' + u.relieve + ' ' + (ROQUEDO[u.roq] ? ROQUEDO[u.roq].rocas : ''))))),
            fichaUnidad(u));
        } else {
          bien = acierta(campo.value, [u.n, u.n.replace(/ \(.*\)/, ''), ...u.alias]);
          res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Correcto!' : `Era: ${u.n}`), h('span', { class: 'peq' }, u.tipo)));
        }
        anotar('fisico', obj, bien); r.n++; if (bien) { r.ok++; chispasEn(btn); } else temblar(campo);
        els.get(obj).classList.remove('sel'); els.get(obj).classList.add(bien ? 'ok' : 'mal');
        btn.textContent = 'Siguiente'; btn.onclick = preg; campo.readOnly = true;
      };
      btn.onclick = corregir;
      campo.addEventListener('keydown', e => { if (e.key === 'Enter' && (!esForm || e.ctrlKey || e.metaKey)) { e.preventDefault(); campo.readOnly ? preg() : corregir(); } });
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, esForm ? 'Unidad marcada en el mapa' : '¿Qué unidad del relieve está marcada?'), marcador(r)),
        esForm ? h('p', { class: 'pregunta' }, '¿Cómo está formado ', h('em', {}, u.n), ' y qué roquedo tiene?') : null,
        campo, h('div', { class: 'fila' }, btn), res));
      if (!esForm) campo.focus({ preventScroll: true });
    };
    preg(); return;
  }
}
function evolucion(zona) {
  zona.append(h('p', { class: 'mut' }, 'De la más antigua a la actual. Intenta recordar qué pasó en cada era antes de abrirla.'),
    h('div', { style: 'display:grid;gap:12px' }, EVOLUCION.map((e, i) => {
      const d = h('details', { class: 'glass', style: `animation:llega .6s var(--muelle) ${i * 0.08}s both` },
        h('summary', {}, h('span', {}, h('b', {}, e.era), h('span', { class: 'mut peq' }, ` · ${e.ma}`), h('br'), h('span', { class: 'peq', style: 'color:var(--c);font-weight:700' }, e.oro))),
        h('div', {}, h('p', {}, e.hechos)));
      return d;
    })));
}

// ---------- COORDENADAS ----------
function entradaCoord() {
  const lat = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Latitud °', 'aria-label': 'Latitud en grados' });
  const lon = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'Longitud °', 'aria-label': 'Longitud en grados' });
  const ns = h('div', { class: 'chips' }), eo = h('div', { class: 'chips' });
  let vNS = 'N', vEO = 'O';
  chipsUnaOpcion(ns, [['N', 'N'], ['S', 'S']], vNS, v => vNS = v);
  chipsUnaOpcion(eo, [['E', 'E'], ['O', 'O']], vEO, v => vEO = v);
  const num = t => parseFloat(String(t).replace(',', '.').replace(/[^0-9.]/g, ''));
  const el = h('div', { class: 'grid2', style: 'gap:10px' },
    h('div', { class: 'fila', style: 'flex-wrap:nowrap' }, lat, ns), h('div', { class: 'fila', style: 'flex-wrap:nowrap' }, lon, eo));
  return { el, foco: () => lat.focus({ preventScroll: true }), valor: () => ({ lat: num(lat.value) * (vNS === 'S' ? -1 : 1), lon: num(lon.value) * (vEO === 'O' ? -1 : 1), vacio: !lat.value || !lon.value }) };
}
function marcar(capa, x, y, cls = 'punto pulso', r = 6) { const c = s('circle', { class: cls, cx: x, cy: y, r }); capa.append(c); return c; }
function anotarCoord(cubo, bien) { P[cubo].n++; if (bien) P[cubo].ok++; guardar(); }
const puntosEspana = () => [
  ...Object.entries(PROVINCIAS).map(([c, p]) => ({ n: p.cap, ll: p.ll })),
  ...EXTREMOS.map(e => ({ n: e.n, ll: e.ll })),
];
function coordenadas(sub, zona) {
  if (sub === 'teoria') return zona.append(teoria(TEORIA_COORD));
  if (sub === 'mundo' || sub === 'extremos') return mundo(sub, zona);
  const m = mapaEspana(); m.svg.append(m.capas.rotulos, m.capas.puntos);
  m.provs.forEach(el => el.style.cursor = 'default');
  const panel = h('div', { style: 'display:grid;gap:14px' });
  zona.append(panel, cajaMapa(m.svg));
  const r = nuevaRonda(); let obj;
  if (sub === 'leer') {
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      m.capas.puntos.replaceChildren(); m.capas.rotulos.replaceChildren();
      obj = azar(puntosEspana().filter(p => p !== obj));
      const [x, y] = proy(obj.ll[1], obj.ll[0]); marcar(m.capas.puntos, x, y);
      const ent = entradaCoord(), res = h('div'), btn = h('button', { class: 'btn' }, 'Comprobar');
      btn.onclick = () => {
        const v = ent.valor(); if (v.vacio) { temblar(ent.el); return; }
        const dLat = Math.abs(v.lat - obj.ll[0]), dLon = Math.abs(v.lon - obj.ll[1]), bien = dLat <= .5 && dLon <= .5;
        r.n++; if (bien) { r.ok++; chispasEn(btn); } else temblar(ent.el); anotarCoord('coord', bien);
        rotulo(m.capas.rotulos, x, y - 12, obj.n);
        res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Bien leído!' : 'No del todo'),
          h('span', { class: 'peq' }, `${obj.n}: ${verLL(obj.ll)}. Se acepta un margen de medio grado.`)));
        btn.textContent = 'Siguiente'; btn.onclick = preg;
      };
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, '¿Qué coordenadas tiene el punto que parpadea?'), marcador(r)),
        ent.el, h('div', { class: 'fila' }, btn), res));
    };
    preg(); return;
  }
  if (sub === 'colocar') {
    let bloq = false;
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      m.capas.puntos.replaceChildren(); m.capas.rotulos.replaceChildren(); bloq = false;
      obj = azar(puntosEspana().filter(p => p !== obj));
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, 'Toca el mapa donde está este punto'), marcador(r)),
        h('p', { class: 'pregunta' }, h('em', {}, verLL(obj.ll)))));
    };
    m.svg.addEventListener('click', e => {
      if (bloq) return; bloq = true;
      const p = puntoSVG(m.svg, e), [lon, lat] = inversa(p.x, p.y);
      const bien = Math.abs(lat - obj.ll[0]) <= .6 && Math.abs(lon - obj.ll[1]) <= .6;
      const [x, y] = proy(obj.ll[1], obj.ll[0]);
      marcar(m.capas.puntos, p.x, p.y, 'marca', 7);
      marcar(m.capas.puntos, x, y, 'punto', 6); rotulo(m.capas.rotulos, x, y - 12, obj.n);
      r.n++; if (bien) { r.ok++; chispas(e.clientX, e.clientY); } else aviso(`Has tocado ${verLL([lat, lon])}`);
      anotarCoord('coord', bien);
      Mz.t = setTimeout(preg, bien ? 1300 : 2600);
    });
    preg(); return;
  }
}
function mapaMundo() {
  const svg = s('svg', { class: 'mapa', viewBox: '-28 -16 776 392', role: 'img', 'aria-label': 'Mapa del mundo' });
  svg.append(s('rect', { class: 'mar', x: 0, y: 0, width: 720, height: 360 }));
  for (let lon = -180; lon <= 180; lon += 10) {
    const x = (lon + 180) * 2;
    svg.append(s('line', { class: 'reticula' + (lon === 0 ? ' fuerte' : ''), x1: x, x2: x, y1: 0, y2: 360 }));
    if (lon % 40 === 0) svg.append(s('text', { class: 'grad', x, y: -5, 'text-anchor': 'middle' }, lon === 0 ? '0°' : `${Math.abs(lon)}°${lon < 0 ? 'O' : 'E'}`));
  }
  for (let lat = -80; lat <= 80; lat += 10) {
    const y = (90 - lat) * 2;
    svg.append(s('line', { class: 'reticula' + (lat === 0 ? ' fuerte' : ''), x1: 0, x2: 720, y1: y, y2: y }));
    if (lat % 20 === 0) svg.append(s('text', { class: 'grad', x: -4, y: y + 3, 'text-anchor': 'end' }, lat === 0 ? '0°' : `${Math.abs(lat)}°${lat < 0 ? 'S' : 'N'}`));
  }
  svg.append(s('g', {}, MP.mundo.map(d => s('path', { d, fill: '#f6efe2', stroke: '#cfc5b4', 'stroke-width': .4 }))));
  const capa = s('g'); svg.append(capa);
  return { svg, capa, xy: (lat, lon) => [(lon + 180) * 2, (90 - lat) * 2] };
}
function mundo(sub, zona) {
  const W = mapaMundo(), panel = h('div', { style: 'display:grid;gap:14px' });
  zona.append(panel, cajaMapa(W.svg));
  const r = nuevaRonda(); let obj;
  const aleatorio = () => [10 * Math.round(Math.random() * 15 - 7), 10 * Math.round(Math.random() * 32 - 16)];
  if (sub === 'mundo') {
    const preg = () => {
      if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
      W.capa.replaceChildren(); obj = aleatorio();
      const [x, y] = W.xy(...obj); marcar(W.capa, x, y, 'punto pulso', 5);
      const ent = entradaCoord(), res = h('div'), btn = h('button', { class: 'btn' }, 'Comprobar');
      btn.onclick = () => {
        const v = ent.valor(); if (v.vacio) { temblar(ent.el); return; }
        const bien = Math.abs(v.lat - obj[0]) <= 2 && Math.abs(v.lon - obj[1]) <= 2;
        r.n++; if (bien) { r.ok++; chispasEn(btn); } else temblar(ent.el); anotarCoord('coord', bien);
        const t = (v, p, n) => v === 0 ? '0°' : `${Math.abs(v)}° ${v > 0 ? p : n}`;
        res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Correcto!' : 'Revisa'), h('span', { class: 'peq' }, `El punto está en ${t(obj[0], 'N', 'S')} · ${t(obj[1], 'E', 'O')}.`)));
        btn.textContent = 'Siguiente'; btn.onclick = preg;
      };
      panel.replaceChildren(h('div', { class: 'glass tarjeta' },
        h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, 'Latitud y longitud del punto (cuadrícula de 10°)'), marcador(r)),
        ent.el, h('div', { class: 'fila' }, btn), res));
    };
    preg(); return;
  }
  // ¿Cuál está más…? Cuatro puntos con letra; una sola respuesta posible
  const PREG = [['meridional', 'más meridional (al sur)', p => -p[0]], ['septentrional', 'más septentrional (al norte)', p => p[0]], ['occidental', 'más occidental (al oeste)', p => -p[1]], ['oriental', 'más oriental (al levante)', p => p[1]]];
  const preg = () => {
    if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
    W.capa.replaceChildren();
    const [, txt, f] = azar(PREG);
    let pts; do { pts = Array.from({ length: 4 }, aleatorio); } while (new Set(pts.map(f)).size < 4 || new Set(pts.map(String)).size < 4);
    const mejor = pts.reduce((a, b) => f(b) > f(a) ? b : a);
    const letras = 'ABCD';
    pts.forEach((p, i) => { const [x, y] = W.xy(...p); marcar(W.capa, x, y, 'punto', 5); W.capa.append(s('text', { class: 'rotulo', x: x + 10, y: y - 6 }, letras[i])); });
    const res = h('div');
    panel.replaceChildren(h('div', { class: 'glass tarjeta' },
      h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, 'Mira las coordenadas de cada punto'), marcador(r)),
      h('p', { class: 'pregunta' }, '¿Qué punto es el ', h('em', {}, txt), '?'),
      h('div', { class: 'chips' }, pts.map((p, i) => h('button', { class: 'chip', onclick: e => {
        if (res.children.length) return;
        const bien = p === mejor; r.n++; if (bien) { r.ok++; chispasEn(e.currentTarget); } else temblar(e.currentTarget); anotarCoord('coord', bien);
        const g = (v, p, n) => v === 0 ? '0°' : `${Math.abs(v)}° ${v > 0 ? p : n}`;
        const t = q => `${g(q[0], 'N', 'S')} · ${g(q[1], 'E', 'O')}`;
        res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Sí!' : `Era el ${letras[pts.indexOf(mejor)]}`),
          h('span', { class: 'peq' }, pts.map((q, j) => `${letras[j]}: ${t(q)}`).join(' · ')), h('button', { class: 'btn', style: 'justify-self:start;margin-top:6px', onclick: preg }, 'Siguiente')));
      } }, letras[i]))), res));
  };
  preg();
}
function teoria(filas) {
  return h('div', { style: 'display:grid;gap:10px' }, filas.map(([a, b], i) =>
    h('div', { class: 'glass tarjeta', style: `animation:llega .6s var(--muelle) ${i * 0.06}s both;gap:4px` }, h('h3', {}, a), h('p', { class: 'mut' }, b))));
}

// ---------- ESCALAS ----------
function escalas(sub, zona) {
  if (sub === 'teoria') return zona.append(teoria(TEORIA_ESCALA));
  const fmt = n => n.toLocaleString('es-ES');
  const r = nuevaRonda(); const panel = h('div', { style: 'display:grid;gap:14px' }); zona.append(panel);
  const DEN = [100000, 200000, 250000, 500000, 1000000, 2000000, 2500000, 5000000, 10000000];
  const caps = Object.values(PROVINCIAS).filter(p => p.ll[0] > 35.5);
  const generar = () => {
    const tipo = Math.floor(Math.random() * 4), N = azar(DEN), cmKm = N / 100000;
    if (tipo === 0) { const d = Math.round((1 + Math.random() * 14) * 2) / 2; return { p: `En un mapa a escala 1:${fmt(N)}, dos ciudades están a ${coma(d)} cm. ¿Cuál es la distancia real?`, sol: d * cmKm, ud: 'km', exp: `1 cm = ${fmt(cmKm)} km → ${coma(d)} × ${fmt(cmKm)} = ${fmt(Math.round(d * cmKm * 100) / 100)} km` }; }
    if (tipo === 1) { const d = Math.round((1 + Math.random() * 14) * 2) / 2; return { p: `Dos puntos separados ${fmt(d * cmKm)} km en la realidad aparecen a ${coma(d)} cm en el mapa. ¿Cuál es el denominador de la escala (1:…)?`, sol: N, ud: '', exp: `${fmt(d * cmKm)} km = ${fmt(d * cmKm * 100000)} cm; ${fmt(d * cmKm * 100000)} ÷ ${coma(d)} = ${fmt(N)} → 1:${fmt(N)}` }; }
    if (tipo === 2) return { p: `En la escala gráfica, cada centímetro equivale a ${fmt(cmKm)} km. ¿Cuál es la escala numérica (1:…)?`, sol: N, ud: '', exp: `${fmt(cmKm)} km = ${fmt(N)} cm → 1:${fmt(N)}` };
    let a, b; do { a = azar(caps); b = azar(caps); } while (a === b || kmEntre(a.ll, b.ll) < 150);
    const real = kmEntre(a.ll, b.ll), Nm = 5000000, cm = Math.round(real / 50 * 10) / 10;
    return { p: `En un mapa a escala 1:5.000.000, ${a.cap} y ${b.cap} están a ${coma(cm)} cm en línea recta. ¿Cuál es la distancia real?`, sol: cm * 50, ud: 'km', exp: `1 cm = 50 km → ${coma(cm)} × 50 = ${fmt(Math.round(cm * 50))} km (en la realidad, unos ${fmt(Math.round(real))} km)` };
  };
  const preg = () => {
    if (r.n >= r.total) { finRonda(panel, r, () => pintarSub()); return; }
    const q = generar();
    const inp = h('input', { type: 'text', inputmode: 'decimal', placeholder: q.ud ? 'Respuesta en km' : 'Denominador, p. ej. 1.000.000', autocomplete: 'off' });
    const res = h('div'), btn = h('button', { class: 'btn' }, 'Comprobar');
    const corregir = () => {
      const t = inp.value.replace(/^\s*1\s*:\s*/, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
      const v = parseFloat(t); if (isNaN(v)) { temblar(inp); return; }
      const bien = Math.abs(v - q.sol) <= q.sol * .03;
      r.n++; if (bien) { r.ok++; chispasEn(btn); } else temblar(inp); anotarCoord('escala', bien);
      res.replaceChildren(h('div', { class: 'veredicto ' + (bien ? 'ok' : 'mal') }, h('b', {}, bien ? '¡Correcto!' : `Solución: ${q.ud ? fmt(Math.round(q.sol * 100) / 100) + ' km' : '1:' + fmt(q.sol)}`), h('span', { class: 'peq' }, q.exp)));
      btn.textContent = 'Siguiente'; btn.onclick = preg; inp.readOnly = true;
    };
    btn.onclick = corregir;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.readOnly ? preg() : corregir(); } });
    panel.replaceChildren(h('div', { class: 'glass tarjeta' },
      h('div', { class: 'fila', style: 'justify-content:space-between' }, h('span', { class: 'mut peq' }, 'Escalas'), marcador(r)),
      h('p', { class: 'pregunta', style: 'font-size:1.1rem' }, q.p), h('div', { class: 'fila', style: 'flex-wrap:nowrap' }, inp, btn), res));
    inp.focus({ preventScroll: true });
  };
  preg();
}
