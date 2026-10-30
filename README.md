# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: fila de tarjetas nativas de Kino con las últimas obras y acceso directo a la búsqueda.
- **Biblioteca**: catálogo completo con «cargar más».
- **Favoritos**: marca obras con el corazón.
- **Historial**: continúa donde lo dejaste (últimos 50).
- **Buscador** por título (lupa en la barra superior y tarjeta en Inicio).
- **Detalle de obra**: portada sin recortes (forma propia de la imagen), estado, géneros, tipo, sinopsis y **lista completa de capítulos**, cargada por el AJAX del sitio (orden natural: «33-5» entre 33 y 34).
- **Lector webcómic vertical**: cada página a su tamaño completo con ancho acotado — sin recortes ni orientación forzada. Botones Anterior/Siguiente capítulo y caché local.
- **Teléfono y TV**: el mismo árbol de nodos; Kino dibuja el foco del mando a distancia.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Para desbloquearlas: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74 o superior** (apiVersion 14).

1. En Kino, ve a **Ajustes ▸ Plugins ▸ +** (añadir repositorio).
2. Añade: `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online`
3. Instala el plugin **Yuri Online** (si ya lo tenías, actualiza a la versión 1.2.1).

## Cambios en 1.2.1

- Lector: páginas con ancho fijo por tamaño y la proporción propia de cada imagen — arregla el recorte en franjas horizontales de la 1.2.0.
- Búsqueda: además de la lupa de la barra superior, tarjeta «Buscar obra» siempre visible en Inicio.

## Cambios en 1.2.0

- Lista completa de capítulos por AJAX (`POST /manga/<slug>/ajax/chapters/`).
- Lector webcómic vertical; portada del detalle sin recorte.
- Tarjetas nativas de Kino (`titleRail`/`titleGrid`) en Inicio, Biblioteca, Favoritos y búsqueda.

## Estructura

- `kino-plugin.json` — manifiesto (id, versión, hosts, ajustes).
- `plugin.js` — plugin tipo *screen* (scraping + interfaz).
- `icon.png` — icono del plugin.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
