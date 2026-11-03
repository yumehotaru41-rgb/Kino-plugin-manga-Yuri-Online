# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/).

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio**: últimas obras, **Seguir leyendo** (lo que empezaste, automáticamente) y favoritos; **Biblioteca**, **Favoritos**, **Historial** y **buscador** por título.
- **Tarjetas propias de lectura** con el título en dos filas; **navegación real** (Atrás retrocede lector → detalle → pestañas).
- **Detalle de obra**: portada, estado, géneros, sinopsis y capítulos por AJAX; botón **«Continuar»**.
- **Lector webcómic**: páginas verticales enteras a ancho de pantalla, sin recortes; tira vertical o **modo página a página** (Kino 0.9.81+), con **zoom por pellizco**, **«Ir a capítulo»** y **«Pantalla completa»** que oculta las barras (se recuerda).
- **Ícono del plugin**: icon.png 96×96 declarado en el manifiesto (`icon` + `screen.iconFile`).
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **1.4.3**.

## Cambios en 1.4.3

- **Botón «Pantalla completa» visible siempre**: además del ojo en la barra superior, ahora hay un botón «Pantalla completa» en la barra inferior del lector (donde están Anterior/Ir a capítulo/Siguiente).
- **«Seguir leyendo» en Inicio**: las obras que empezaste aparecen automáticamente en un riel debajo de «Últimas obras», las más recientes primero.

## Cambios en 1.4.2

- **Páginas verticales completas, sin recortes**: `fit: "width"` con la proporción real medida de cada página.
- **Modo pantalla completa**: oculta barra superior y botones; botoncito flotante para traerlos de vuelta.

## Cambios anteriores

- **1.4.1**: lector a pantalla completa en TV/PC (`fill`); ícono declarado en el manifiesto.
- **1.4.0**: modo páginas, «Ir a capítulo», zoom por pellizco, páginas medidas.
- **1.3.2**: sin menciones restringidas en el manifiesto (control parental); títulos en dos filas.
- **1.3.1**: corregido el toque de las tarjetas. **1.3.0**: Atrás retrocede dentro del lienzo. **1.2.9**: fix «No se pudo cargar». **1.2.0–1.2.8**: lector vertical, AJAX, favoritos, historial, «Continuar», `shared`.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
