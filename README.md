# Kino Plugin — Yuri Online

Plugin de [Kino](https://kinotvapp.github.io/kino-plugins/) para leer obras de [yuri-online.com](https://yuri-online.com/). Desde la **v2.0.0** comparte arquitectura y experiencia con el plugin de ZonaTM0: misma pantalla, mismos botones.

- **Autor**: Hotaru Yume (`hotaruyume`)
- **Inicio** (idéntico a ZonaTM0): «Seguir leyendo», «Mis favoritos» y **secciones por género** (Acción, Comedia, Fantasía, Romance, Drama) sin repetidos y con **«Ver más»**; todo se pinta al instante (esqueletos) y se rellena en segundo plano. **Biblioteca**, **Favoritos**, **Historial** (con «Olvidar» por pulsación larga y «Borrar todo») y **buscador**.
- **Detalle**: se abre al instante con esqueletos; portada, estado, géneros, sinopsis plegable, botón **«Seguir · Cap. N»** a todo el ancho, fila de iconos (Favoritos · Actualizar · Olvidar) y conmutador **«Desde lo último / Desde el principio»** para invertir el orden de los capítulos.
- **Lector SIEMPRE a pantalla completa** (como ZonaTM0): sin barras propias ni botón flotante; **«Anterior»/«Siguiente»** están una sola vez, en la tarjeta del final del capítulo. Modo **tira vertical** con zoom o **modo página a página** (Kino 0.9.81+), que retoma la página donde la dejaste.
- **Obras largas sin lío**: los capítulos viven en el almacenamiento del plugin, no en la pantalla — series con cientos de capítulos cargan igual (tope 490, los más recientes).
- **Sincronización entre aparatos** (`shared`): favoritos y progreso entre teléfono y TV vinculados.

## Instalación

Requiere **Kino 0.9.74+** (apiVersion 14). Añade `yumehotaru41-rgb/Kino-plugin-manga-Yuri-Online` en Ajustes ▸ Plugins ▸ + y actualiza a la versión **2.0.0**.

## Cambios en 2.0.0

- **Reescrito con la arquitectura de ZonaTM0**, a petición del usuario: misma pantalla de inicio (secciones por género, sin «Últimas obras»), mismos botones (detalle con «Seguir · Cap. N», fila de iconos, orden de capítulos), mismo lector **siempre a pantalla completa** con navegación solo en la tarjeta del final, y nada bloquea la pantalla (esqueletos + temporizador).
- **Contenido 18+**: se muestra la insignia «18+» en el detalle de las obras marcadas.
- Se conservan favoritos, «Seguir leyendo» e historial guardados.

## Cambios en 1.x

- **1.5.0**: Inicio por categorías. **1.4.3**: botón «Pantalla completa» en la barra del lector; riel «Seguir leyendo». **1.4.2**: páginas completas sin recortes. **1.4.0**: modo páginas, «Ir a capítulo», zoom. **1.2.0–1.3.2**: lector vertical, AJAX de capítulos, favoritos, historial, «Continuar», `shared`.

## Nota legal

Este plugin solo lee contenido público de yuri-online.com; no aloja ni redistribuye imágenes. Úsalo conforme a los términos del sitio.
