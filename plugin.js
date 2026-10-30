
// Plugin de Kino para leer obras de yuri-online.com
// Interfaz tipo lector de manga (Kototoro): Inicio, Biblioteca,
// Favoritos, Historial, detalle de obra con lista de capítulos y
// lector (cascada o paginado). Funciona en teléfono y TV desde el
// mismo árbol de nodos: Kino dibuja el foco del control remoto.
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
    'href="(https:\\/\\/yuri-online\\.com\\/manga\\/' + slug +
    '\\/capitulo-([a-z0-9][a-z0-9-]*)\\/)"[^>]*>([^<]{0,80})<', "g");
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

// Contenido 18+: el ajuste del plugin lo desbloquea (desactivado por defecto)
function adultAllowed() {
  try { return kino.config.get("adulto") === true; } catch (e) { return false; }
}

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

// Imágenes de un capítulo (servidas por el mismo dominio, /__img/…)
function readerImages(html) {
  const urls = [];
  const seen = {};
  const re = /https:\/\/yuri-online\.com\/__img\/[A-Za-z0-9_\/.-]+\.(?:jpe?g|png|webp|avif)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!seen[m[0]]) { seen[m[0]] = true; urls.push(m[0]); }
  }
  if (!urls.length) {
    const re2 = /data-src="(https:\/\/yuri-online\.com\/wp-content\/uploads\/[^"]+\.(?:jpe?g|png|webp))"/g;
    while ((m = re2.exec(html)) !== null) {
      if (!seen[m[1]]) { seen[m[1]] = true; urls.push(m[1]); }
    }
  }
  return urls;
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
}

// caché de lector (últimos capítulos abiertos), para no volver a pedir
function readerCache(url) { return getJson("rc:" + url, null); }
function readerCachePut(url, images) {
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

function posterCard(item) {
  const titleRow = item.adult
    ? { type: "Row", gap: 6, children: [
        { type: "Badge", text: "18+" },
        { type: "Text", text: item.title, style: "caption", maxLines: 2, flex: 1 } ] }
    : { type: "Text", text: item.title, style: "caption", maxLines: 2 };
  return {
    type: "Card", key: "c-" + item.slug, flush: true,
    onTap: { event: "openSeries", arg: item.slug },
    children: [
      { type: "Image", url: item.poster, aspect: "2:3", alt: item.title,
        fallback: { type: "Column", padding: 12, children: [
          { type: "Icon", name: "list", color: "muted" },
          { type: "Text", text: "Sin portada", textEn: "No cover", style: "caption" } ] } },
      { type: "Column", padding: 8, gap: 2, children: [titleRow] },
    ],
  };
}

function gridOf(items, eventMore, loading, done) {
  const body = {
    type: "ListView", key: "grid", columns: { compact: 3, medium: 4, expanded: 6 }, gap: 12,
    items: items.map(posterCard),
    empty: { type: "Text", text: "Nada por aquí todavía.", textEn: "Nothing here yet.", color: "muted", padding: 16 },
  };
  if (eventMore && !done) {
    body.onEndReached = { event: eventMore };
    body.loadingMore = loading === true;
  }
  return body;
}

function historyList() {
  const p = progress();
  const rows = Object.keys(p).map((slug) => ({ slug, p: p[slug] }))
    .sort((a, b) => b.p.ts - a.p.ts).slice(0, 50);
  if (!rows.length) {
    return { type: "Text", text: "Todavía no has leído nada.", textEn: "You have not read anything yet.", color: "muted", padding: 16 };
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

function favGrid() {
  const f = favs();
  if (!f.length) {
    return { type: "Text", text: "Marca obras con el corazón para verlas aquí.", textEn: "Mark works with the heart to see them here.", color: "muted", padding: 16 };
  }
  return gridOf(f);
}

async function tabBody(state) {
  const tab = state.tab || "inicio";
  if (tab === "favoritos") return favGrid();
  if (tab === "historial") return historyList();
  if (tab === "biblioteca") {
    const items = Array.isArray(state.libItems) ? state.libItems : await fetchLibrary(1);
    return gridOf(items, "libMore", state.libLoading === true, state.libDone === true);
  }
  return await homeBody(state);
}

async function fetchLibrary(page) {
  const html = await getHtml("/manga/page/" + page + "/");
  return seriesCards(html, 36);
}

async function homeBody(state) {
  let items = Array.isArray(state.inicioItems) ? state.inicioItems : null;
  if (!items) {
    const html = await getHtml("/");
    items = seriesCards(html, 30);
  }
  return gridOf(items);
}

// ------------------------------------------------------------- rutas

async function detailTree(state) {
  const d = state.detail;
  if (!d) return { type: "Spinner" };
  const fav = isFav(d.slug);
  if (d.meta && d.meta.adult && !adultAllowed()) {
    return { type: "Column", padding: 16, gap: 8, children: [
      { type: "Icon", name: "lock", color: "muted" },
      { type: "Text", text: "Contenido 18+", textEn: "18+ content", style: "h3" },
      { type: "Text", text: "Esta obra está marcada como contenido para adultos. Activa «Mostrar contenido 18+» en Ajustes ▸ Plugins ▸ Yuri Online para leerla.", textEn: "This work is marked adult. Turn on \"Show 18+ content\" in Settings ▸ Plugins ▸ Yuri Online to read it.", color: "muted" },
    ] };
  }
  const head = {
    type: "Row", gap: 16, padding: 16, crossAxisAlignment: "start", stackOnNarrow: true,
    children: [
      { type: "Image", url: d.meta.poster, aspect: "2:3", alt: d.meta.title,
        fallback: { type: "Icon", name: "list" } },
      { type: "Column", gap: 6, flex: 2, crossAxisAlignment: "start", children: [
        { type: "Text", text: d.meta.title || d.slug, style: "h2" },
        d.meta.type ? { type: "Text", text: d.meta.type, color: "muted" } : null,
        d.meta.status ? { type: "Badge", text: d.meta.status } : null,
        d.meta.adult ? { type: "Badge", text: "18+" } : null,
        d.meta.genres ? { type: "Text", text: "Géneros: " + d.meta.genres, textEn: "Genres: " + d.meta.genres, color: "muted", style: "caption" } : null,
        { type: "Text", text: d.meta.overview, style: "body", color: "muted" },
        {
          type: "Row", gap: 8, wrap: true, children: [
            { type: "ElevatedButton", key: "start", icon: "play",
              labelText: "Empezar a leer", labelTextEn: "Start reading",
              onPressed: { event: "read", arg: "0" } },
            { type: "ElevatedButton", key: "latest", icon: "expand_more",
              labelText: "Leer lo último", labelTextEn: "Read latest",
              onPressed: { event: "read", arg: String(d.chapters.length - 1) } },
            { type: "IconButton", key: "fav", icon: fav ? "heart" : "star",
              labelText: fav ? "Quitar de favoritos" : "Añadir a favoritos",
              labelTextEn: fav ? "Remove favourite" : "Add favourite",
              onPressed: "fav" },
          ],
        },
      ].filter(Boolean) },
    ],
  };
  const items = [{ type: "Column", children: [head] }];
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
  return { type: "ListView", key: "detailBody", items };
}

async function readerTree(state) {
  const r = state.reader;
  if (!r) return { type: "Spinner" };
  const pages = r.images || [];
  const paged = (state.readMode || "cascada") === "paginada" && pages.length > 0 && pages.length <= 24;
  const ch = r.chapters[r.idx];
  const hasNext = r.idx + 1 < r.chapters.length;
  const hasPrev = r.idx > 0;
  const body = [];
  if (paged) {
    body.push({
      type: "PageView", key: "pv", children: pages.map((u, i) => ({
        type: "Image", key: "p" + i, url: u, alt: "Página " + (i + 1),
        fallback: { type: "Text", text: "Página " + (i + 1), color: "muted" },
      })),
    });
  } else {
    body.push({
      type: "ListView", key: "pages", gap: 4, padding: { compact: 4, expanded: 8 },
      items: pages.map((u, i) => ({
        type: "Image", key: "p" + i, url: u, alt: "Página " + (i + 1),
        fallback: { type: "Text", text: "Página " + (i + 1), color: "muted" },
      })),
      empty: { type: "Text", text: "Este capítulo no tiene páginas visibles.", textEn: "This chapter has no visible pages.", color: "muted", padding: 16 },
    });
  }
  body.push({
    type: "Row", gap: 12, padding: 16, mainAxisAlignment: "center", children: [
      { type: "ElevatedButton", icon: "arrow_back", labelText: "Anterior", labelTextEn: "Previous",
        onPressed: "prevChap", enabled: hasPrev },
      { type: "ElevatedButton", labelText: hasNext ? "Siguiente" : "Último capítulo",
        labelTextEn: hasNext ? "Next" : "Last chapter",
        icon: "arrow_forward", onPressed: "nextChap", enabled: hasNext },
    ],
  });
  return {
    type: "Scaffold",
    appBar: {
      title: ch ? ch.title : "Leyendo",
      actions: [
        { type: "IconButton", icon: "refresh", key: "mode",
          labelText: paged ? "Cambiar a cascada" : "Cambiar a paginado",
          labelTextEn: paged ? "Switch to webtoon" : "Switch to paged",
          onPressed: "mode" },
      ],
    },
    body: { type: "Column", children: body },
  };
}

async function searchTree(state) {
  const q = typeof state.resultsQ === "string" ? state.resultsQ : "";
  const results = Array.isArray(state.results) ? state.results : null;
  return {
    type: "Scaffold",
    appBar: {
      title: "Buscar obra", titleEn: "Search a work",
      actions: [],
    },
    body: {
      type: "ListView", key: "searchBody", items: [
        { type: "Form", key: "search", onSubmitted: "search", gap: 8, children: [
          { type: "TextField", key: "q", kind: "search", value: q,
            labelText: "Título", labelTextEn: "Title",
            hintText: "P. ej. Trash Flower", hintEn: "e.g. Trash Flower",
            required: true },
          { type: "ElevatedButton", icon: "search", labelText: "Buscar", labelTextEn: "Search", submit: true },
        ] },
        results ? gridOf(results) : { type: "Text", text: "Escribe un título y pulsa Buscar.", textEn: "Type a title and press Search.", color: "muted", padding: 16 },
      ].filter(Boolean),
    },
  };
}

// --------------------------------------------------------- los exports

export async function screen({ state, route }) {
  const r = route || { name: "home" };
  try {
    if (r.name === "detail") return await detailTree(state);
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
    if (name === "open") return null; // primer evento reservado
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
      return { toast: added ? "Añadida a favoritos" : "Quitada de favoritos" };
    }
    if (name === "read" || name === "nextChap" || name === "prevChap") {
      let chapters, idx, slug, title, poster;
      if (name === "read") {
        const d = state.detail;
        if (!d) return null;
        if (d.meta && d.meta.adult && !adultAllowed()) return null;
        chapters = d.chapters;
        idx = parseInt(String(ev.arg || "0"), 10) || 0;
        slug = d.slug; title = d.meta.title; poster = d.meta.poster;
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
      const reader = { slug, title, poster, chapters, idx, images };
      if (name === "read") return { state: { reader }, route: { push: "read" } };
      return { state: { reader } };
    }
    if (name === "mode") {
      const paged = (state.readMode || "cascada") === "paginada";
      return { state: { readMode: paged ? "cascada" : "paginada" } };
    }
    if (name === "openSeries") {
      const slug = String(ev.arg || "");
      if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null;
      const html = await getHtml("/manga/" + slug + "/");
      const meta = seriesMeta(html);
      const chapters = chapterList(html, slug);
      if (!chapters.length) return { toast: "No se encontraron capítulos." };
      return { state: { detail: { slug, meta, chapters } },
               route: { push: "detail", params: { slug } } };
    }
  } catch (e) {
    return { toast: "Algo falló: " + (e.code || "error") };
  }
  return null;
}

// Precarga de la pestaña Inicio al abrir (evento reservado "open")
// — ya cubierta por tabBody() si el estado viene vacío.
