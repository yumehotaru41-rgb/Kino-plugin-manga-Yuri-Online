# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (últimas obras + favoritos), **Biblioteca**, **Favoritos** e **Historial**.
- **Navegación real**: detalle y lector se abren como rutas dentro del lienzo, así que **Atrás retrocede** (lector → detalle → pestañas) en vez de salir.
- **Detalle de obra**: portada, estado, géneros, sinopsis y lista completa de capítulos por AJAX; botón **«Continuar»** donde lo dejaste. Las obras adultas muestran un pequeño aviso **18+** en la portada (sin bloqueo).
- **Lector webcómic vertical**: páginas grandes y centradas en TV y celular horizontal; en teléfono vertical cada caja calza con la proporción real, sin recortes. Controles: **solo «Anterior» y «Siguiente»**; cada cambio de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.3.0**.

## Cambios en 1.3.0

- **Atrás retrocede de verdad**: las tarjetas ahora entran al detalle como ruta empujada (`route: { push }`), así que el botón Atrás va lector → detalle → pestañas dentro del lienzo (antes `open: { screen }` hacía del detalle la raíz y Atrás cerraba el plugin).
- **Sin restricción 18+**: quitado el ajuste «Mostrar contenido 18+» y el candado. Las obras adultas solo llevan un aviso pequeño **18+** en la portada del detalle.
- Botón **Atrás** también en la barra de título del lector.

## Cambios anteriores

- **1.2.9**: corregido el error «No se pudo cargar» del detalle sin progreso; mensajes claros sin capítulos/páginas.
- **1.2.8**: sin `iconFile` ni `icon.png` (la validación del ícono bloqueaba la instalación).
- **1.2.7**: campos `author` y `creator`.
- **1.2.6**: lector limpio (solo «Anterior»/«Siguiente»); cada capítulo empieza desde arriba.
- **1.2.0–1.2.5**: lector vertical, capítulos por AJAX, favoritos, historial, «Continuar», sincronización `shared`, páginas grandes en TV.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
