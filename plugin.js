
// Plugin de Kino para leer obras de yuri-online.com
// Interfaz tipo lector de manga (Kototoro): Inicio, Biblioteca,
// Favoritos, Historial, detalle de obra con lista completa de
// capítulos (AJAX de Madara) y lector webcómic vertical.
// Funciona en teléfono y TV desde el mismo árbol de nodos.
//
// Requiere Kino 0.9.74 o superior (apiVersion 14, capability "screen").

const BASE = "https://yuri-online.com";

// ---------------------------------------------------------------- red

async function getHtml(path) {
  const r = await kino.fetch(BASE + path, { headers: { Accept: "text/html" } });
  if (!r.ok) throw kino.error("network", "HTTP " + r.status, {
    userMessage: "No se pudo conectar con Yuri Online. Inténtalo de nuevo.",
  });
  return r.text();
}

// ------------------------------------------------------------- scraping

function clean(s) {
  return String(s)
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ").trim();
}

// Tarjetas de obras: <a href=".../manga/slug/"><img src="poster">… <a href>Título</a>
function seriesCards(html, max) {
  const out = [];
  const seen = {};
  const re = /href="(https:\/\/yuri-online\.com\/manga\/([a-z0-9][a-z0-9-]+)\/)"/g;
  let m;
  while ((m = re.exec(html)) !== null && out.length < (max || 40)) {
    const url = m[1], slug = m[2];
    if (seen[slug] || slug === "page") continue;
    seen[slug] = true;
    const win = html.slice(m.index, m.index + 2500);
    const im = win.match(/<img[^>]+(?:data-src|src)="(https:\/\/yuri-online\.com\/wp-content\/uploads\/[^"]+)"/);
    // marcador 18+ justo antes de la tarjeta
    const before = html.slice(Math.max(0, m.index - 250), m.index);
    const adult = /18\+/.test(before) || /18\+/.test(win.slice(0, 300));
    let title = "";
    const tre = new RegExp('href="' + url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + '"[^>]*>([^<]{1,150})<', "g");
    let t;
    while ((t = tre.exec(win)) !== null) {
      const txt = clean(t[1]);
      if (txt.length > 1) { title = txt; break; }
    }
    out.push({ slug, url, poster: im ? im[1] : "", title: title || slug.replace(/-/g, " "), adult });
  }
  return out;
}

// Capítulos de una obra: enlaces .../manga/<slug>/capitulo-<n>/
function chapterList(html, slug) {
  const map = new Map();
  const re = new RegExp(
    'href="(https?:\\/\\/yuri-online\.com\/manga\/' + slug +
    '\/capitulo-([a-z0-9][a-z0-9-]*)\/)"[^>]*>([^<]{0,80})<', "g");
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1], tail = m[2], txt = clean(m[3]);
    if (!map.has(url)) map.set(url, { url, tail, title: txt || "Capítulo " + tail });
  }
  const arr = [...map.values()];
  arr.sort((a, b) => natCmp(a.tail, b.tail));
  return arr;
}

function natCmp(a, b) {
  const A = a.match(/\d+|\D+/g) || [], B = b.match(/\d+|\D+/g) || [];
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] || "", y = B[i] || "";
    if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
      const d = parseInt(x, 10) - parseInt(y, 10);
      if (d) return d;
    } else {
      const c = x.localeCompare(y);
      if (c) return c;
    }
  }
  return 0;
}

// Contenido 18+: sin bloqueo; solo se marca la portada con un aviso pequeño

// Metadatos de la página de una obra
function seriesMeta(html) {
  const pick = (re) => { const m = html.match(re); return m ? clean(m[1]) : ""; };
  const h1 = html.indexOf("<h1");
  const adult = h1 >= 0 && /18\+/.test(html.slice(Math.max(0, h1 - 400), h1));
  return {
    title: pick(/<h1[^>]*>([^<]{1,200})</) || pick(/property="og:title"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:title"/),
    poster: pick(/property="og:image"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:image"/),
    overview: pick(/property="og:description"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:description"/),
    status: labelValue(html, "Estado"),
    genres: labelValue(html, "Género(s)"),
    type: labelValue(html, "Tipo de obra"),
    adult,
  };
}

function labelValue(html, label) {
  const i = html.indexOf(label);
  if (i < 0) return "";
  const win = html.slice(i + label.length, i + label.length + 600);
  const m = win.match(/>([^<]{1,200})</);
  return m ? clean(m[1]) : "";
}

// Imágenes de un capítulo (servidas por el mismo dominio, /__img/…).
// Devuelve { url, w, h }. El escaneo se hace sobre el HTML en bruto (no
// solo etiquetas <img>: algunos temas cargan las páginas desde un script),
// limitado al bloque de lectura cuando existe. Las dimensiones en píxeles
// se buscan cerca de cada URL (width=/height= en la misma etiqueta).
function readerImages(html) {
  // ventana de lectura: las páginas del capítulo viven aquí; así no se
  // cuelan banners ni portadas de otras obras
  let win = html;
  const i = html.indexOf('class="reading-content"');
  if (i >= 0) win = html.slice(i, i + 400000);
  const dims = (at) => {
    const w = parseInt((html.slice(Math.max(0, at - 300), at + 300).match(/\bwidth="(\d+)"/) || [])[1], 10) || 0;
    const h = parseInt((html.slice(Math.max(0, at - 300), at + 300).match(/\bheight="(\d+)"/) || [])[1], 10) || 0;
    return { w, h };
  };
  const collect = (winHtml, reSrc) => {
    const out = [], seen = {};
    const re = new RegExp(reSrc, "g");
    let m;
    while ((m = re.exec(winHtml)) !== null) {
      if (seen[m[1]]) continue;
      seen[m[1]] = true;
      const d = dims(m.index + m[0].indexOf(m[1]));
      out.push({ url: m[1], w: d.w, h: d.h });
    }
    return out;
  };
  const IMG_RE = '(https:\\/\\/yuri-online\\.com\\/__img\\/[A-Za-z0-9_\\/.%-]+?\\.(?:jpe?g|png|webp|avif))';
  let out = collect(win, IMG_RE);
  if (!out.length) out = collect(win, '(https:\\/\\/yuri-online\\.com\\/wp-content\\/uploads\\/[^"\'\\s>]+?\\.(?:jpe?g|png|webp))');
  // última carta: en toda la página (algunos temas referencian las páginas
  // solo desde un script fuera del bloque de lectura)
  if (!out.length) out = collect(html, IMG_RE);
  return out;
}

// Caja (dp) para una página de proporción r = alto/ancho: Kino solo acepta
// tamaños de su escala, así que se busca el par ancho×alto de la escala cuya
// proporción más se acerque a la real (recorte mínimo, a menudo cero).
const SIZE_SCALE = [16, 24, 32, 40, 48, 64, 80, 96, 120, 160, 200, 240, 320, 400, 480, 560, 640];

function pageBox(r, wCap, hCap) {
  if (!isFinite(r) || r <= 0) return null;
  for (const tol of [0.02, 0.05, 0.12, 0.25]) {
    let best = null;
    for (const w of SIZE_SCALE) {
      if (w > wCap || w < 80) continue;
      for (const h of SIZE_SCALE) {
        if (h > hCap || h < 96) continue;
        const err = Math.abs(h / w - r) / r;
        if (err <= tol) {
          const a = w * h;
          if (!best || a > best.a || (a === best.a && err < best.err)) best = { w, h, a, err };
        }
      }
    }
    if (best) return { width: best.w, height: best.h };
  }
  return null;
}

// Caja grande para ventanas medianas/anchas (celular horizontal, TV):
// se prioriza el área (página grande, casi sin márgenes) aceptando una
// tolerancia de proporción algo mayor (el recorte que causa es mínimo).
function pageBig(r) {
  if (!isFinite(r) || r <= 0) return null;
  let best = null;
  for (const w of SIZE_SCALE) {
    if (w < 240 || w > 640) continue;
    for (const h of SIZE_SCALE) {
      if (h < 320 || h > 640) continue;
      const err = Math.abs(h / w - r) / r;
      if (err > 0.12) continue;
      const a = w * h;
      if (!best || a > best.a) best = { w, h, a };
    }
  }
  return best ? { width: best.w, height: best.h } : null;
}

// Cajas por página (devuelve un array: en vertical grande son dos nodos,
// uno por tamaño). El Image de Kino no tiene modo «ajustar»: siempre rellena
// su caja recortando (cover) y los anchos altos son solo los de su escala.
// - compact (teléfono vertical): caja exacta a la proporción real (sin recorte)
// - medium/expanded (TV, celular horizontal): página GRANDE a 640 de ancho
//   con proporción 2:3 cuando la página es vertical — llena la pantalla
// ratioGuia: proporción mediana del capítulo; la usan las páginas que
// no traen dimensiones (en vez de la caja genérica de siempre).
// v1.4.2: fit "width" + aspect de la proporción medida (receta de
// MangaTrack, Kino 0.9.81): la página toma el ancho completo de la caja
// y el ALTO propio de su proporción real — la página vertical entera,
// nunca recortada. fill true para que la caja sea el ancho de pantalla.
function aspectDe(p, ratioGuia) {
  const w = (p && p.w) || 0, h = (p && p.h) || 0;
  let ratio = w > 0 && h > 0 ? h / w : (ratioGuia || 1.4);
  if (!(ratio >= 0.2)) ratio = 0.2;
  if (ratio > 5) ratio = 5;
  return "1:" + (Math.round(ratio * 100) / 100);
}

function pageNodes(p, i, ratioGuia) {
  return [{
    type: "Image", key: "p" + i, url: typeof p === "string" ? p : p.url,
    alt: "Página " + (i + 1), altEn: "Page " + (i + 1),
    fill: true, fit: "width", aspect: aspectDe(p, ratioGuia),
    fallback: { type: "Column", padding: 16, children: [
      { type: "Text", text: "Página " + (i + 1), textEn: "Page " + (i + 1), color: "muted" } ] },
  }];
}

// Carga una obra: página de detalle + lista COMPLETA de capítulos.
// El listado completo no está en el HTML: Madara lo sirve por AJAX
// (POST a /manga/<slug>/ajax/chapters/). Se usa el AJAX y, si falla,
// lo que aparezca en el propio HTML de la página.
async function loadSeries(slug) {
  const html = await getHtml("/manga/" + slug + "/");
  const meta = seriesMeta(html);
  let chapters = chapterList(html, slug);
  try {
    const r = await kino.fetch(BASE + "/manga/" + slug + "/ajax/chapters/", {
      method: "POST",
      headers: { "Accept": "text/html", "X-Requested-With": "XMLHttpRequest" },
      body: { form: {} },
    });
    if (r.ok) {
      const t = await r.text();
      const ajax = chapterList(t, slug);
      if (ajax.length > chapters.length) chapters = ajax;
    }
  } catch (e) { kino.log("chapters", "ajax falló: " + e.message); }
  return { slug, meta, chapters };
}

// ------------------------------------------------- medir páginas
// Receta de MangaTrack: descargar solo los primeros bytes de cada
// imagen (kino.fetch maxBytes) y leer sus dimensiones del encabezado
// (JPEG/PNG/GIF). Así las páginas sin width/height en el HTML también
// quedan medidas y la caja calza con su proporción real.
function deB64(s) {
  const ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const out = [];
  let acc = 0, bits = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ABC.indexOf(s.charAt(i));
    if (v < 0) continue;
    acc = (acc * 64) + v;
    bits += 6;
    if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xFF); acc = acc % Math.pow(2, bits); }
  }
  return out;
}

function dimsDeBytes(b) {
  if (!Array.isArray(b) || b.length < 12) return null;
  if (b[0] === 0xFF && b[1] === 0xD8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m === 0x01 || (m >= 0xD0 && m <= 0xD9)) { i += 2; continue; }
      const len = (b[i + 2] << 8) | b[i + 3];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
        return { w: (b[i + 7] << 8) | b[i + 8], h: (b[i + 5] << 8) | b[i + 6] };
      }
      if (m === 0xDA) break;
      i += 2 + len;
    }
    return null;
  }
  if (b[0] === 0x89 && b[1] === 0x50) {
    return { w: (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19],
      h: (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23] };
  }
  if (b[0] === 0x47 && b[1] === 0x49) return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
  return null;
}

function hashUrl(u) {
  let h = 5381;
  for (let i = 0; i < u.length; i++) h = ((h * 33) + u.charCodeAt(i)) >>> 0;
  return ("0000000" + h.toString(16)).slice(-8);
}

function dimsTodas() { return getJson("dims", {}); }

function dimPut(nuevos) {
  try {
    const all = dimsTodas();
    for (let i = 0; i < nuevos.length; i++) all[nuevos[i][0]] = nuevos[i][1];
    const ks = Object.keys(all);
    if (ks.length > 300) for (let i = 0; i < ks.length - 300; i++) delete all[ks[i]];
    setJson("dims", all);
  } catch (e) { kino.log("dims", "guardar: " + e.message); }
}

async function dimsDeImagen(url) {
  try {
    const r = await kino.fetch(url, { maxBytes: 16384, timeoutMs: 5000 });
    if (!r.ok) return null;
    const d = dimsDeBytes(deB64(r.base64()));
    return d && d.w > 0 && d.h > 0 ? d : null;
  } catch (e) { return null; }
}

// Mide (con el caché primero) las páginas que vengan sin dimensiones,
// en lotes de 12 y con tope de tiempo para no eternizar la apertura.
async function medirImagenes(images, presupuesto) {
  const t0 = Date.now();
  const cache = dimsTodas();
  const pend = [];
  let listas = 0;
  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    if (im.w > 0 && im.h > 0) { listas++; continue; }
    const c = cache[hashUrl(im.url)];
    if (Array.isArray(c) && c[0] > 0 && c[1] > 0) { im.w = c[0]; im.h = c[1]; listas++; continue; }
    pend.push(im);
  }
  const nuevas = [];
  let hechas = 0;
  for (let i = 0; i < pend.length && hechas < 48; i += 12) {
    if (Date.now() - t0 > (presupuesto || 6000)) break;
    const lote = pend.slice(i, Math.min(pend.length, i + 12, i + 48 - hechas));
    hechas += lote.length;
    const rs = await Promise.all(lote.map((im) => dimsDeImagen(im.url).catch(() => null)));
    for (let j = 0; j < lote.length; j++) {
      if (rs[j]) {
        lote[j].w = rs[j].w; lote[j].h = rs[j].h;
        listas++;
        nuevas.push([hashUrl(lote[j].url), [lote[j].w, lote[j].h]]);
      }
    }
  }
  if (nuevas.length) dimPut(nuevas);
  return listas;
}

// Proporción mediana de las páginas medidas: la que usan las cajas de
// las páginas sin dimensiones (receta de MangaTrack).
function ratioGuiaDe(pages) {
  const medidas = pages.filter((p) => p && p.w > 0 && p.h > 0).map((p) => p.h / p.w);
  if (!medidas.length) return 0;
  medidas.sort((a, b) => a - b);
  return medidas[parseInt((medidas.length - 1) / 2, 10)];
}

// ------------------------------------------------------------ almacen

function getJson(key, fallback) {
  try {
    const v = kino.storage.get(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function setJson(key, val) {
  try { kino.storage.set(key, JSON.stringify(val)); } catch (e) { kino.log("storage", e.message); }
}
function favs() { return getJson("favs", []); }
function isFav(slug) { return favs().some((f) => f.slug === slug); }
function progress() { return getJson("prog", {}); }

function markRead(slug, title, poster, chTitle, url) {
  const p = progress();
  p[slug] = { title, poster, chTitle, url, ts: Date.now() };
  setJson("prog", p);
  syncPush("prog", p);
}

// ------------------------------------------------ sincronización (kino.shared)
// Los favoritos y el progreso viajan entre los aparatos vinculados de la
// persona: el teléfono escribe y la TV lee al abrir la pantalla (y al revés).
// Los valores leídos NO son de confianza: otro aparato (quizá con otra
// versión del plugin) los escribió, así que se valida cada campo.

function syncPush(key, val) {
  try {
    if (typeof kino.shared === "object" && kino.shared !== null) kino.shared.set(key, val);
  } catch (e) { kino.log("sync", e.message); }
}

function syncPull() {
  try {
    if (typeof kino.shared !== "object" || kino.shared === null) return;
    const sf = kino.shared.get("favs");
    if (Array.isArray(sf)) {
      const local = favs();
      const have = {};
      for (const f of local) have[f.slug] = true;
      let changed = false;
      for (const f of sf.slice(0, 200)) {
        if (!f || typeof f !== "object" || typeof f.slug !== "string") continue;
        if (!/^[a-z0-9][a-z0-9-]*$/.test(f.slug) || have[f.slug]) continue;
        local.push({ slug: f.slug, title: String(f.title || f.slug).slice(0, 200),
          poster: typeof f.poster === "string" ? f.poster.slice(0, 500) : "" });
        have[f.slug] = true; changed = true;
      }
      if (changed) { setJson("favs", local); syncPush("favs", local); }
    }
    const sp = kino.shared.get("prog");
    if (sp && typeof sp === "object" && !Array.isArray(sp)) {
      const p = progress();
      let changed = false;
      for (const k of Object.keys(sp).slice(0, 200)) {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(k)) continue;
        const e = sp[k];
        if (!e || typeof e !== "object" || typeof e.url !== "string" || typeof e.ts !== "number") continue;
        if (p[k] && (p[k].ts || 0) >= e.ts) continue;
        p[k] = { title: String(e.title || k).slice(0, 200),
          poster: typeof e.poster === "string" ? e.poster.slice(0, 500) : "",
          chTitle: String(e.chTitle || e.url).slice(0, 200),
          url: e.url.slice(0, 500), ts: e.ts };
        changed = true;
      }
      if (changed) { setJson("prog", p); syncPush("prog", p); }
    }
  } catch (e) { kino.log("sync", e.message); }
}

// caché de lector (últimos capítulos abiertos), para no volver a pedir
function readerCache(url) { return getJson("rc:" + url, null); }function readerCachePut(url, images) {
  try {
    const keys = kino.storage.keys().filter((k) => k.indexOf("rc:") === 0);
    if (keys.length > 4) for (const k of keys.slice(0, keys.length - 4)) kino.storage.remove(k);
  } catch (e) { /* la app vieja no lista */ }
  setJson("rc:" + url, images);
}

// ----------------------------------------------------------- interfaz

const TABS = [
  { value: "inicio", label: "Inicio", labelEn: "Home" },
  { value: "biblioteca", label: "Biblioteca", labelEn: "Library" },
  { value: "favoritos", label: "Favoritos", labelEn: "Favourites" },
  { value: "historial", label: "Historial", labelEn: "History" },
];

// Una obra como tarjeta PROPIA (Card + Image), nunca un KinoItem: los
// ítems de Kino son títulos de su catálogo de video (kind: "movie") y su
// toque abría la obra como película en vez de mandarla al lector. El toque
// de esta tarjeta manda el evento "openSeries", que CARGA la obra y la
// entra como ruta EMPUJADA (route: { push: "detail" }): así el botón Atrás
// de Kino retrocede de verdad (detalle -> pestañas) en vez de cerrar el
// lienzo. En un riel horizontal la imagen lleva ancho fijo.
// Título partido en dos filas: maxLines recorta en una sola línea y deja un
// hueco; repartimos las palabras alrededor del centro del texto.
function twoLines(t) {
  const s = (t || "").trim();
  if (s.length <= 26) return [s];
  const mid = Math.ceil(s.length / 2);
  let cut = -1, best = 999;
  for (let i = 8; i < s.length - 3; i++) {
    if (s[i] === " ") { const d = Math.abs(i - mid); if (d < best) { best = d; cut = i; } }
  }
  if (cut < 0) cut = mid;
  let a = s.slice(0, cut).trim(), b = s.slice(cut).trim();
  if (a.length > 34) a = a.slice(0, 33).trim() + "…";
  if (b.length > 34) b = b.slice(0, 33).trim() + "…";
  return [a, b];
}

function posterCard(it, prefix, rail) {
  const img = {
    type: "Image", url: it.poster || "", aspect: "2:3",
    alt: it.title, altEn: it.title,
    fallback: { type: "Column", padding: 16, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "list", color: "muted" } ] },
  };
  if (rail) img.width = 120;
  return {
    type: "Card", key: prefix + it.slug, flush: true,
    onTap: { event: "openSeries", arg: it.slug },
    children: [img].concat(twoLines(it.title).map((ln) => (
      { type: "Text", text: ln, textEn: ln, style: "caption", padding: 8 }))),
  };
}

const EMPTY_LIB = { type: "emptyState", icon: "list", title: "Nada por aquí todavía.", titleEn: "Nothing here yet." };
const EMPTY_FAV = { type: "emptyState", icon: "heart", title: "Marca obras con el corazón para verlas aquí.", titleEn: "Mark works with the heart to see them here." };

function titleGridOf(items, eventMore, loading, done, emptyNode) {
  if (!items || !items.length) return emptyNode || EMPTY_LIB;
  // ListView con columns: rejilla perezosa (onEndReached para paginar) sin
  // los KinoItem de video de titleGrid
  const list = {
    type: "ListView", key: "grid",
    columns: { compact: 3, medium: 4, expanded: 6 },
    items: items.map((it) => posterCard(it, "c-")),
  };
  if (eventMore && !done) {
    list.onEndReached = { event: eventMore };
    list.loadingMore = loading === true;
  } else {
    list.done = true;
  }
  return list;
}

function historyList() {
  const p = progress();
  const rows = Object.keys(p).map((slug) => ({ slug, p: p[slug] }))
    .sort((a, b) => b.p.ts - a.p.ts).slice(0, 50);
  if (!rows.length) {
    return { type: "emptyState", icon: "schedule", title: "Todavía no has leído nada.", titleEn: "You have not read anything yet." };
  }
  return {
    type: "ListView", key: "hist",
    items: rows.map((r) => ({
      type: "ListTile", key: "h-" + r.slug,
      title: r.p.title || r.slug,
      subtitle: r.p.chTitle || "", subtitleEn: r.p.chTitle || "",
      leading: { type: "CircleAvatar", image: r.p.poster, icon: "list" },
      onTap: { event: "openSeries", arg: r.slug },
    })),
  };
}

async function tabBody(state) {
  const tab = state.tab || "inicio";
  if (tab === "favoritos") return titleGridOf(favs(), null, false, true, EMPTY_FAV);
  if (tab === "historial") return historyList();
  if (tab === "biblioteca") {
    const items = Array.isArray(state.libItems) ? state.libItems : await fetchLibrary(1);
    return titleGridOf(items, "libMore", state.libLoading === true, state.libDone === true);
  }
  return await homeBody(state);
}

async function fetchLibrary(page) {
  const html = await getHtml("/manga/page/" + page + "/");
  return seriesCards(html, 36);
}

// Inicio: una fila de tarjetas de Kino con lo más reciente
async function homeBody(state) {
  let items = Array.isArray(state.inicioItems) ? state.inicioItems : null;
  if (!items) {
    const html = await getHtml("/");
    items = seriesCards(html, 30);
  }
  if (!items.length) return EMPTY_LIB;
  // riel horizontal de tarjetas propias (sin titleRail: sus items son
  // títulos de video de Kino)
  const rail = (title, titleEn, key, list) => list.length ? [
    { type: "Text", text: title, textEn: titleEn, style: "h3", padding: 16 },
    { type: "SingleChildScrollView", key: key, direction: "horizontal", padding: 16,
      children: [{ type: "Row", gap: 8, children: list.slice(0, 60).map((it) => posterCard(it, key + "-", true)) }] },
  ] : [];
  return {
    type: "SingleChildScrollView", key: "home", flex: 1,
    children: [{
      type: "Column", children: [
        // búsqueda siempre visible también desde Inicio (no solo la barra)
        { type: "ListTile", key: "searchTile", leading: { type: "Icon", name: "search" },
          title: "Buscar obra", titleEn: "Search a work",
          subtitle: "Por título, p. ej. Trash Flower", subtitleEn: "By title, e.g. Trash Flower",
          trailing: { type: "Icon", name: "arrow_forward" },
          onTap: { event: "goSearch" } },
      // favoritos siempre a mano, debajo de las últimas obras
      ].concat(rail("Últimas obras", "Latest works", "latest", items))
        .concat(rail("Mis favoritos", "My favourites", "favs", favs())),
    }],
  };
}

// ------------------------------------------------------------- rutas

function routeSlug(r) {
  if (!r) return "";
  return String((r.args && r.args.slug) || (r.params && r.params.slug) || r.slug || "");
}

function loadingTree(msg) {
  return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children: [
    { type: "CircularProgressIndicator" },
    { type: "Text", text: msg || "Cargando…", textEn: "Loading…", color: "muted" },
  ] };
}

async function detailTree(state) {
  const d = state.detail;
  if (!d) return loadingTree();
  const fav = isFav(d.slug);
  if (!Array.isArray(d.chapters) || !d.chapters.length) {
    return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "error", color: "muted" },
      { type: "Text", text: "No se encontraron capítulos para esta obra.", textEn: "No chapters found for this work.", color: "muted" },
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Volver", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
    ] };
  }
  // Portada en caja 2:3 con ancho acotado: un póster casi siempre es 2:3,
  // así la caja coincide con la imagen y no hay recorte (Image de Kino
  // siempre rellena su caja recortando: sin caja exacta, siempre corta).
  const cover = d.meta.poster
    ? { type: "Image", url: d.meta.poster, width: { compact: 120, expanded: 160 },
        aspect: "2:3", alt: d.meta.title,
        fallback: { type: "Icon", name: "list" } }
    : { type: "Icon", name: "list" };
  const head = {
    type: "Row", gap: 16, padding: 16, crossAxisAlignment: "start", stackOnNarrow: true,
    children: [
      cover,
      { type: "Column", gap: 6, flex: 2, crossAxisAlignment: "start", children: [
        { type: "Text", text: d.meta.title || d.slug, style: "h2" },
        d.meta.type ? { type: "Text", text: d.meta.type, color: "muted" } : null,
        d.meta.status ? { type: "Badge", text: d.meta.status } : null,
        d.meta.adult ? { type: "Badge", text: "18+", color: "error" } : null,
        d.meta.genres ? { type: "Text", text: "Géneros: " + d.meta.genres, textEn: "Genres: " + d.meta.genres, color: "muted", style: "caption" } : null,
        { type: "Text", text: d.meta.overview, style: "p", color: "muted" },
        {
          type: "Row", gap: 8, wrap: true, children: [
            (function () {
              const pg = progress()[d.slug];
              const ci = pg && typeof pg.url === "string" ? d.chapters.findIndex((c) => c.url === pg.url) : -1;
              if (ci > 0) {
                const contLabel = ("Continuar: " + (pg.chTitle || d.chapters[ci].title)).slice(0, 60);
                return { type: "ElevatedButton", key: "cont", icon: "play",
                  labelText: contLabel, labelTextEn: contLabel,
                  onPressed: { event: "read", arg: String(ci) } };
              }
              return { type: "ElevatedButton", key: "start", icon: "play",
                labelText: "Empezar a leer", labelTextEn: "Start reading",
                onPressed: { event: "read", arg: "0" } };
            })(),
            { type: "ElevatedButton", key: "latest", icon: "expand_more",
              labelText: "Leer lo último", labelTextEn: "Read latest",
              onPressed: { event: "read", arg: String(d.chapters.length - 1) } },
            { type: "ElevatedButton", key: "fav", icon: fav ? "heart" : "star",
              labelText: fav ? "Quitar de favoritos" : "Añadir a favoritos",
              labelTextEn: fav ? "Remove favourite" : "Add favourite",
              onPressed: "fav" },
          ],
        },
      ].filter(Boolean) },
    ],
  };
  const items = [head];
  items.push({ type: "Text", text: d.chapters.length + " capítulos", textEn: d.chapters.length + " chapters", style: "h3", padding: 16 });
  for (let i = 0; i < d.chapters.length; i++) {
    const c = d.chapters[i];
    items.push({
      type: "ListTile", key: "ch" + i, dense: true,
      title: c.title,
      onTap: { event: "read", arg: String(i) },
      trailing: { type: "Icon", name: "arrow_forward" },
    });
  }
  // El detalle siempre llega como ruta empujada (desde una tarjeta, Historial
  // o búsqueda); Atrás (el de Kino o el del AppBar) saca esa ruta y vuelve a
  // las pestañas con su estado.
  return {
    type: "Scaffold",
    appBar: {
      title: d.meta.title || d.slug,
      leading: { type: "IconButton", key: "backHome", icon: "arrow_back",
        labelText: "Atrás", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
      actions: [],
    },
    body: { type: "ListView", key: "detailBody", items },
  };
}

// contador de navegación entre capítulos: cada visita tiene su propia
// clave de scroll, así el lector siempre arranca en la primera página
let navSeq = 0;

// Lector webcómic: las páginas una bajo la otra en un único scroll
// vertical. Cada página va en una caja del mismo ancho×alto (en dp) que su
// proporción real: el componente Image de Kino no tiene modo «ajustar»
// (siempre rellena la caja recortando), así que la caja debe calzar con
// la página para que se vea entera.
// Modo páginas (Kino 0.9.81, receta de MangaTrack): el widget "pages"
// solo existe si kino.screen.widgets lo anuncia; con un Kino anterior
// el lector sigue siendo la tira vertical de siempre.
function pagesDisponible() {
  try {
    return typeof kino === "object" && kino !== null &&
      typeof kino.screen === "object" && kino.screen !== null &&
      Array.isArray(kino.screen.widgets) &&
      kino.screen.widgets.indexOf("pages") >= 0;
  } catch (e) { return false; }
}

function modoLectorPref() {
  return getJson("modoLector", "tira") === "paginas" ? "paginas" : "tira";
}

// El modo páginas solo procede con el widget disponible y un capítulo
// de 2 a 250 páginas (los límites del widget con progress "bar").
function modoLectorEfectivo(n) {
  const puede = pagesDisponible() && n >= 2 && n <= 250;
  return puede && modoLectorPref() === "paginas" ? "paginas" : "tira";
}

// Una página del modo páginas: fit "width" + aspect medido (página
// vertical entera a ancho completo, sin recortes) dentro de un scroll
// con zoom. Sin fallback: con 250 páginas el árbol superaría los 600
// nodos por pantalla que admite Kino.
function paginaFit(p, i, ratioGuia) {
  return { type: "SingleChildScrollView", key: "z" + i, zoom: true, children: [
    { type: "Image", key: "p" + i, url: typeof p === "string" ? p : p.url,
      alt: "Página " + (i + 1), altEn: "Page " + (i + 1),
      fill: true, fit: "width", aspect: aspectDe(p, ratioGuia) } ] };
}

async function readerTree(state) {
  const r = state.reader;
  if (!r) return loadingTree();
  const pages = r.images || [];
  const chapters = Array.isArray(r.chapters) ? r.chapters : [];
  const ch = chapters[r.idx];
  // estado corrupto o capítulo que ya no existe: mensaje claro en vez de error
  if (!ch || !pages.length) {
    return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "error", color: "muted" },
      { type: "Text", text: "No se pudieron cargar las páginas de este capítulo.", textEn: "Could not load this chapter's pages.", color: "muted" },
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Volver", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
    ] };
  }
  const hasNext = r.idx + 1 < chapters.length;
  const hasPrev = r.idx > 0;
  // clave única por capítulo: al cambiar de capítulo el scroll es un
  // componente nuevo y arranca desde arriba (no hereda la posición anterior)
  const chKey = String(ch ? ch.url : r.idx).replace(/[^a-z0-9]/gi, "").slice(-16);
  // clave única por visita (r.tk cambia en cada cambio de capítulo): el
  // scroll siempre arranca desde la primera página
  const scrollKey = "pages-" + r.idx + "-" + chKey + "-" + (r.tk || 0);
  const ratioGuia = ratioGuiaDe(pages);
  const modo = modoLectorEfectivo(pages.length);
  // Modo pantalla completa (inmersivo): oculta la barra de arriba y los
  // botones de abajo; queda un botoncito flotante discreto (el mismo ojo)
  // para traerlos de vuelta. La preferencia vive en el almacén ("lectorInm").
  const inm = getJson("lectorInm", 0) ? true : false;
  const body = [];
  if (modo === "paginas") {
    // Modo páginas: una página a la vez, se pasa con el dedo, barra de
    // progreso de Kino y zoom por pellizco. La página actual vive en
    // state.inputs.pgs (la posición la guarda el evento pgChanged).
    body.push({
      type: "pages", key: "pgs", flex: 1, progress: "bar", onPageChanged: "pgChanged",
      children: pages.map((p, i) => paginaFit(p, i, ratioGuia)),
    });
  } else {
    // Tira vertical de siempre: páginas pegadas a ancho completo, ahora
    // con zoom de pellizco en todo el capítulo.
    body.push({
      type: "SingleChildScrollView", key: scrollKey, flex: 1, zoom: true,
      children: [{
        type: "Column", gap: 4, crossAxisAlignment: "center", fill: true,
        children: pages.flatMap((p, i) => pageNodes(p, i, ratioGuia)),
      }],
    });
  }
  if (!inm) body.push({
    type: "Row", gap: 12, padding: 16, mainAxisAlignment: "center", wrap: true, children: [
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Anterior", labelTextEn: "Previous",
        onPressed: "prevChap", enabled: hasPrev },
      { type: "DropdownButton", key: "jumpChap", labelText: "Ir a capítulo", labelTextEn: "Go to chapter",
        value: String(r.idx), onChanged: "jumpChap",
        options: chapters.length
          ? chapters.map((c, i) => ({ value: String(i), label: c.title }))
          : [{ value: "0", label: "—" }] },
      { type: "ElevatedButton", labelText: hasNext ? "Siguiente" : "Último capítulo",
        labelTextEn: hasNext ? "Next" : "Last chapter",
        icon: "arrow_forward", onPressed: "nextChap", enabled: hasNext },
    ].concat(pagesDisponible() ? [
      { type: "TextButton", key: "btnModo", labelText: modo === "paginas" ? "Modo tira" : "Modo páginas",
        labelTextEn: modo === "paginas" ? "Strip mode" : "Page mode", onPressed: "modoLector" },
    ] : []).concat([
      { type: "Text",
        text: "cap. " + (r.idx + 1) + " de " + chapters.length + " · pellizca para acercar",
        textEn: "ch. " + (r.idx + 1) + " of " + chapters.length, style: "caption", color: "muted" },
    ]),
  });
  const raiz = {
    type: "Scaffold",
    appBar: inm ? undefined : { title: ch ? ch.title : "Leyendo",
      leading: { type: "IconButton", key: "backFromReader", icon: "arrow_back",
        labelText: "Atrás", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
      actions: [
        { type: "IconButton", key: "verBarra", icon: "visibility",
          labelText: "Pantalla completa (ocultar botones)", labelTextEn: "Fullscreen (hide buttons)",
          onPressed: { event: "lectorInm" } },
      ] },
    body: { type: "Column", children: body },
  };
  // En pantalla completa solo queda el botoncito flotante para volver.
  if (inm) raiz.floatingActionButton = { type: "FloatingActionButton", key: "verBarras",
    icon: "visibility", tooltip: "Mostrar botones", tooltipEn: "Show buttons",
    onPressed: { event: "lectorInm" } };
  return raiz;
}

async function searchTree(state) {
  const q = typeof state.resultsQ === "string" ? state.resultsQ : "";
  const results = Array.isArray(state.results) ? state.results : null;
  return {
    type: "Scaffold",
    appBar: { title: "Buscar obra", titleEn: "Search a work", actions: [] },
    body: {
      type: "SingleChildScrollView", key: "searchBody",
      children: [{
        type: "Column", children: [
          { type: "Form", key: "search", onSubmitted: "search", gap: 8, padding: 16, children: [
            { type: "TextField", key: "q", kind: "search", value: q,
              labelText: "Título", labelTextEn: "Title",
              hintText: "P. ej. Trash Flower", hintEn: "e.g. Trash Flower",
              required: true },
            { type: "ElevatedButton", icon: "search", labelText: "Buscar", labelTextEn: "Search", submit: true },
          ] },
          results
            ? (results.length ? titleGridOf(results) : { type: "emptyState", icon: "search", title: "Sin resultados.", titleEn: "No results." })
            : { type: "Text", text: "Escribe un título y pulsa Buscar.", textEn: "Type a title and press Search.", color: "muted", padding: 16 },
        ].filter(Boolean),
      }],
    },
  };
}

// --------------------------------------------------------- los exports

export async function screen({ state, route }) {
  const r = route || { name: "home" };
  try {
    if (r.name === "detail") {
      const slug = routeSlug(r);
      if (!state.detail || state.detail.slug !== slug) return loadingTree();
      return await detailTree(state);
    }
    if (r.name === "read") return await readerTree(state);
    if (r.name === "search") return searchTree(state);
  } catch (e) {
    return {
      type: "Column", padding: 16, gap: 8, children: [
        { type: "Icon", name: "error", color: "muted" },
        { type: "Text", text: "No se pudo cargar (" + (e.code || "error") + ").", textEn: "Could not load (" + (e.code || "error") + ").", color: "muted" },
        { type: "ElevatedButton", icon: "refresh", labelText: "Reintentar", labelTextEn: "Retry", onPressed: { event: "retry" } },
      ],
    };
  }
  // ruta raíz: pestañas
  const body = await tabBody(state);
  return {
    type: "Scaffold",
    appBar: {
      title: "Yuri Online",
      actions: [
        { type: "IconButton", icon: "search", key: "goSearch", labelText: "Buscar", labelTextEn: "Search", onPressed: { event: "goSearch" } },
      ],
      bottom: {
        type: "TabBar", key: "tabs", tabs: TABS,
        value: state.tab || "inicio", onChanged: { event: "tab" },
      },
    },
    body,
  };
}

export async function screenEvent(ev) {
  const name = ev.name;
  const state = ev.state || {};
  try {
    if (name === "open") {
      // primer evento reservado: al abrir la pantalla de detalle carga la obra
      // y, de paso, se trae lo que los otros aparatos hayan guardado
      syncPull();
      const r = ev.route || {};
      if (r.name === "detail") {
        const slug = routeSlug(r);
        if (slug && /^[a-z0-9][a-z0-9-]*$/.test(slug) && (!state.detail || state.detail.slug !== slug)) {
          const d = await loadSeries(slug);
          if (!d.chapters.length) return { toast: "No se encontraron capítulos." };
          return { state: { detail: d } };
        }
      }
      return null;
    }
    if (name === "tab") {
      const tab = ev.value;
      const patch = { tab };
      if (tab === "biblioteca" && !Array.isArray(state.libItems)) {
        patch.libItems = await fetchLibrary(1);
        patch.libPage = 1;
      }
      return { state: patch };
    }
    if (name === "libMore") {
      const page = (state.libPage || 1) + 1;
      const more = await fetchLibrary(page);
      const merged = (state.libItems || []).concat(more.filter((x) => !(state.libItems || []).some((y) => y.slug === x.slug)));
      return { state: { libItems: merged, libPage: page, libDone: more.length < 12 } };
    }
    if (name === "goSearch") return { route: { push: "search" } };
    if (name === "popBack") return { route: { pop: true } };
    if (name === "search") {
      const q = String(ev.value && ev.value.q || "").trim();
      if (!q) return { toast: "Escribe un título." };
      const html = await getHtml("/?s=" + encodeURIComponent(q) + "&post_type=wp-manga");
      // los resultados vienen tras la barra de orden (m_orderby); antes está el
      // carrusel popular de la portada, que no debe mezclarse con los resultados
      const cut = html.indexOf("m_orderby");
      const results = seriesCards(cut >= 0 ? html.slice(cut) : html, 30);
      return { state: { results, resultsQ: q },
        toast: results.length ? results.length + " resultados" : "Sin resultados" };
    }
    if (name === "retry") return { state: { _r: Date.now() } };
    if (name === "fav") {
      const d = state.detail;
      if (!d) return null;
      const f = favs();
      const i = f.findIndex((x) => x.slug === d.slug);
      let added = false;
      if (i >= 0) f.splice(i, 1);
      else { f.unshift({ slug: d.slug, title: d.meta.title || d.slug, poster: d.meta.poster }); added = true; }
      setJson("favs", f);
      syncPush("favs", f);
      return { toast: added ? "Añadida a favoritos" : "Quitada de favoritos" };
    }
    if (name === "read" || name === "nextChap" || name === "prevChap" || name === "jumpChap") {
      let chapters, idx, slug, title, poster;
      if (name === "read") {
        const d = state.detail;
        if (!d) return null;
        chapters = d.chapters;
        idx = parseInt(String(ev.arg || "0"), 10) || 0;
        slug = d.slug; title = d.meta.title; poster = d.meta.poster;
        if (idx < 0 || idx >= chapters.length) return null;
      } else {
        const r = state.reader;
        if (!r) return null;
        chapters = r.chapters;
        idx = name === "jumpChap"
          ? parseInt(String(ev.value || "0"), 10) || 0
          : r.idx + (name === "nextChap" ? 1 : -1);
        slug = r.slug; title = r.title; poster = r.poster;
        if (idx < 0 || idx >= chapters.length) return null;
      }
      const ch = chapters[idx];
      let images = readerCache(ch.url);
      if (!images) {
        const html = await getHtml(ch.url.replace(BASE, ""));
        images = readerImages(html);
        if (images.length) readerCachePut(ch.url, images);
      }
      if (!images.length) return { toast: "No se encontraron páginas en este capítulo." };
      // Medir las páginas sin dimensiones (cabeceras de imagen por
      // descarga parcial, con caché): así ninguna caja recorta.
      try { await medirImagenes(images, 6000); } catch (e) { kino.log("dims", e.message); }
      markRead(slug, title, poster, ch.title, ch.url);
      const reader = { slug, title, poster, chapters, idx, images, tk: ++navSeq };
      const resp = { state: { reader } };
      if (name === "read") resp.route = { push: "read" };
      // Modo páginas: retomar en la página donde quedó este capítulo
      // (la receta de las docs: un set de ui sobre la key del pages).
      if (modoLectorEfectivo(images.length) === "paginas") {
        let at = parseInt(getJson("pg:" + ch.url, 0), 10);
        if (!(at >= 0) || at >= images.length) at = 0;
        resp.ui = [{ set: { key: "pgs", value: at } }];
      }
      return resp;
    }
    // Página que se está viendo en el modo páginas: se guarda por
    // capítulo para retomarla al volver.
    if (name === "pgChanged") {
      const r = state.reader;
      if (!r) return null;
      const ch = (r.chapters || [])[r.idx];
      if (!ch || !ch.url) return null;
      let at = parseInt(String(ev.value === undefined ? "" : ev.value), 10);
      if (!(at >= 0)) at = 0;
      const ks = [];
      try {
        for (const k of kino.storage.keys()) if (k.indexOf("pg:") === 0) ks.push(k);
      } catch (e) { }
      if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) try { kino.storage.remove(k); } catch (e) { }
      try { kino.storage.set("pg:" + ch.url, String(at)); } catch (e) { }
      return null;
    }
    // Alternar pantalla completa: oculta (o trae de vuelta) la barra de
    // arriba y los botones de abajo del lector.
    if (name === "lectorInm") {
      setJson("lectorInm", getJson("lectorInm", 0) ? 0 : 1);
      return { state: { _r: Date.now() } };
    }
    // Alternar tira/páginas (solo con el widget disponible).
    if (name === "modoLector") {
      if (!pagesDisponible()) return null;
      const nuevo = modoLectorPref() === "paginas" ? "tira" : "paginas";
      setJson("modoLector", nuevo);
      return { state: { _r: Date.now() },
        toast: nuevo === "paginas" ? "Modo páginas" : "Modo tira" };
    }
    if (name === "openSeries") {
      const slug = String(ev.arg || "");
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
      const d = await loadSeries(slug);
      if (!d.chapters.length) return { toast: "No se encontraron capítulos." };
      return { state: { detail: d },
               route: { push: "detail", params: { slug } } };
    }
  } catch (e) {
    return { toast: "Algo falló: " + (e.code || "error") };
  }
  return null;
}
