# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: fila «Últimas obras» y, justo debajo, «Mis favoritos»; tarjeta de búsqueda siempre visible.
- **Biblioteca**, **Favoritos** e **Historial** en pestañas.
- **Detalle de obra**: portada completa (caja 2:3), estado, géneros, sinopsis y **lista completa de capítulos** por AJAX.
- **Botón «Continuar»**: si ya empezaste una obra, el detalle ofrece seguir justo donde la dejaste.
- **Lector webcómic vertical**: solo las páginas reales del capítulo, cada una en una caja con su proporción real — sin recortes.
- **Pantalla completa (inmersivo)**: el lector oculta toda la interfaz y muestra el capítulo a pantalla completa. Un toque en cualquier página (o OK en el control de la TV) devuelve los botones; el botón «Pantalla completa» vuelve a ocultarlos.
- **Siguiente capítulo empieza arriba**: el scroll no conserva la posición al cambiar de capítulo.
- **Páginas más grandes** en celular horizontal y TV (se prioriza el área con recorte mínimo).
- **Sincronización entre aparatos**: favoritos y progreso de lectura viajan entre tu teléfono y tu TV vinculados (capacidad `shared` de Kino; se validan los datos recibidos).
- **Favoritos** con botón de texto claro y fila propia en Inicio.
- **«Ver en la web»** en detalle y lector.
- **Teléfono y TV** con el mismo árbol de nodos.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.4**.

## Cambios en 1.2.4

- **Modo inmersivo**: «Pantalla completa» oculta la interfaz del lector; un toque en una página (o OK en la TV) la devuelve.
- **Siguiente/anterior capítulo** arranca desde la primera página (antes conservaba el scroll).
- **«Continuar»** en el detalle de la obra: retoma el último capítulo leído.
- **Sincronización** de favoritos y progreso entre aparatos vinculados (nueva capacidad `shared`; funciona igual sin ella en Kinos antiguos).
- **Páginas más grandes** en pantallas medianas y anchas.

## Cambios anteriores

- **1.2.3**: páginas solo del bloque de lectura (adiós imágenes aleatorias); favoritos con texto claro y fila en Inicio.
- **1.2.2**: caja de cada página a su proporción real; portada 2:3; botón «Ver en la web».
- **1.2.1**: ancho fijo por tamaño; tarjeta de búsqueda en Inicio.
- **1.2.0**: capítulos completos por AJAX; lector vertical; tarjetas nativas de Kino.

## Estructura

- `kino-plugin.json` · `plugin.js` (plugin tipo *screen*) · `icon.png`

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
