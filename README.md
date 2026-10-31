# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/), con una interfaz de lector de manga tipo Kototoro.

**Autor:** Hotaru Yume ([@hotaruyume](https://github.com/hotaruyume))

## Características

- **Inicio** («Últimas obras», «Mis favoritos»), **Biblioteca**, **Favoritos** e **Historial** en pestañas.
- **Detalle de obra**: portada 2:3, estado, géneros, sinopsis, **lista completa de capítulos** por AJAX, botón **«Continuar»** donde lo dejaste y «Ver en la web».
- **Lector webcómic vertical**:
  - **Cada página a ancho completo de la pantalla, con su proporción original: sin recortes.** La columna de páginas usa `stretch`, así cada imagen ocupa todo el ancho y su alto sale de la proporción de la propia imagen.
  - Fila de botones limpia: **Anterior / Siguiente**; modo inmersivo con ✕ flotante para volver.
  - Al cambiar de capítulo arranca desde la primera página.
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Contenido 18+

Las obras marcadas como adultas muestran un candado y **no se pueden leer por defecto**. Desbloqueo: **Ajustes ▸ Plugins ▸ Yuri Online ▸ Mostrar contenido 18+**.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.3.3**.

## Cambios en 1.3.3

- **Corregido el recorte de páginas**: la columna de páginas usaba alineación «center», así que cada imagen se dibujaba a su ancho natural en píxeles y quedaba cortada por los lados en el teléfono. Ahora usa «stretch»: cada página ocupa el ancho completo de la pantalla y el alto sale de la proporción original de la imagen — página entera, sin recortes, en teléfono y TV.

## Cambios en 1.3.2

- **Corregido**: al abrir una serie sin progreso guardado (la primera vez que la abrías), la pantalla mostraba «No se pudo cargar (error)» y ningún capítulo cargaba. Ahora muestra «Empezar a leer» y funciona.

## Cambios en 1.3.1

- **Carga de capítulos más robusta**: cada petición se reintenta hasta 3 veces con cabeceras de navegador; si la ruta relativa falla, se reintenta con la URL absoluta. El aviso de error ahora indica el código HTTP exacto, para saber si el sitio bloquea la petición.

## Cambios en 1.3.0

- **Páginas sin recortes**: cada página se pinta con su tamaño original de proporción, adaptada al ancho de la pantalla. Se eliminaron las cajas de proporción fija que provocaban recortes.

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
