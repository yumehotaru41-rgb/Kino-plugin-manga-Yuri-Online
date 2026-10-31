# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (últimas obras + favoritos), **Biblioteca**, **Favoritos** e **Historial**.
- **Detalle de obra**: portada, estado, géneros, sinopsis y lista completa de capítulos por AJAX; botón **«Continuar»** donde lo dejaste.
- **Lector webcómic vertical**: páginas grandes y centradas en TV y celular horizontal (640 de ancho, proporción 2:3); en teléfono vertical cada caja calza con la proporción real, sin recortes. Controles: **solo «Anterior» y «Siguiente»**; cada cambio de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.7**.

## Cambios en 1.2.7

- **Ícono conforme a Kino**: PNG de 96×96 px con fondo transparente (antes 256×256, lo que bloqueaba la instalación).
- Nuevos campos `author` y `creator` en el manifiesto.

## Cambios anteriores

- **1.2.6**: lector limpio (solo «Anterior»/«Siguiente»); cada capítulo empieza desde arriba.
- **1.2.5**: páginas grandes en TV; modo zoom.
- **1.2.4**: «Continuar», sincronización `shared`.
- **1.2.0–1.2.3**: lector vertical, capítulos por AJAX, favoritos, historial.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
