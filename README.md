# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: fila «Últimas obras» y, justo debajo, «Mis favoritos»; tarjeta de búsqueda siempre visible.
- **Biblioteca**, **Favoritos** e **Historial** en pestañas.
- **Detalle de obra**: portada completa (caja 2:3), estado, géneros, sinopsis y **lista completa de capítulos** por AJAX.
- **Lector webcómic vertical**: solo las páginas reales del capítulo (extraídas del bloque de lectura del sitio, nunca banners ni portadas ajenas), cada una en una caja con su proporción real — sin recortes.
- **Favoritos** con botón de texto claro («Añadir/Quitar de favoritos») y fila propia en Inicio.
- **«Ver en la web»** en detalle y lector.
- **Teléfono y TV** con el mismo árbol de nodos.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.3**.

## Cambios en 1.2.3

- **Imágenes aleatorias arregladas**: la extracción de páginas se limita al bloque de lectura del capítulo (antes podía colarse cualquier imagen de la página, como banners o portadas de otras obras).
- **Favoritos**: botón de texto claro en el detalle y nueva fila «Mis favoritos» en Inicio, debajo de «Últimas obras».

## Cambios anteriores

- **1.2.2**: caja de cada página a su proporción real; portada 2:3; botón «Ver en la web».
- **1.2.1**: ancho fijo por tamaño; tarjeta de búsqueda en Inicio.
- **1.2.0**: capítulos completos por AJAX; lector vertical; tarjetas nativas de Kino.

## Estructura

- `kino-plugin.json` · `plugin.js` (plugin tipo *screen*) · `icon.png`

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
