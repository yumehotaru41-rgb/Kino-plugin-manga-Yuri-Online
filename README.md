# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (últimas obras + favoritos), **Biblioteca**, **Favoritos** e **Historial**, más **buscador** por título.
- **Tarjetas propias de lectura**: las obras se muestran como tarjetas Card+Image del propio lector (no KinoItems de video). El título de cada tarjeta se reparte en dos filas para que las obras con nombre largo se lean completas.
- **Navegación real**: detalle y lector se abren como rutas dentro del lienzo, así que **Atrás retrocede** (lector → detalle → pestañas) en vez de salir.
- **Detalle de obra**: portada, estado, géneros, sinopsis y lista completa de capítulos por AJAX; botón **«Continuar»** donde lo dejaste.
- **Lector webcómic a pantalla completa**: tira vertical con páginas a ancho completo sin recortes, o **modo página a página** (Kino 0.9.81+) con barra de progreso; ambos con **zoom por pellizco**. Botón **«Ir a capítulo»** para saltar a cualquiera.
- **Ícono del plugin**: icon.png 96×96 declarado en el manifiesto (`icon` + `screen.iconFile`).
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.4.1**.

## Cambios en 1.4.1

- **Lector a pantalla completa en TV y PC**: las páginas usan ahora el ancho completo de la pantalla (`fill`), centradas y sin recortes; antes la caja de 640 px dejaba media pantalla vacía.
- **El ícono aparece**: añadidos al manifiesto `icon` (raíz) y `screen.iconFile` — sin esos campos Kino no muestra el icon.png aunque esté en el repo.

## Cambios en 1.4.0

- **Modo páginas** (Kino 0.9.81+): página a página con barra de progreso, zoom por pellizco y retomar donde quedaste (botón «Modo páginas» en el lector; un Kino anterior lo ignora).
- **«Ir a capítulo»**: desplegable en el lector para saltar a cualquier capítulo.
- **Zoom por pellizco** también en la tira vertical.
- **Páginas medidas**: las imágenes sin dimensiones en el HTML se miden descargando solo sus primeros bytes.

## Cambios anteriores

- **1.3.2**: sin menciones de contenido restringido en el manifiesto (no se oculta con el control parental); títulos de las tarjetas en dos filas.
- **1.3.1**: corregido el toque de las tarjetas (antes Kino las abría como video).
- **1.3.0**: Atrás retrocede dentro del lienzo (rutas empujadas).
- **1.2.9**: corregido el error «No se pudo cargar» del detalle sin progreso.
- **1.2.0–1.2.8**: lector vertical, capítulos por AJAX, favoritos, historial, «Continuar», sincronización `shared`, lector limpio, campos `author`/`creator`.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
