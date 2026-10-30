# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: fila de tarjetas nativas de Kino con las últimas obras y acceso directo a la búsqueda.
- **Biblioteca**: catálogo completo con «cargar más».
- **Favoritos** e **Historial** de lectura.
- **Buscador** por título (lupa en la barra superior y tarjeta en Inicio).
- **Detalle de obra**: portada completa (caja 2:3 a medida de póster), estado, géneros, sinopsis y **lista completa de capítulos** por AJAX (orden natural).
- **Lector webcómic vertical**: cada página se dibuja en una caja con la proporción real de la imagen (el sitio declara el ancho/alto de cada página), de modo que Kino no la recorta; botones Anterior/Siguiente y caché local.
- **«Ver en la web»**: botón en el detalle y en el lector para abrir el capítulo en el navegador, con las imágenes al 100% de fidelidad.
- **Teléfono y TV**: el mismo árbol de nodos; Kino dibuja el foco del mando.

## Nota técnica sobre las imágenes

El componente `Image` de Kino no tiene modo «ajustar sin recortar»: siempre rellena su caja recortando (*cover*). Para que cada página se vea completa, el plugin lee el ancho/alto en píxeles que el sitio declara en el HTML del capítulo y dimensiona la caja de cada página a esa misma proporción (con los tamaños en dp que Kino permite). En páginas sin dimensiones declaradas se usa una caja de proporción típica, donde puede quedar un recorte menor; el botón «Ver en la web» abre siempre la versión exacta del navegador.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Para desbloquearlas: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74 o superior** (apiVersion 14).

1. En Kino, ve a **Ajustes ▸ Plugins ▸ +**.
2. Añade: `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online`
3. Instala el plugin **Yuri Online** (si ya lo tenías, actualiza a la versión 1.2.2).

## Cambios en 1.2.2

- Lector: caja de cada página dimensionada a su proporción real (arregla el recorte en franjas; el componente Image de Kino siempre recorta a menos que la caja calce).
- Detalle: portada en caja 2:3 (proporción de póster) — sin recorte.
- Nuevo botón **«Ver en la web»** en el detalle y en el lector.

## Cambios anteriores

- **1.2.1**: páginas con ancho fijo por tamaño; tarjeta «Buscar obra» en Inicio.
- **1.2.0**: capítulos completos por AJAX (`POST /manga/<slug>/ajax/chapters/`), lector vertical, tarjetas nativas de Kino.

## Estructura

- `kino-plugin.json` — manifiesto · `plugin.js` — plugin tipo *screen* · `icon.png` — icono.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
