
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
function pageNodes(p, i) {
  const img = {
    type: "Image", key: "p" + i, url: typeof p === "string" ? p : p.url,
    alt: "Página " + (i + 1), altEn: "Page " + (i + 1),
    fallback: { type: "Column", padding: 16, children: [
      { type: "Text", text: "Página " + (i + 1), textEn: "Page " + (i + 1), color: "muted" } ] },
  };
  const w = (p && p.w) || 0, h = (p && p.h) || 0;
  const ratio = w > 0 && h > 0 ? h / w : 0;
  const tall = ratio >= 1.05 && ratio <= 1.8;
  if (ratio > 0 && tall) {
    const small = pageBox(ratio, 400, 640) || { width: 400, height: 560 };
    const compact = Object.assign({}, img, { key: "pc" + i, sizes: ["compact"],
      width: small.width, height: small.height });
    const big = Object.assign({}, img, { key: "pe" + i, sizes: ["medium", "expanded"],
      width: 640, aspect: "2:3" });
    return [compact, big];
  }
  if (ratio > 0) {
    const small = pageBox(ratio, 400, 640), big = pageBig(ratio) || pageBox(ratio, 640, 640);
    if (small && big) {
      img.width = { compact: small.width, medium: big.width, expanded: big.width };
      img.height = { compact: small.height, medium: big.height, expanded: big.height };
      return [img];
    }
  }
  // sin dimensiones conocidas: caja de proporción de página típica
  img.width = { compact: 400, medium: 400, expanded: 480 };
  img.height = { compact: 560, medium: 560, expanded: 640 };
  return [img];
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

// Una obra como tarjeta nativa de Kino (titleGrid/titleRail).
// El toque manda el evento "openSeries", que CARGA la obra y la entra como
// ruta EMPUJADA (route: { push: "detail" }): así el botón Atrás de Kino
// retrocede de verdad (detalle -> pestañas) en vez de cerrar el lienzo,
// porque con open: { screen } la ruta de detalle se volvía raíz.
function kinoItem(it) {
  const item = {
    id: "yuri-" + it.slug, ref: it.slug,
    title: it.title, kind: "movie",
    onTap: { event: "openSeries", arg: it.slug },
  };
  if (it.poster) item.poster = it.poster;
  return item;
}

const EMPTY_LIB = { type: "emptyState", icon: "list", title: "Nada por aquí todavía.", titleEn: "Nothing here yet." };
const EMPTY_FAV = { type: "emptyState", icon: "heart", title: "Marca obras con el corazón para verlas aquí.", titleEn: "Mark works with the heart to see them here." };

function titleGridOf(items, eventMore, loading, done, emptyNode) {
  if (!items || !items.length) return emptyNode || EMPTY_LIB;
  const grid = {
    type: "titleGrid", key: "grid",
    columns: { compact: 3, medium: 4, expanded: 6 },
    items: items.map(kinoItem),
  };
  if (eventMore && !done) {
    grid.onEndReached = { event: eventMore };
    grid.loadingMore = loading === true;
  } else {
    grid.done = true;
  }
  return grid;
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
        { type: "titleRail", key: "latest", title: "Últimas obras", titleEn: "Latest works",
          size: "small", done: true, items: items.map(kinoItem) },
        // favoritos siempre a mano, justo debajo de las últimas obras
        favs().length ? { type: "titleRail", key: "favRail", title: "Mis favoritos", titleEn: "My favourites",
          size: "small", done: true, items: favs().map(kinoItem) } : null,
      ].filter(Boolean),
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
  const pageCol = {
    type: "Column", gap: 4, crossAxisAlignment: "center",
    children: pages.flatMap((p, i) => pageNodes(p, i)),
  };
  const body = [];
  body.push({
    type: "SingleChildScrollView", key: scrollKey, flex: 1,
    children: [pageCol],
  });
  body.push({
    type: "Row", gap: 12, padding: 16, mainAxisAlignment: "center", wrap: true, children: [
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Anterior", labelTextEn: "Previous",
        onPressed: "prevChap", enabled: hasPrev },
      { type: "ElevatedButton", labelText: hasNext ? "Siguiente" : "Último capítulo",
        labelTextEn: hasNext ? "Next" : "Last chapter",
        icon: "arrow_forward", onPressed: "nextChap", enabled: hasNext },
    ],
  });
  return {
    type: "Scaffold",
    appBar: { title: ch ? ch.title : "Leyendo",
      leading: { type: "IconButton", key: "backFromReader", icon: "arrow_back",
        labelText: "Atrás", labelTextEn: "Back",
        onPressed: { event: "popBack" } },
      actions: [] },
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
    if (name === "read" || name === "nextChap" || name === "prevChap") {
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
        idx = r.idx + (name === "nextChap" ? 1 : -1);
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
      markRead(slug, title, poster, ch.title, ch.url);
      const reader = { slug, title, poster, chapters, idx, images, tk: ++navSeq };
      if (name === "read") return { state: { reader }, route: { push: "read" } };
      return { state: { reader } };
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
