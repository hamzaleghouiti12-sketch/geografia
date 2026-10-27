// Pruebas del banco de contenido. Ejecutar antes de publicar: node pruebas.js
global.window = global;
require('./datos.js'); require('./datos-mapa.js');
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/app.js', 'utf8');
// Carga las funciones de corrección de app.js sin el resto de la interfaz
eval(src.slice(src.indexOf('function norm'), src.indexOf('// Distancia de edición')).replace(/^const /gm, 'var ').replace(/^function (\w+)/gm, 'var $1 = function'));

const errores = [];
const mal = (m) => errores.push(m);
const nfc = t => typeof t !== 'string' || t === t.normalize('NFC');

// 1. Todas las provincias del mapa tienen ficha, comunidad y coordenadas dentro de España
for (const p of MAPA.prov) {
  const d = PROVINCIAS[p.cod];
  if (!d) { mal('Provincia sin ficha: ' + p.geo); continue; }
  if (!CCAA[p.cc]) mal('Comunidad desconocida: ' + p.cc);
  const [lat, lon] = d.ll;
  if (!(lat > 27 && lat < 44 && lon > -18.5 && lon < 4.5)) mal('Coordenadas fuera de España: ' + d.n);
}
// 2. Las preguntas fijas solo usan provincias existentes y sin repetir
for (const f of FIJAS) {
  if (new Set(f.orden).size !== f.orden.length) mal('Provincia repetida en ' + f.id);
  for (const c of f.orden) if (!PROVINCIAS[c]) mal('Código inexistente en ' + f.id + ': ' + c);
}
// 3. Las provincias fronterizas con Portugal van de norte a sur (latitud de la capital decreciente)
const lats = FIJAS.find(f => f.id === 'portugal').orden.map(c => PROVINCIAS[c].ll[0]);
if (lats.some((l, i) => i && l > lats[i - 1])) mal('Frontera con Portugal: el orden no va de norte a sur');
// 4. Las septentrionales van de oeste a este (longitud de la capital creciente)
const lons = FIJAS.find(f => f.id === 'septentrionales').orden.map(c => PROVINCIAS[c].ll[1]);
if (lons.some((l, i) => i && l < lons[i - 1])) mal('Septentrionales: el orden no va de oeste a este');
// 5. Cada respuesta modelo contiene todas sus ideas clave (si no, la corrección pediría algo que el modelo no dice)
const fuenteU = u => u.form + ' ' + u.relieve + ' ' + (ROQUEDO[u.roq] ? ROQUEDO[u.roq].rocas : '');
for (const c of CONCEPTOS) { const k = comprobar(c.d, c.claves); if (k.no.length) mal(`Concepto «${c.t}»: el modelo no contiene ${k.no.join(', ')}`); }
for (const u of UNIDADES) { const k = comprobar(fuenteU(u), u.claves); if (k.no.length) mal(`Unidad «${u.n}»: el modelo no contiene ${k.no.join(', ')}`); }
for (const p of COMENTARIO.partes) { const k = comprobar(p.modelo, p.claves); if (k.no.length) mal(`Comentario ${p.id}: el modelo no contiene ${k.no.join(', ')}`); }
// 6. Una respuesta vacía o de relleno no puntúa
for (const c of CONCEPTOS) if (comprobar('es una cosa que hay en España', c.claves).r >= .4) mal('Clave demasiado fácil en ' + c.t);
// 7. Conceptos sin repetir, grupos válidos, textos en NFC
const vistos = new Set();
for (const c of CONCEPTOS) {
  if (vistos.has(c.t)) mal('Concepto repetido: ' + c.t); vistos.add(c.t);
  if (!GRUPOS_CONCEPTOS[c.g]) mal('Grupo desconocido en ' + c.t);
  if (c.claves.length < 3) mal('Pocas ideas clave en ' + c.t);
}
for (const f of ['datos.js']) if (!nfc(fs.readFileSync(__dirname + '/' + f, 'utf8'))) mal(f + ' no está en NFC');
// 8. Cada unidad tiene roquedo conocido y geometría
for (const u of UNIDADES) {
  if (!ROQUEDO[u.roq] && u.roq !== 'mixto') mal('Roquedo desconocido en ' + u.id);
  if (!u.linea && !u.zona && !u.centro) mal('Unidad sin geometría: ' + u.id);
}
// 9. El service worker guarda todo lo que enlaza la página
const sw = fs.readFileSync(__dirname + '/sw.js', 'utf8'), html = fs.readFileSync(__dirname + '/index.html', 'utf8');
for (const [, f] of html.matchAll(/(?:src|href)="([^"#:]+)"/g)) if (!sw.includes(`'${f}'`)) mal('Falta en sw.js: ' + f);
for (const f of ['tajogaite.jpg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) if (!fs.existsSync(__dirname + '/' + f)) mal('Falta el archivo ' + f);

if (errores.length) { console.log(errores.join('\n')); console.log(`\n${errores.length} fallo(s): no se puede publicar`); process.exit(1); }
console.log(`Todo correcto: ${CONCEPTOS.length} conceptos, ${UNIDADES.length} unidades, ${MAPA.prov.length} provincias. Se puede publicar.`);
