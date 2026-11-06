// Plugin de Kino para leer obras de yuri-online.com (Yuri Online)
// Interfaz tipo lector de manga: Inicio, Biblioteca, Favoritos,
// Historial, detalle de obra con lista de capítulos (AJAX de Madara)
// y lector webcómic vertical. REESCRITO (v2.0.0) con la arquitectura
// de ZonaTM0, a petición del usuario, para que ambos plugins se
// comporten IGUAL: misma pantalla de inicio, mismos botones y el
// mismo lector SIEMPRE a pantalla completa:
//   - Inicio por categorías: secciones por género (Acción, Comedia,
//     Fantasía, Romance, Drama) debajo de «Seguir leyendo» y «Mis
//     favoritos», sin repetidos y con «Ver más» (v1.2.0 de ZonaTM0).
//   - Nada bloquea la pantalla (patrón MangaTrack): detalle, Inicio y
//     Biblioteca se pintan AL INSTANTE con esqueletos y los datos
//     llegan en segundo plano por el temporizador «every».
//   - Detalle: «Seguir · Cap. N» a todo el ancho, fila secundaria
//     solo con iconos (Favoritos · Actualizar · Olvidar), sinopsis
//     plegable, conmutador «Desde lo último / Desde el principio».
//   - Lector SIEMPRE en pantalla completa (v1.1.6 de ZonaTM0): sin
//     barra propia ni botón flotante; «Anterior»/«Siguiente» están
//     UNA sola vez, en la tarjeta del final del capítulo (y en la
//     barra fina si eliges el modo páginas).
//   - Los capítulos viven en kino.storage (v1.1.2 de ZonaTM0): el
//     estado de la pantalla queda mínimo y las obras largas no
//     desbordan el límite de Kino.
// Capa del sitio (Madara/WordPress, yuri-online.com):
//   - Biblioteca y géneros: /manga/page/N/ y /manga-genre/<slug>/
//   - Ficha de obra:        /manga/<slug>/
//   - Capítulos:            POST /manga/<slug>/ajax/chapters/
//   - Lector:               /manga/<slug>/capitulo-…/ (imágenes /__img/)
// Funciona en teléfono y TV desde el mismo árbol de nodos.
//
// Requiere Kino 0.9.74 o superior (apiVersion 14, capability "screen").

const BASE = "https://yuri-online.com";
const MAX_CAPS = 490; // tope de capítulos por pantalla (Kino admite ~600 nodos)
const LIB_MAX = 144; // tope de obras acumuladas en la Biblioteca (estado pequeño)

// ---------------------------------------------------------------- red

// Todas las peticiones llevan timeoutMs: si el sitio no responde, se
// lanza un error que se muestra con «Reintentar».
async function getHtml(path, timeoutMs) {
  const r = await kino.fetch(BASE + path, {
    headers: { Accept: "text/html", Referer: BASE + "/" },
    timeoutMs: timeoutMs || 20000,
  });
  if (!r.ok) throw kino.error("network", "HTTP " + r.status, {
    userMessage: "No se pudo conectar con Yuri Online. Inténtalo de nuevo.",
  });
  return r.text();
}

// Listados de obras (Madara). Un solo punto de entrada con la misma
// firma que ZonaTM0, para que el resto del plugin no cambie:
//   - gender: slug del género → /manga-genre/<slug>/ (con /page/N/)
//   - q:       búsqueda          → /?s=<q>&post_type=wp-manga
//   - nada:    Biblioteca        → /manga/page/N/
// Devuelve HTML en bruto (seriesCards lo parsea).
async function getLibHtml(page, order, q, gender) {
  const p = parseInt(page, 10) || 1;
  if (gender) {
    return getHtml(p > 1 ? "/manga-genre/" + gender + "/page/" + p + "/"
      : "/manga-genre/" + gender + "/", 25000);
  }
  if (q) {
    return getHtml((p > 1 ? "/page/" + p + "/" : "/") +
      "?s=" + encodeURIComponent(q) + "&post_type=wp-manga", 25000);
  }
  return getHtml("/manga/page/" + p + "/", 25000);
}

// ------------------------------------------------------------- scraping

function clean(s) {
  return String(s)
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ").replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ").trim();
}

// Tarjetas de obras: <a href=".../manga/slug/"><img src="poster">…
// <a href>Título</a>. El «adult» marca el contenido 18+.
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

function natCmp(a, b) {
  const A = String(a).match(/\d+|\D+/g) || [], B = String(b).match(/\d+|\D+/g) || [];
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

// Capítulos de una obra: enlaces .../manga/<slug>/capitulo-<n>/
// Devuelve [{ url, tail, num, title }] orden natural.
function chapterList(html, slug) {
  const map = new Map();
  const re = new RegExp(
    'href="(https?:\/\/yuri-online\.com\/manga\/' + slug +
    '\/capitulo-([a-z0-9][a-z0-9-]*)\/)"[^>]*>([^<]{0,80})<', "g");
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1], tail = m[2], txt = clean(m[3]);
    if (!map.has(url)) {
      map.set(url, { url, tail, num: tail, title: txt || "Capítulo " + tail });
    }
  }
  const arr = [...map.values()];
  arr.sort((a, b) => natCmp(a.tail, b.tail));
  return arr;
}

// Metadatos de la página de una obra
function seriesMeta(html) {
  const pick = (re) => { const m = html.match(re); return m ? clean(m[1]) : ""; };
  const h1 = html.indexOf("<h1");
  const adult = h1 >= 0 && /18\+/.test(html.slice(Math.max(0, h1 - 400), h1));
  return {
    title: pick(/<h1[^>]*>([^<]{1,200})</) || pick(/property="og:title"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:title"/),
    poster: pick(/property="og:image"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:image"/),
    // la sinopsis SÍ viaja en el estado: recortada
    overview: (pick(/property="og:description"[^>]*content="([^"]+)"/) || pick(/content="([^"]+)"[^>]*property="og:description"/)).slice(0, 600),
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
// Devuelve [{ url, w, h }]. El escaneo se hace sobre el HTML en bruto
// (no solo etiquetas <img>: algunos temas cargan las páginas desde un
// script), limitado al bloque de lectura cuando existe.
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
  const IMG_RE = '(https?:\/\/yuri-online\.com\/__img\/[A-Za-z0-9_\/.%-]+?\.(?:jpe?g|png|webp|avif))';
  let out = collect(win, IMG_RE);
  if (!out.length) out = collect(win, '(https?:\/\/yuri-online\.com\/wp-content\/uploads\/[^"\'\s>]+?\.(?:jpe?g|png|webp))');
  // última carta: en toda la página (algunos temas referencian las
  // páginas solo desde un script fuera del bloque de lectura)
  if (!out.length) out = collect(html, IMG_RE);
  return out;
}

// (receta de MangaTrack, como ZonaTM0): las páginas ya no se miden.
// Con fit "width" + aspect "2:3", Kino le da a cada página su
// proporción real en cuanto la imagen carga — sin descargar cabeceras.
function pageNodes(p, i) {
  return [{
    type: "Image", key: "p" + i, url: typeof p === "string" ? p : p.url,
    alt: "Página " + (i + 1), altEn: "Page " + (i + 1),
    fill: true, fit: "width", aspect: "2:3",
    fallback: { type: "Column", padding: 16, children: [
      { type: "Text", text: "Página " + (i + 1), textEn: "Page " + (i + 1), color: "muted" } ] },
  }];
}

// Carga una obra: página de detalle + lista COMPLETA de capítulos.
// El listado completo no está en el HTML: Madara lo sirve por AJAX
// (POST a /manga/<slug>/ajax/chapters/). Se usa el AJAX y, si falla,
// lo que aparezca en el propio HTML de la página.
// Con caché de 15 minutos (force=true la salta). Tope de MAX_CAPS
// capítulos (los más recientes) para no pasar del límite de nodos.
// Lo pesado se guarda en kino.storage («serie:<slug>»); del estado de
// la pantalla solo viaja el meta.
async function loadSeries(slug, force) {
  if (!slugValido(slug)) throw kino.error("arguments", "slug");
  const ck = "serie:" + slug;
  if (!force) {
    try {
      const c = getJson(ck, null);
      if (c && c.meta && Array.isArray(c.chapters) && c.chapters.length &&
          Date.now() - (c.ts || 0) < 900000) {
        return { slug, meta: c.meta, chapters: c.chapters };
      }
    } catch (e) { /* caché rota: se recarga */ }
  }
  const html = await getHtml("/manga/" + slug + "/", 60000);
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
  let capped = false;
  if (chapters.length > MAX_CAPS) {
    chapters = chapters.slice(chapters.length - MAX_CAPS);
    capped = true;
  }
  if (capped) meta.capped = true;
  if (chapters.length) {
    try {
      setJson(ck, { meta, chapters, ts: Date.now() });
      const ks = kino.storage.keys().filter((k) => k.indexOf("serie:") === 0);
      if (ks.length > 10) for (const k of ks.slice(0, ks.length - 10)) kino.storage.remove(k);
    } catch (e) { kino.log("cache", e.message); }
  }
  return { slug, meta, chapters };
}

// capítulos de una obra desde kino.storage (sin caducidad: la lista
// completa no viaja nunca en el estado de la pantalla, que tiene un
// límite de tamaño). null si no está en caché.
function chaptersDe(slug) {
  if (!slugValido(slug)) return null;
  const c = getJson("serie:" + slug, null);
  return (c && Array.isArray(c.chapters)) ? c.chapters : null;
}

// Carga la obra para el detalle: si falla (web caída, sin red, tiempo
// límite), deja la obra en estado de error — con botón «Reintentar».
// Al estado solo va el meta — los capítulos quedan en kino.storage y
// detailTree los lee de ahí.
async function cargarDetalle(state, slug, force) {
  const prev = (state.detail && state.detail.slug === slug) ? state.detail : null;
  const meta0 = (prev && prev.meta) || {};
  try {
    const d = await loadSeries(slug, force);
    return { state: { detail: { slug, meta: d.meta } } };
  } catch (e) {
    kino.log("detalle", e.message);
    return { state: { detail: { slug, error: true, meta: meta0 } } };
  }
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

// quita UNA obra de «Seguir leyendo»/Historial
function borrarProgreso(slug) {
  const p = progress();
  if (!p[slug]) return false;
  delete p[slug];
  setJson("prog", p);
  syncPush("prog", p);
  return true;
}

// vacía todo «Seguir leyendo»/Historial
function borrarTodoProgreso() {
  setJson("prog", {});
  syncPush("prog", {});
}

// ---------------------------------------------- sincronización (kino.shared)

function syncPush(key, val) {
  try {
    if (typeof kino.shared === "object" && kino.shared !== null) kino.shared.set(key, val);
  } catch (e) { kino.log("sync", e.message); }
}

function slugValido(s) {
  return typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(s) && s.indexOf("..") < 0;
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
        if (!f || typeof f !== "object" || !slugValido(f.slug)) continue;
        if (have[f.slug]) continue;
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
        if (!slugValido(k)) continue;
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
function readerCache(url) { return getJson("rc:" + url, null); }
function readerCachePut(url, urls) {
  try {
    const keys = kino.storage.keys().filter((k) => k.indexOf("rc:") === 0);
    if (keys.length > 4) for (const k of keys.slice(0, keys.length - 4)) kino.storage.remove(k);
  } catch (e) { /* la app vieja no lista */ }
  setJson("rc:" + url, urls);
}

// páginas de un capítulo (lista de URLs de imagen) — primero la caché
// de storage, si no la red. Si no hay, [].
async function paginasDe(ch) {
  const c = readerCache(ch.url);
  if (Array.isArray(c) && c.length) return c;
  const html = await getHtml(ch.url.replace(BASE, ""), 30000);
  const urls = readerImages(html).map((x) => x.url);
  if (urls.length) readerCachePut(ch.url, urls);
  return urls;
}

// ----------------------------------------------------------- interfaz

const TABS = [
  { value: "inicio", label: "Inicio", labelEn: "Home" },
  { value: "biblioteca", label: "Biblioteca", labelEn: "Library" },
  { value: "favoritos", label: "Favoritos", labelEn: "Favourites" },
  { value: "historial", label: "Historial", labelEn: "History" },
];

// Título partido en dos filas
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

// Título/portada de las tarjetas vistas, para pintar el detalle al
// instante (antes de que llegue la página de la obra).
const CARDINFO = {};
function rememberCard(it) {
  try {
    if (it && it.slug && CARDINFO[it.slug] === undefined) {
      CARDINFO[it.slug] = { title: it.title || "", poster: it.poster || "" };
      const ks = Object.keys(CARDINFO);
      if (ks.length > 300) delete CARDINFO[ks[0]];
    }
  } catch (e) { /* sin memoria */ }
}

function posterCard(it, prefix, rail) {
  rememberCard(it);
  const img = {
    type: "Image", url: it.poster || "", aspect: "2:3",
    alt: it.title, altEn: it.title,
    fallback: { type: "Column", padding: 16, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "list", color: "muted" } ] },
  };
  if (rail) img.width = 120;
  return {
    type: "Card", key: prefix + it.slug.replace(/[^a-z0-9]/gi, "-"), flush: true,
    onTap: { event: "openSeries", arg: it.slug },
    children: [img].concat(twoLines(it.title).map((ln) => (
      { type: "Text", text: ln, textEn: ln, style: "caption", padding: 8 }))),
  };
}

const EMPTY_LIB = { type: "emptyState", icon: "list", title: "Nada por aquí todavía.", titleEn: "Nothing here yet." };
const EMPTY_FAV = { type: "emptyState", icon: "heart", title: "Marca obras con el corazón para verlas aquí.", titleEn: "Mark works with the heart to see them here." };

// Esqueletos (receta MangaTrack): lo que se pinta mientras los datos
// llegan en segundo plano.
let skelSeq = 0;
function skelCard() {
  return { type: "Card", key: "sk" + skelSeq++, flush: true, children: [
    { type: "Skeleton", shape: "block", height: 180 },
    { type: "Skeleton", shape: "line", padding: 8 },
    { type: "Skeleton", shape: "line", padding: 8 },
  ] };
}

function skelGridNode(n) {
  const cards = [];
  for (let i = 0; i < (n || 12); i++) cards.push(skelCard());
  return {
    type: "ListView", key: "skel",
    columns: { compact: 3, medium: 4, expanded: 6 },
    items: cards,
  };
}

function titleGridOf(items, eventMore, loading, done, emptyNode) {
  if (!items || !items.length) return emptyNode || EMPTY_LIB;
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

// Historial con dos formas de borrar el «Seguir leyendo»: mantener
// pulsada una entrada para quitar solo esa obra, y el botón «Borrar
// todo» (pide confirmar con un segundo toque).
function historyList(state) {
  const p = progress();
  const rows = Object.keys(p).map((slug) => ({ slug, p: p[slug] }))
    .sort((a, b) => b.p.ts - a.p.ts).slice(0, 50);
  const conf = state && state.confBorrar === true;
  if (!rows.length) {
    return { type: "emptyState", icon: "schedule", title: "Todavía no has leído nada.", titleEn: "You have not read anything yet." };
  }
  const items = [{
    type: "Row", key: "histHead", gap: 8, padding: 16,
    children: [
      { type: "Text", text: "Mantén pulsada una obra para quitarla del historial.",
        textEn: "Long-press a work to remove it from history.",
        style: "caption", color: "muted", flex: 1 },
      { type: "ElevatedButton", key: "clearHist", icon: "delete",
        labelText: conf ? "¿Seguro? Toca otra vez" : "Borrar todo",
        labelTextEn: conf ? "Sure? Tap again" : "Clear all",
        onPressed: { event: "clearHist" } },
    ],
  }];
  for (const r of rows) {
    items.push({
      type: "ListTile", key: "h-" + r.slug.replace(/[^a-z0-9]/gi, "-"),
      title: r.p.title || r.slug,
      subtitle: r.p.chTitle || "", subtitleEn: r.p.chTitle || "",
      leading: { type: "CircleAvatar", image: r.p.poster, icon: "list" },
      onTap: { event: "openSeries", arg: r.slug },
      onLongPress: { event: "borrarProg", arg: r.slug },
    });
  }
  return { type: "ListView", key: "hist", items };
}

// ------------------------------------------------- géneros (como ZonaTM0)

// Las secciones del Inicio: géneros del sitio (slugs de yuri-online).
const GENEROS_INICIO = [
  { key: "accion", label: "Acción", labelEn: "Action" },
  { key: "comedia", label: "Comedia", labelEn: "Comedy" },
  { key: "fantasia", label: "Fantasía", labelEn: "Fantasy" },
  { key: "romance", label: "Romance", labelEn: "Romance" },
  { key: "drama", label: "Drama", labelEn: "Drama" },
];

// Tope de obras por sección en el estado (que viaja en la pantalla):
// 24 al abrir + hasta 24 más con «Ver más».
const GENERO_MAX = 48;

// Una sección por género: tarjetas + «Ver más» al final. «usados» es
// el mapa compartido entre secciones: una obra que ya salió en una
// sección anterior NO se repite.
function railGenero(state, g, usados) {
  const cats = state.cats || {};
  const cat = cats[g.key] || null;
  if (!cat) {
    // aún sin cargar: esqueletos de la sección mientras llega el tick
    const sk = [];
    for (let i = 0; i < 6; i++) sk.push({
      type: "Card", key: g.key + "sk" + i, flush: true, children: [
        { type: "Skeleton", shape: "block", width: 120, height: 180 }] });
    return [
      { type: "Text", text: g.label, textEn: g.labelEn, style: "h3", padding: 16 },
      { type: "SingleChildScrollView", key: g.key + "skr", direction: "horizontal", padding: 16,
        children: [{ type: "Row", gap: 8, children: sk }] },
    ];
  }
  const items = Array.isArray(cat.items) ? cat.items : [];
  const cards = [];
  for (const it of items.slice(0, 60)) {
    if (usados[it.slug]) continue;
    usados[it.slug] = true;
    cards.push(posterCard(it, "g" + g.key + "-", true));
  }
  if (!cards.length) return [];
  if (items.length < GENERO_MAX) {
    // botón «Ver más» al final de la sección
    cards.push({ type: "ElevatedButton", key: "vm-" + g.key, icon: "expand_more",
      labelText: "Ver más", labelTextEn: "See more",
      onPressed: { event: "verMas", arg: g.key } });
  }
  return [
    { type: "Text", text: g.label, textEn: g.labelEn, style: "h3", padding: 16 },
    { type: "SingleChildScrollView", key: "r-" + g.key, direction: "horizontal", padding: 16,
      children: [{ type: "Row", gap: 8, children: cards }] },
  ];
}

// El cuerpo de las pestañas ya NUNCA espera a la red. Pinta lo que
// haya en el estado y, si falta, esqueletos: el temporizador
// «cargarRoot» trae los datos en segundo plano.
function tabBody(state) {
  const tab = state.tab || "inicio";
  if (tab === "favoritos") return titleGridOf(favs(), null, false, true, EMPTY_FAV);
  if (tab === "historial") return historyList(state);
  if (tab === "biblioteca") {
    const items = Array.isArray(state.libItems) ? state.libItems : null;
    if (!items) return skelGridNode(12);
    return titleGridOf(items, "libMore", state.libLoading === true, state.libDone === true);
  }
  // inicio
  const rail = (title, titleEn, key, list) => list.length ? [
    { type: "Text", text: title, textEn: titleEn, style: "h3", padding: 16 },
    { type: "SingleChildScrollView", key: key, direction: "horizontal", padding: 16,
      children: [{ type: "Row", gap: 8, children: list.slice(0, 60).map((it) => posterCard(it, key + "-", true)) }] },
  ] : [];
  const prog = progress();
  const leyendo = Object.keys(prog)
    .map((slug) => ({ slug, title: prog[slug].title, poster: prog[slug].poster, ts: prog[slug].ts || 0 }))
    .filter((x) => x.title)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20);
  // secciones por género, sin repetidos entre ellas
  const usados = {};
  let secciones = [];
  for (const g of GENEROS_INICIO) secciones = secciones.concat(railGenero(state, g, usados));
  return {
    type: "SingleChildScrollView", key: "home", flex: 1,
    children: [{
      type: "Column", children: [
        { type: "ListTile", key: "searchTile", leading: { type: "Icon", name: "search" },
          title: "Buscar obra", titleEn: "Search a work",
          subtitle: "Por título, p. ej. Trash Flower", subtitleEn: "By title, e.g. Trash Flower",
          trailing: { type: "Icon", name: "arrow_forward" },
          onTap: { event: "goSearch" } },
      ].concat(rail("Seguir leyendo", "Continue reading", "leyendo", leyendo))
        .concat(rail("Mis favoritos", "My favourites", "favs", favs()))
        .concat(secciones),
    }],
  };
}

// Biblioteca: todas las obras del sitio, paginadas
async function fetchLibrary(page) {
  const html = await getLibHtml(page, "", "");
  return seriesCards(html, 36);
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

// Pantalla de error con reintentar: para fallos de red con tiempo límite
function errorTree(msg, retryEvent, extra) {
  const children = [
    { type: "Icon", name: "error", color: "muted" },
    { type: "Text", text: msg, textEn: msg, color: "muted", padding: { left: 16, right: 16 } },
    { type: "ElevatedButton", icon: "refresh", labelText: "Reintentar", labelTextEn: "Retry",
      onPressed: { event: retryEvent || "retry" } },
  ];
  if (extra) children.push(extra);
  return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children };
}

// Detalle mientras la obra llega en segundo plano: esqueletos de los
// capítulos (receta MangaTrack) + temporizador «cargarSerie» + un
// botón «Cargar ahora» por si el Kino del teléfono no tuviera
// temporizadores de pantalla.
function detailLoadingTree(d) {
  const info = CARDINFO[d.slug] || {};
  const title = (d.meta && d.meta.title) || info.title || d.slug;
  const poster = (d.meta && d.meta.poster) || info.poster || "";
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push({ type: "Skeleton", key: "skr" + i, shape: "line", padding: 12 });
  }
  return {
    type: "Scaffold",
    every: { ms: 1000, event: "cargarSerie" },
    appBar: {
      title: title,
      leading: { type: "IconButton", key: "backHome", icon: "arrow_back",
        labelText: "Atrás", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
      actions: [],
    },
    body: { type: "SingleChildScrollView", key: "detailLoading", children: [
      { type: "Column", children: [
        { type: "Row", gap: 16, padding: 16, crossAxisAlignment: "start", stackOnNarrow: true,
          children: [
            poster ? { type: "Image", url: poster, width: { compact: 120, expanded: 160 },
              aspect: "2:3", alt: title, fallback: { type: "Skeleton", shape: "block" } }
              : { type: "Skeleton", shape: "block", width: { compact: 120, expanded: 160 } },
            { type: "Column", gap: 6, flex: 2, crossAxisAlignment: "start", children: [
              { type: "Text", text: title, style: "h2" },
              { type: "Skeleton", shape: "line" },
              { type: "Skeleton", shape: "line" },
              { type: "Skeleton", shape: "line" },
              { type: "Text", text: "Cargando capítulos…", textEn: "Loading chapters…",
                color: "muted", style: "caption" },
              { type: "ElevatedButton", key: "loadNow", icon: "download",
                labelText: "Cargar ahora", labelTextEn: "Load now",
                onPressed: { event: "cargarSerieAhora" } },
            ] },
          ] },
        { type: "Skeleton", shape: "line", padding: 16 },
      ].concat(rows) },
    ] },
  };
}

// la sinopsis, plegada si es larga, con botón para extenderla
function sinopsisNode(state, overview) {
  const o = overview || "";
  const completa = state.sinopsisCompleta === true;
  if (o.length <= 240 || completa) {
    const children = [{ type: "Text", key: "sinopsisTxt", text: o, textEn: o, style: "p", color: "muted" }];
    if (o.length > 240) {
      children.push({ type: "TextButton", key: "sinMenos", icon: "expand_less",
        labelText: "Menos", labelTextEn: "Less", onPressed: { event: "toggleSinopsis" } });
    }
    return { type: "Column", key: "sinopsis", gap: 4, crossAxisAlignment: "start", children: children };
  }
  return { type: "Column", key: "sinopsis", gap: 4, crossAxisAlignment: "start", children: [
    { type: "Text", key: "sinopsisTxt",
      text: o.slice(0, 240).trim() + "…", textEn: o.slice(0, 240).trim() + "…",
      style: "p", color: "muted" },
    { type: "TextButton", key: "sinMas", icon: "expand_more",
      labelText: "Ver toda la sinopsis", labelTextEn: "Full synopsis",
      onPressed: { event: "toggleSinopsis" } },
  ] };
}

async function detailTree(state) {
  const d = state.detail;
  if (!d) return loadingTree();
  if (d.loading) return detailLoadingTree(d);
  const fav = isFav(d.slug);
  // la carga falló (web caída, sin red, tiempo límite agotado): se
  // ofrece reintentar en vez del cargado eterno de antes
  if (d.error) {
    return errorTree("No se pudo cargar la obra. Comprueba tu conexión e inténtalo de nuevo.", "reloadSeries",
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Volver", labelTextEn: "Back",
        onPressed: { event: "popBack" } });
  }
  // la lista de capítulos vive en kino.storage, no en el estado
  // (las obras con muchos capítulos se pasaban del límite de tamaño
  // del estado y rompían el lector).
  const chapters = chaptersDe(d.slug) || [];
  if (!chapters.length) {
    return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "error", color: "muted" },
      { type: "Text", text: "No se encontraron capítulos para esta obra.", textEn: "No chapters found for this work.", color: "muted" },
      { type: "ElevatedButton", icon: "refresh", labelText: "Reintentar", labelTextEn: "Retry",
        onPressed: { event: "reloadSeries" } },
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Volver", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
    ] };
  }
  const cover = d.meta.poster
    ? { type: "Image", url: d.meta.poster, width: { compact: 120, expanded: 160 },
        aspect: "2:3", alt: d.meta.title,
        fallback: { type: "Icon", name: "list" } }
    : { type: "Icon", name: "list" };
  const pg = progress()[d.slug];
  const pgIdx = pg && typeof pg.url === "string" ? chapters.findIndex((c) => c.url === pg.url) : -1;
  // botones en dos filas limpias, sin huecos (como ZonaTM0):
  //  - fila principal: Continuar/Empezar a todo el ancho
  //  - fila secundaria compacta SOLO con iconos: Favoritos ·
  //    Actualizar · Olvidar lo leído (solo si hay progreso)
  const filaPrincipal = (function () {
    if (pgIdx > 0) {
      const contLabel = "Seguir · Cap. " + (chapters[pgIdx].num || (pgIdx + 1));
      return { type: "ElevatedButton", key: "cont", icon: "play",
        labelText: contLabel, labelTextEn: contLabel, flex: 1,
        onPressed: { event: "read", arg: String(pgIdx) } };
    }
    return { type: "ElevatedButton", key: "start", icon: "play",
      labelText: "Empezar a leer", labelTextEn: "Start reading",
      flex: 1, onPressed: { event: "read", arg: "0" } };
  })();
  // fila secundaria SOLO con iconos (sin texto): el labelText queda
  // como etiqueta accesible/mando de TV, no se dibuja.
  const filaSecundaria = [
    { type: "IconButton", key: "fav", icon: fav ? "heart" : "star",
      labelText: fav ? "Quitar de favoritos" : "Añadir a favoritos",
      labelTextEn: fav ? "Remove favourite" : "Add favourite",
      onPressed: "fav" },
    // Actualizar: salta el caché y trae los capítulos nuevos
    { type: "IconButton", key: "refresh", icon: "refresh",
      labelText: "Actualizar", labelTextEn: "Refresh",
      onPressed: "reloadSeries" },
  ];
  if (pg) {
    filaSecundaria.push({ type: "IconButton", key: "olvidar", icon: "delete",
      labelText: "Olvidar lo leído", labelTextEn: "Forget read progress",
      onPressed: { event: "borrarProg", arg: d.slug } });
  }
  const head = {
    type: "Row", gap: 16, padding: 16, crossAxisAlignment: "start", stackOnNarrow: true,
    children: [
      cover,
      { type: "Column", gap: 6, flex: 2, crossAxisAlignment: "start", children: [
        { type: "Text", text: d.meta.title || d.slug, style: "h2" },
        d.meta.adult ? { type: "Badge", key: "adult", text: "18+" } : null,
        d.meta.type ? { type: "Text", key: "tipo", text: d.meta.type, color: "muted" } : null,
        d.meta.status ? { type: "Badge", key: "estado", text: d.meta.status } : null,
        d.meta.genres ? { type: "Text", key: "generos", text: "Géneros: " + d.meta.genres, textEn: "Genres: " + d.meta.genres, color: "muted", style: "caption" } : null,
        // sinopsis plegable
        sinopsisNode(state, d.meta.overview),
        // fila principal — leer, sin huecos
        { type: "Row", key: "filaLeer", gap: 8, children: [filaPrincipal] },
        // fila secundaria — gestión, sin huecos
        { type: "Row", key: "filaGestion", gap: 8,
          mainAxisAlignment: "center", children: filaSecundaria },
      ].filter(Boolean) },
    ],
  };
  const items = [head];
  // el contador de capítulos lleva a su derecha un conmutador que
  // invierte el orden de la lista: «Desde lo último» (los nuevos
  // arriba) o «Desde el principio» (el 1 arriba, lo de siempre).
  const desdeFinal = state.ordenCaps === "desc";
  items.push({ type: "Row", key: "filaOrden", gap: 8, padding: 16, crossAxisAlignment: "center", children: [
    { type: "Text", flex: 1,
      text: chapters.length + " capítulos" + (d.meta.capped ? " (mostrando los " + MAX_CAPS + " más recientes)" : ""),
      textEn: chapters.length + " chapters", style: "h3" },
    { type: "TextButton", key: "ordenBtn", icon: "expand_more",
      labelText: desdeFinal ? "Desde el principio" : "Desde lo último",
      labelTextEn: desdeFinal ? "From the first" : "From the latest",
      onPressed: { event: "ordenCaps" } },
  ] });
  // la lista se pinta según el orden elegido; el índice que se pasa a
  // «read» es siempre el de la lista ORIGINAL.
  const lista = desdeFinal ? chapters.slice().reverse() : chapters;
  const idxDe = (i) => desdeFinal ? String(chapters.length - 1 - i) : String(i);
  for (let i = 0; i < lista.length; i++) {
    const c = lista[i];
    items.push({
      type: "ListTile", key: "ch" + i, dense: true,
      title: c.title,
      onTap: { event: "read", arg: idxDe(i) },
      trailing: { type: "Icon", name: "arrow_forward" },
    });
  }
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

// contador de navegación entre capítulos
let navSeq = 0;

// Modo páginas (Kino 0.9.81, receta de MangaTrack)
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

function modoLectorEfectivo(n) {
  const puede = pagesDisponible() && n >= 2 && n <= 250;
  return puede && modoLectorPref() === "paginas" ? "paginas" : "tira";
}

function paginaFit(p, i) {
  return { type: "SingleChildScrollView", key: "z" + i, zoom: true, children: [
    { type: "Image", key: "p" + i, url: typeof p === "string" ? p : p.url,
      alt: "Página " + (i + 1), altEn: "Page " + (i + 1),
      fill: true, fit: "width", aspect: "2:3" } ] };
}

// barra fina SOLO para el modo páginas (no hay final de tira donde
// poner la tarjeta). Una sola fila, sin duplicados: Volver ·
// Anterior · Siguiente.
function barraPaginas(r, chapters) {
  return {
    type: "Card", key: "panelLectura", margin: 8, padding: 8, gap: 8,
    children: [
      { type: "Row", gap: 8, children: [
        { type: "IconButton", key: "pbBack", icon: "arrow_back",
          labelText: "Volver al detalle", labelTextEn: "Back to details",
          onPressed: { event: "popBack" } },
        { type: "ElevatedButton", key: "pbPrev", icon: "arrow_back",
          labelText: "Anterior", labelTextEn: "Previous",
          onPressed: "prevChap", flex: 1 },
        { type: "ElevatedButton", key: "pbNext", icon: "arrow_forward",
          labelText: "Siguiente", labelTextEn: "Next",
          onPressed: "nextChap", flex: 1 },
      ] },
      { type: "Text", key: "lblPos",
        text: "Capítulo " + (r.idx + 1) + " de " + chapters.length,
        textEn: "Chapter " + (r.idx + 1) + " of " + chapters.length,
        style: "caption", color: "muted" },
    ],
  };
}

// la ÚNICA barra de navegación del lector — la tarjeta al final del
// capítulo. «Volver al detalle» arriba, «Anterior» y «Siguiente»
// (siempre activos; en los extremos, el evento avisa con un toast) a
// partes iguales, y el cambio de modo si tu Kino admite el modo
// páginas.
function finCapituloNode(r, chapters, modo) {
  const children = [
    { type: "Row", gap: 8, children: [
      { type: "IconButton", key: "finBack", icon: "arrow_back",
        labelText: "Volver al detalle", labelTextEn: "Back to details",
        onPressed: { event: "popBack" } },
      { type: "Text", key: "finTitulo",
        text: "Capítulo " + (r.idx + 1) + " de " + chapters.length,
        textEn: "Chapter " + (r.idx + 1) + " of " + chapters.length,
        style: "caption", color: "muted", flex: 1 },
    ] },
    { type: "Row", gap: 12, children: [
      { type: "ElevatedButton", key: "finPrev", icon: "arrow_back",
        labelText: "Anterior", labelTextEn: "Previous",
        onPressed: "prevChap", flex: 1 },
      { type: "ElevatedButton", key: "finNext", icon: "arrow_forward",
        labelText: "Siguiente", labelTextEn: "Next",
        onPressed: "nextChap", flex: 1 },
    ] },
  ];
  if (pagesDisponible()) {
    children.push({ type: "Row", gap: 8, mainAxisAlignment: "center", children: [
      { type: "TextButton", key: "finModo",
        labelText: modo === "paginas" ? "Modo páginas" : "Modo tira",
        labelTextEn: modo === "paginas" ? "Page mode" : "Strip mode",
        onPressed: "modoLector" },
    ] });
  }
  return { type: "Card", key: "finCap", margin: 16, padding: 12, gap: 8, children };
}

async function readerTree(state) {
  const r = state.reader;
  if (!r) return loadingTree();
  // el lector en el estado es mínimo (slug, índice y páginas); la
  // lista de capítulos se lee de kino.storage.
  const pages = Array.isArray(r.imgs) ? r.imgs : [];
  const chapters = chaptersDe(r.slug) || [];
  const ch = chapters[r.idx];
  if (!ch || !pages.length) {
    return { type: "Column", padding: 32, gap: 12, crossAxisAlignment: "center", children: [
      { type: "Icon", name: "error", color: "muted" },
      { type: "Text", text: "No se pudieron cargar las páginas de este capítulo.", textEn: "Could not load this chapter's pages.", color: "muted" },
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Volver", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
    ] };
  }
  const chKey = String(ch.url).replace(/[^a-z0-9]/gi, "").slice(-16);
  const scrollKey = "pages-" + r.idx + "-" + chKey + "-" + (r.tk || 0);
  const modo = modoLectorEfectivo(pages.length);
  // el lector es SIEMPRE pantalla completa (como ZonaTM0 v1.1.6) — sin
  // barra propia (queda la de Kino con Cerrar/Atrás), sin botón
  // flotante y sin panel inferior. La navegación vive en la tarjeta
  // del final.
  const body = [];
  if (modo === "paginas") {
    body.push({
      type: "pages", key: "pgs", flex: 1, progress: "bar", onPageChanged: "pgChanged",
      children: pages.map((p, i) => paginaFit(p, i)),
    });
    body.push(barraPaginas(r, chapters));
  } else {
    body.push({
      type: "SingleChildScrollView", key: scrollKey, flex: 1, zoom: true,
      children: [{
        type: "Column", gap: 4, crossAxisAlignment: "center", fill: true,
        children: pages.flatMap((p, i) => pageNodes(p, i))
          // la tarjeta del final es la ÚNICA barra de navegación —
          // «Anterior»/«Siguiente» aparecen una sola vez.
          .concat([finCapituloNode(r, chapters, modo)]),
      }],
    });
  }
  return {
    type: "Scaffold",
    body: { type: "Column", children: body },
  };
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
      if (!state.detail || state.detail.slug !== slug) {
        // el detalle del estado no es el de esta ruta; se pinta la
        // vista de esqueletos y el temporizador corrige el estado.
        return detailLoadingTree(detailLoadingDe(slug));
      }
      return await detailTree(state);
    }
    if (r.name === "read") return await readerTree(state);
    if (r.name === "search") return searchTree(state);
  } catch (e) {
    return errorTree("No se pudo cargar (" + (e.code || "error") + ").", "retry");
  }
  // ruta raíz: pestañas. Se pintan AL INSTANTE (caché o esqueletos) y
  // el temporizador «cargarRoot» trae lo que falte en segundo plano.
  return {
    type: "Scaffold",
    every: { ms: 1500, event: "cargarRoot" },
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
    body: tabBody(state),
  };
}

// El detalle en carga: arranca en segundo plano y evita que dos cargas
// se pisen (temporizador + botón «Cargar ahora»).
let serieEnCarga = null;

// la obra que se está viendo AHORA. Un tick del temporizador que
// termine de cargar una obra anterior ya no debe sobrescribir el
// detalle: se compara contra esta variable al terminar la carga.
let slugDetalleActivo = null;

function detailLoadingDe(slug) {
  const info = CARDINFO[slug] || {};
  slugDetalleActivo = slug;
  return { slug, loading: true,
    meta: { title: info.title || "", poster: info.poster || "" } };
}

export async function screenEvent(ev) {
  const name = ev.name;
  const state = ev.state || {};
  try {
    if (name === "open") {
      syncPull();
      const r = ev.route || {};
      if (r.name === "detail") {
        const slug = routeSlug(r);
        if (slug && slugValido(slug) && (!state.detail || state.detail.slug !== slug)) {
          // no se bloquea; el detalle se pinta ya con esqueletos y el
          // temporizador «cargarSerie» trae los capítulos.
          return { state: { detail: detailLoadingDe(slug) } };
        }
      }
      return null;
    }
    if (name === "tab") {
      // cambiar de pestaña no espera a la red; si falta la lista, el
      // temporizador la trae.
      return { state: { tab: ev.value } };
    }
    // temporizador de la raíz: trae Inicio/Biblioteca en segundo plano
    if (name === "cargarRoot") {
      const tab = state.tab || "inicio";
      if (tab === "biblioteca" && !Array.isArray(state.libItems)) {
        try {
          const items = await fetchLibrary(1);
          return { state: { libItems: items, libPage: 1, libDone: items.length < 36 } };
        } catch (e) { return { state: { libItems: [], libError: true } }; }
      }
      if (tab === "inicio") {
        // UNA sección por tick — la pantalla nunca se bloquea
        const cats = state.cats || {};
        for (const g of GENEROS_INICIO) {
          if (!cats[g.key]) {
            let items = [];
            try {
              items = seriesCards(await getLibHtml(1, "", "", g.key), 24)
                .map((x) => ({ slug: x.slug, poster: x.poster, title: x.title }));
            } catch (e) { /* sección vacía; quedará como cargada */ }
            return { state: { cats: Object.assign({}, cats, { [g.key]: { items, page: 1 } }) } };
          }
        }
        return null;
      }
      return null;
    }
    // temporizador del detalle: carga la obra en segundo plano
    if (name === "cargarSerie" || name === "cargarSerieAhora") {
      const d = state.detail;
      if (!d) return null;
      // autocuración — si el detalle del estado no es el que se está
      // viendo (quedó el de la obra anterior), se corrige aquí y el
      // siguiente tick la carga.
      if (slugDetalleActivo && d.slug !== slugDetalleActivo) {
        return { state: { detail: detailLoadingDe(slugDetalleActivo) } };
      }
      if (!d.loading) return null;
      if (serieEnCarga === d.slug && name === "cargarSerie") return null;
      serieEnCarga = d.slug;
      slugDetalleActivo = d.slug;
      try {
        // refresh=true salta el caché (botón «Actualizar»/«Reintentar»)
        const res = await cargarDetalle(state, d.slug, d.refresh === true);
        // mientras cargaba esta obra se abrió otra — el resultado ya
        // no vale y NO se aplica.
        if (slugDetalleActivo !== d.slug) return null;
        return res;
      } finally {
        serieEnCarga = null;
      }
    }
    if (name === "libMore") {
      const page = (state.libPage || 1) + 1;
      const more = await fetchLibrary(page);
      let merged = (state.libItems || []).concat(more.filter((x) => !(state.libItems || []).some((y) => y.slug === x.slug)));
      if (merged.length > LIB_MAX) merged = merged.slice(0, LIB_MAX);
      return { state: { libItems: merged, libPage: page, libDone: more.length < 36 || merged.length >= LIB_MAX } };
    }
    if (name === "goSearch") return { route: { push: "search" } };
    if (name === "popBack") return { route: { pop: true } };
    if (name === "search") {
      const q = String(ev.value && ev.value.q || "").trim();
      if (!q) return { toast: "Escribe un título." };
      const html = await getLibHtml(1, "", q);
      // los resultados vienen tras la barra de orden (m_orderby); antes
      // está el carrusel popular de la portada, que no debe mezclarse
      // con los resultados
      const cut = html.indexOf("m_orderby");
      const results = seriesCards(cut >= 0 ? html.slice(cut) : html, 40);
      return { state: { results, resultsQ: q },
        toast: results.length ? results.length + " resultados" : "Sin resultados" };
    }
    if (name === "retry") return { state: { _r: Date.now() } };
    // «Ver más» al final de una sección de género — trae la página
    // siguiente de ese género y la añade a la sección.
    if (name === "verMas") {
      const key = String(ev.arg || "");
      const g = GENEROS_INICIO.find((x) => x.key === key);
      const cats = state.cats || {};
      const cat = cats[key];
      if (!g || !cat) return null;
      if (cat.items.length >= GENERO_MAX) return { toast: "La sección ya está completa" };
      const page = (cat.page || 1) + 1;
      try {
        const more = seriesCards(await getLibHtml(page, "", "", key), 24)
          .map((x) => ({ slug: x.slug, poster: x.poster, title: x.title }));
        const vistos = {};
        for (const it of cat.items) vistos[it.slug] = true;
        const nuevos = more.filter((it) => !vistos[it.slug]);
        if (!nuevos.length) return { toast: "No hay más obras de " + g.label };
        let merged = cat.items.concat(nuevos);
        if (merged.length > GENERO_MAX) merged = merged.slice(0, GENERO_MAX);
        return { state: { cats: Object.assign({}, cats, { [key]: { items: merged, page } }) },
          toast: "+" + nuevos.length + " en " + g.label };
      } catch (e) {
        return { toast: "No se pudo cargar más. Inténtalo otra vez." };
      }
    }
    // plegar/desplegar la sinopsis del detalle
    if (name === "toggleSinopsis") {
      return { state: { sinopsisCompleta: state.sinopsisCompleta !== true } };
    }
    // invertir el orden de la lista de capítulos del detalle
    if (name === "ordenCaps") {
      const nuevo = state.ordenCaps === "desc" ? "asc" : "desc";
      return { state: { ordenCaps: nuevo },
        toast: nuevo === "desc" ? "Mostrando desde lo último" : "Mostrando desde el principio" };
    }
    // quitar UNA obra de «Seguir leyendo»/Historial (botón «Olvidar
    // lo leído» del detalle o pulsación larga en Historial)
    if (name === "borrarProg") {
      let slug = String(ev.arg || "");
      if (!slug && state.detail) slug = state.detail.slug;
      if (!slugValido(slug)) return null;
      if (!borrarProgreso(slug)) return null;
      return { state: { _r: Date.now() },
        toast: "Quitada de «Seguir leyendo»" };
    }
    // vaciar TODO «Seguir leyendo»/Historial (dos toques para
    // confirmar; el primero solo cambia el texto del botón)
    if (name === "clearHist") {
      if (!state.confBorrar) {
        return { state: { confBorrar: true },
          toast: "Toca otra vez para borrar TODO el historial" };
      }
      borrarTodoProgreso();
      return { state: { confBorrar: false },
        toast: "Historial y «Seguir leyendo» borrados" };
    }
    // Reintentar / Actualizar en el detalle: vuelve a la vista de
    // esqueletos (sin bloquear) y el temporizador recarga saltando el
    // caché (refresh=true).
    if (name === "reloadSeries") {
      const d = state.detail;
      if (!d) return null;
      return { state: { detail: { slug: d.slug, loading: true, refresh: true,
        meta: d.meta || {} } } };
    }
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
    if (name === "read" || name === "nextChap" || name === "prevChap") {
      // la lista de capítulos ya no viaja en el estado; se lee de
      // kino.storage. «Anterior» y «Siguiente» siempre activos — si
      // no hay más capítulo en esa dirección, se avisa con un toast.
      let chapters, idx, slug, title, poster;
      if (name === "read") {
        const d = state.detail;
        if (!d) return null;
        chapters = chaptersDe(d.slug) || [];
        idx = parseInt(String(ev.arg || "0"), 10) || 0;
        slug = d.slug; title = d.meta.title; poster = d.meta.poster;
        if (idx < 0 || idx >= chapters.length) return null;
      } else {
        const r = state.reader;
        if (!r) return null;
        chapters = chaptersDe(r.slug) || [];
        idx = r.idx + (name === "nextChap" ? 1 : -1);
        slug = r.slug; title = r.title; poster = r.poster;
        if (idx >= chapters.length) return { toast: "Ya estás en el último capítulo" };
        if (idx < 0) return { toast: "Ya estás en el primer capítulo" };
      }
      const ch = chapters[idx];
      const images = await paginasDe(ch);
      if (!images.length) return { toast: "No se encontraron páginas en este capítulo." };
      // estado del lector mínimo — sin lista de capítulos.
      markRead(slug, title, poster, ch.title, ch.url);
      const reader = { slug, title, poster, idx, chUrl: ch.url, imgs: images, tk: ++navSeq };
      const resp = { state: { reader } };
      if (name === "read") resp.route = { push: "read" };
      if (modoLectorEfectivo(images.length) === "paginas") {
        let at = parseInt(getJson("pg:" + ch.url, 0), 10);
        if (!(at >= 0) || at >= images.length) at = 0;
        resp.ui = [{ set: { key: "pgs", value: at } }];
      }
      return resp;
    }
    if (name === "pgChanged") {
      const r = state.reader;
      if (!r || !r.chUrl) return null;
      let at = parseInt(String(ev.value === undefined ? "" : ev.value), 10);
      if (!(at >= 0)) at = 0;
      const ks = [];
      try {
        for (const k of kino.storage.keys()) if (k.indexOf("pg:") === 0) ks.push(k);
      } catch (e) { }
      if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) try { kino.storage.remove(k); } catch (e) { }
      try { kino.storage.set("pg:" + r.chUrl, String(at)); } catch (e) { }
      return null;
    }
    if (name === "modoLector") {
      if (!pagesDisponible()) return null;
      const nuevo = modoLectorPref() === "paginas" ? "tira" : "paginas";
      setJson("modoLector", nuevo);
      return { state: { _r: Date.now() },
        toast: nuevo === "paginas" ? "Modo páginas" : "Modo tira" };
    }
    if (name === "openSeries") {
      const slug = String(ev.arg || "");
      if (!slugValido(slug)) return null;
      // (receta MangaTrack): el detalle se abre AL INSTANTE con
      // esqueletos; los capítulos llegan por el temporizador en
      // segundo plano.
      return { state: { detail: detailLoadingDe(slug) },
               route: { push: "detail", params: { slug } } };
    }
  } catch (e) {
    return { toast: "Algo falló: " + (e.code || "error") };
  }
  return null;
}
