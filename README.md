# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (últimas obras + favoritos), **Biblioteca**, **Favoritos** e **Historial**.
- **Detalle de obra**: portada, estado, géneros, sinopsis y lista completa de capítulos por AJAX; botón **«Continuar»** donde lo dejaste y botón **Atrás** en la barra de título para volver a las pestañas.
- **Lector webcómic vertical**: páginas grandes y centradas en TV y celular horizontal (640 de ancho, proporción 2:3); en teléfono vertical cada caja calza con la proporción real, sin recortes. Controles: **solo «Anterior» y «Siguiente»**; cada cambio de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.9**.

## Cambios en 1.2.9

- **Corregido el error «No se pudo cargar (error)»**: la página de detalle se caía con cualquier obra sin progreso guardado (el botón «Continuar» leía un valor inexistente), así que ningún capítulo cargaba.
- **Corregido Atrás**: la página de detalle ahora tiene su propia barra de título con botón **Atrás** que vuelve a las pestañas (la tarjeta de una obra reabre la pantalla en el detalle, y el Atrás físico de Kino solo saca una ruta empujada).
- Mensajes claros cuando una obra no tiene capítulos o un capítulo no tiene páginas (en vez de un error genérico).
- Quitado el botón «Ver en la web» del detalle.

## Cambios anteriores

- **1.2.8**: sin `iconFile` ni `icon.png` (la validación del ícono bloqueaba la instalación).
- **1.2.7**: ícono 96×96 generado; campos `author` y `creator`.
- **1.2.6**: lector limpio (solo «Anterior»/«Siguiente»); cada capítulo empieza desde arriba.
- **1.2.4–1.2.5**: «Continuar», sincronización `shared`, páginas grandes en TV.
- **1.2.0–1.2.3**: lector vertical, capítulos por AJAX, favoritos, historial.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
