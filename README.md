# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

## Características

- **Inicio**: fila «Últimas obras» y «Mis favoritos»; **Biblioteca**, **Favoritos** e **Historial** en pestañas.
- **Detalle de obra**: portada completa (caja 2:3), estado, géneros, sinopsis y **lista completa de capítulos** por AJAX; botón **«Continuar»** donde lo dejaste.
- **Lector webcómic vertical**:
  - **Páginas grandes en TV y celular horizontal**: cada página se dibuja a 640 de ancho con proporción 2:3, centrada — llena la pantalla.
  - En teléfono vertical la caja calza con la proporción real de cada página: **sin recortes**.
  - **Pantalla completa (inmersivo)**: oculta todos los botones; queda solo un botón flotante (✕) para volver a mostrar los controles — enfocable con el control remoto (OK) y tocable en el teléfono.
  - **Zoom**: botón «Zoom» que muestra cada página a 640 de ancho dentro de un desplazamiento horizontal — arrastra a los lados para leer los textos pequeños (Kino no tiene zoom de pellizco).
  - Al cambiar de capítulo el lector arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados, validando lo recibido.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.5**.

## Cambios en 1.2.5

- **Páginas mucho más grandes en TV** (640 de ancho, proporción 2:3, centradas): llenan la pantalla en vez de quedar pequeñas con márgenes.
- **Modo inmersivo arreglado**: el control remoto ya no se traba (las imágenes de Kino no reciben foco ni tap; ahora el control es un botón flotante enfocable y tocable).
- **Zoom** con arrastre lateral para textos pequeños (en vez del pellizco, que el lienzo de Kino no soporta).

## Cambios en 1.2.4

- Modo inmersivo, «Continuar» donde lo dejaste, cambio de capítulo desde arriba, sincronización `shared`, páginas más grandes.

## Cambios anteriores

- **1.2.3**: páginas solo del bloque de lectura; favoritos con texto claro y fila en Inicio.
- **1.2.2**: caja de cada página a su proporción real; portada 2:3; «Ver en la web».
- **1.2.1**: ancho fijo por tamaño; tarjeta de búsqueda en Inicio.
- **1.2.0**: capítulos completos por AJAX; lector vertical; tarjetas nativas.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
