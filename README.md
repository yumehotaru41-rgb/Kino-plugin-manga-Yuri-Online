# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

**Autor:** Hotaru Yume ([@hotaruyume](https://github.com/hotaruyume))

## Características

- **Inicio** («Últimas obras», «Mis favoritos»), **Biblioteca**, **Favoritos** e **Historial** en pestañas.
- **Detalle de obra**: portada 2:3, estado, géneros, sinopsis, **lista completa de capítulos** por AJAX, botón **«Continuar»** donde lo dejaste y «Ver en la web».
- **Lector webcómic vertical**:
  - **Páginas grandes en TV y celular horizontal** (640 de ancho, proporción 2:3, centradas); en teléfono vertical la caja calza con la proporción real: sin recortes.
  - Fila de botones limpia: **Anterior / Siguiente**.
  - Al cambiar de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Icono

El icono de pantalla (`screen.iconFile`) exige **PNG de 96×96 px, fondo transparente y máximo 24 KB**; uno que no cumpla hace que Kino rechace la instalación/actualización. Por ahora el plugin usa el icono por defecto de Kino. Para poner el propio: exporta tu dibujo a 96×96 px **con fondo transparente**, súbelo como `icon.png` al repo y vuelve a añadir `"iconFile": "icon.png"` en el bloque `screen` del manifiesto.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.2.9**.

## Cambios en 1.2.9

- Lector con solo **Anterior / Siguiente**: quitados los botones «Pantalla completa» y «Ver en la web» del lector.

## Cambios en 1.2.8

- Sin `iconFile` de pantalla mientras el PNG no cumpla (96×96, transparente, ≤24 KB).

## Cambios en 1.2.7

- Manifiesto con **autor** (Hotaru Yume) y campo de icono raíz correcto (`icon`).

## Cambios en 1.2.6

- ✕ pequeña para salir de pantalla completa; posición conservada al alternar; sin botón Zoom.

## Cambios en 1.2.5

- Páginas mucho más grandes en TV; modo inmersivo con botón flotante enfocable.

## Cambios en 1.2.4

- Modo inmersivo, «Continuar», cambio de capítulo desde arriba, sincronización `shared`.

## Cambios anteriores

- **1.2.3**: páginas solo del bloque de lectura; favoritos con texto claro y fila en Inicio.
- **1.2.2**: caja de cada página a su proporción real; portada 2:3; «Ver en la web».
- **1.2.1**: ancho fijo por tamaño; tarjeta de búsqueda en Inicio.
- **1.2.0**: capítulos completos por AJAX; lector vertical; tarjetas nativas.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
