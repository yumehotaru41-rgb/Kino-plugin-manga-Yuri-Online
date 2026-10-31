# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (últimas obras + favoritos), **Biblioteca**, **Favoritos** e **Historial**.
- **Tarjetas propias de lectura**: las obras se muestran como tarjetas Card+Image del propio lector (no KinoItems de video), así que al tocarlas se abre el detalle para leer, no el reproductor de video de Kino.
- **Navegación real**: detalle y lector se abren como rutas dentro del lienzo, así que **Atrás retrocede** (lector → detalle → pestañas) en vez de salir.
- **Detalle de obra**: portada, estado, géneros, sinopsis y lista completa de capítulos por AJAX; botón **«Continuar»** donde lo dejaste. Las obras adultas muestran un pequeño aviso **18+** en la portada (sin bloqueo).
- **Lector webcómic vertical**: páginas grandes y centradas en TV y celular horizontal; en teléfono vertical cada caja calza con la proporción real, sin recortes. Controles: **solo «Anterior» y «Siguiente»**; cada cambio de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.3.1**.

## Cambios en 1.3.1

- **Corregido el toque de las tarjetas**: se usaban `KinoItem` (`kind: "movie"`) de `titleGrid`/`titleRail`, que Kino trata como títulos de su catálogo de video y abría como película. Ahora las rejillas y rieles usan tarjetas propias (`Card` + `Image` + `onTap`), así que tocar una obra abre su detalle para leer, con la navegación por rutas empujadas intacta (Atrás retrocede lector → detalle → pestañas).

## Cambios anteriores

- **1.3.0**: Atrás retrocede dentro del lienzo (rutas empujadas); sin restricción 18+ (solo aviso en portada).
- **1.2.9**: corregido el error «No se pudo cargar» del detalle sin progreso.
- **1.2.8**: sin `iconFile` ni `icon.png` (la validación del ícono bloqueaba la instalación).
- **1.2.7**: campos `author` y `creator`.
- **1.2.0–1.2.6**: lector vertical, capítulos por AJAX, favoritos, historial, «Continuar», sincronización `shared`, lector limpio.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
