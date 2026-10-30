# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: portada con las obras destacadas del sitio.
- **Biblioteca**: catálogo completo con scroll infinito.
- **Favoritos**: marca obras con el corazón.
- **Historial**: continúa donde lo dejaste (últimos 50).
- **Buscador** por título.
- **Detalle de obra**: portada, estado, géneros, tipo, sinopsis y lista de capítulos en orden natural.
- **Lector**: modo cascada (webtoon) o paginado (≤24 páginas), botones Anterior/Siguiente capítulo y caché local.
- **Teléfono y TV**: el mismo árbol de nodos; Kino dibuja el foco del mando a distancia.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Para desbloquearlas: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74 o superior** (apiVersion 14).

1. En Kino, ve a **Ajustes ▸ Plugins ▸ +** (añadir repositorio).
2. Añade: `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online`
3. Instala el plugin **Yuri Online**.

## Estructura

- `kino-plugin.json` — manifiesto (id, versión, hosts, ajustes).
- `plugin.js` — plugin tipo *screen* (scraping + interfaz).
- `icon.png` — icono del plugin.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
