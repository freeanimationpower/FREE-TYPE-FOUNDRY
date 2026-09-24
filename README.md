# Free Type Foundry

![Free Type Foundry](LOGO%20FREE%20TYPE%20FOUNDRY.png)

**Editor de tipografías 100% en el navegador.** Sube una fuente existente (TTF/OTF/WOFF), edita cada letra dentro de su propio recuadro — moviendo y añadiendo puntos Bézier o dibujando a mano alzada con presión de lápiz — y exporta tu propia fuente **TTF instalable** en Windows, macOS o Linux.

Parte del ecosistema **[Free Animation Power](https://www.freeanimationpower.org)** · Creado por Eduardo Fierro Duque · GPL v3.0

---

## Tabla de contenidos

1. [¿Qué es Free Type Foundry?](#qué-es-free-type-foundry)
2. [Características](#características)
3. [Cómo ejecutarla](#cómo-ejecutarla)
4. [Estructura de archivos](#estructura-de-archivos)
5. [El tablero de letras (planilla)](#el-tablero-de-letras-planilla)
6. [Las guías de cada recuadro](#las-guías-de-cada-recuadro)
7. [Herramientas de edición](#herramientas-de-edición)
8. [El motor geométrico](#el-motor-geométrico)
9. [Modelo de datos de un glifo](#modelo-de-datos-de-un-glifo)
10. [Importación de fuentes](#importación-de-fuentes)
11. [Exportación a TTF](#exportación-a-ttf)
12. [Guardar y abrir proyectos (.ftf)](#guardar-y-abrir-proyectos-ftf)
13. [Deshacer y rehacer](#deshacer-y-rehacer)
14. [Atajos de teclado](#atajos-de-teclado)
15. [Estandarización del tamaño de las letras](#estandarización-del-tamaño-de-las-letras)
16. [Pruebas automatizadas](#pruebas-automatizadas)
17. [Dependencias](#dependencias)
18. [Hoja de ruta](#hoja-de-ruta)
19. [Licencia y créditos](#licencia-y-créditos)

---

## ¿Qué es Free Type Foundry?

Free Type Foundry es una **fundición tipográfica digital en el navegador**. La idea central es sencilla: todas las letras y símbolos de una fuente viven en un **tablero de recuadros** — uno por carácter — y cada recuadro es un mini-editor vectorial independiente.

No necesitas instalar nada: se abre con doble clic. Todo el trabajo (importar, editar, exportar) ocurre en tu computador; nada se sube a ningún servidor.

### Flujo de trabajo típico

1. **Empieza de cero** con la fuente en blanco (viene con los caracteres ASCII y Latín-1 pre-creados) **o sube una fuente existente** para modificarla.
2. **Edita cada letra en su recuadro**: mueve puntos, añade curvas, dibuja trazos.
3. **Exporta el TTF** y lo instalas en tu sistema operativo para usarlo en Word, Photoshop, tu página web o cualquier programa.

---

## Características

| Función | Detalle |
|---|---|
| Importación | TTF, OTF, WOFF y WOFF2 (cualquier upm, se normaliza a 1000) |
| Tablero | Un recuadro por letra/símbolo, con su letra en un círculo naranja y su código Unicode |
| Edición de puntos | Puntos on-curve (cuadrados) y off-curve (círculos), arrastrables |
| Añadir puntos | Clic sobre cualquier trazo para insertar un punto que preserva la forma |
| Dibujo a mano alzada | Trazo con presión del lápiz que se convierte en contorno vectorial suavizado |
| Líneas rectas | Contornos polígono punto a punto |
| Curvas | Conversión recta ↔ curva por segmento, suavizado de esquinas |
| Borrado quirúrgico | Vista previa en rojo del contorno que se eliminaría |
| Avance (advance width) | Editable por glifo, visible como línea azul punteada |
| Guías métricas | Línea base, altura x, altura de mayúsculas, ascendente y descendente |
| Zoom global | Todas las celdas crecen juntas para editar cómodo |
| Exportación | TTF estándar con metadatos completos (nombre, diseñador, licencia) |
| Proyectos | Guardar/abrir como `.ftf` (JSON) para continuar otro día |
| Deshacer | Historial de 200 acciones con Ctrl+Z / Ctrl+Y |

---

## Cómo ejecutarla

La app es 100% estática (HTML + CSS + JS). Solo requiere internet la primera vez para cargar la librería `opentype.js` desde CDN.

**Opción A — directo (desarrollo):**
Doble clic en `index.html`.

**Opción B — servidor local (recomendado):**
```
php -S 127.0.0.1:8899 -t .
```
Y abrir `http://127.0.0.1:8899/index.html`

**Opción C — producción (como herramienta del hub):**
Se empaqueta como un único `tools/font/index.php` dentro del hub Free Animation Power, tras el email-gate de sesión, como el resto de las herramientas del ecosistema.

---

## Estructura de archivos

```
FREE-TYPE-FOUNDRY/
├── index.html                    # Interfaz completa (topbar, toolbar, tablero, footer)
├── style.css                     # Tema corporativo (negro + naranja del logo #ff3300)
├── favicon.png                   # Logo a 64x64 (generado desde el logo original)
├── LOGO FREE TYPE FOUNDRY.png    # Logo oficial (1254x1254)
├── js/
│   ├── geometry.js               # Motor geométrico de contornos Bézier (cero dependencias)
│   ├── importer.js               # Parse de fuentes TTF/OTF/WOFF → modelo interno
│   ├── exporter.js               # Modelo interno → TTF instalable + proyectos .ftf
│   ├── editor.js                 # GridEditor: render + interacción del tablero
│   └── main.js                   # Estado global, UI, undo/redo, atajos
├── tests/
│   ├── geometry.js               # 19 tests unitarios del motor (Node)
│   ├── export.js                 # Roundtrip TTF: generar → re-leer → verificar (Node)
│   ├── import-real.js            # Importa arial.ttf real y verifica contornos (Node)
│   ├── flip.js                   # Inspección de comandos exportados (Node)
│   └── harness.html              # 14 tests integrales en navegador real
├── docs/
│   ├── DOCUMENTACION_FREE_TYPE_FOUNDRY.html   # Documentación completa (fuente del PDF)
│   └── DOCUMENTACION_FREE_TYPE_FOUNDRY.pdf    # PDF con logo y documentación completa
├── GUIA-RAPIDA.md                # Guía simplificada (lo esencial en 2 minutos)
└── README.md                     # Este documento
```

### Responsabilidades de cada módulo JS

**`js/geometry.js`** — Puro, sin dependencias, funciona en Node y navegador. Define:
- `normalizeContour()`: resuelve los puntos implícitos de TrueType (dos off-curve consecutivos generan un on-curve en el punto medio) y garantiza que cada contorno empiece en un punto on-curve.
- `eachSegment()`: itera los segmentos de un contorno (rectos y cuadráticos).
- `commandsToContours()` / `contoursToCommands()`: conversión entre el formato de comandos de `opentype.js` (M, L, Q, C, Z) y el modelo interno de puntos.
- `cubicToQuadratic()`: aproximación recursiva de una cúbica por cuadráticas con tolerancia de 0.5 unidades (necesario porque TrueType solo admite cuadráticas).
- `insertPointOnSegment()`: inserta un punto en un segmento. Si es curvo, divide la cuadrática por de Casteljau conservando la forma exacta.
- `removePointAt()`, `smoothAt()`, `setSegmentCurved()`: edición estructural.
- `strokeToContour()`: convierte un trazo a mano alzada (con presión) en un contorno cerrado: calcula offset izquierdo/derecho, simplifica con Ramer–Douglas–Peucker y suaviza con Chaikin.
- `glyphNameFor()`: convención de nombres (`A`, `space`, `uni00E1`).

**`js/importer.js`** — `parseFont(buffer)`:
1. `opentype.parse()` lee el binario.
2. Normaliza la escala: `factor = 1000 / unitsPerEm` (todas las fuentes entran al espacio de 1000 UPM).
3. Itera `font.glyphs.get(i)` y conserva solo glifos con Unicode asignado (primer glifo por código).
4. Convierte los comandos de cada glifo a contornos internos y escala coordenadas y avance.
5. Devuelve `{ familyName, glyphs: Map, count }`.

`defaultGlyphSet()` crea la fuente en blanco: códigos 32–126 y 161–255 con contornos vacíos y avance 620.

**`js/exporter.js`** — Hace el camino inverso:
- `buildFont(project)`: crea `.notdef` (obligatorio, glifo 0), ordena por Unicode, construye cada `opentype.Glyph` con su `Path` de comandos Q y escribe metadatos completos (family, subfamily, fullName, postScriptName, designer, manufacturer, licencia GPL, versión, copyright).
- `font.toArrayBuffer()` produce el binario TTF.
- `serializeProject()` / `deserializeProject()`: formato `.ftf`.

**`js/editor.js`** — `FTGridEditor`, el corazón visual:
- `setGlyphs(map, list)`: construye las celdas DOM (canvas + etiquetas) y las dibuja con render diferido (`IntersectionObserver` para que importar miles de glifos no congele la página).
- `drawCell()`: pinta guías, glifo (relleno negro intenso), puntos, selección, borrador y vista previa de trazo.
- Transformación mundo↔celda con **eje Y volteado** (el espacio tipográfico crece hacia arriba; la pantalla hacia abajo). Esto es lo que evita que las letras se importen "cabeza abajo".
- Hit-testing de puntos (7px) y segmentos (muestreo de 25 puntos en curvas).
- Gestión de herramientas y arrastre con Pointer Events + captura de puntero.
- `_commit()` alimenta el historial undo/redo con snapshots antes/después.

**`js/main.js`** — Orquestación:
- Estado global (`familyName`, `glyphs: Map`, `selected`).
- Planilla con filtros (Básico, Latín-1, Puntos, Todo) y buscador.
- Undo/redo (200 entradas) con restauración por glifo.
- Topbar: nueva fuente, subir, guardar/abrir proyecto, exportar.
- Atajos de teclado y control del slider de tamaño de celda.

---

## El tablero de letras (planilla)

El tablero es una cuadrícula de **6 columnas centradas** que fluye hacia abajo. Cada celda contiene:

- **Lienzo blanco**: la letra dibujada en negro intenso con sus puntos de edición visibles.
- **Círculo naranja** (esquina superior izquierda): la letra o símbolo que representa esa celda, en negro.
- **Código Unicode** (esquina inferior derecha): el valor hexadecimal del carácter sobre pastilla naranja translúcida.
- **Línea azul punteada**: el avance del glifo.

### Filtros

| Filtro | Rango | Uso típico |
|---|---|---|
| Básico | U+0020 – U+007E | Mayúsculas, minúsculas, números y signos comunes |
| Latín-1 | U+00A1 – U+00FF | Acentos: á, é, í, ó, ú, ñ, ¿, ¡... |
| Puntos | Signos de puntuación | , . ; : ! ? ... |
| Todo | Todos los glifos | Ver la fuente completa (importada) |

El buscador acepta el carácter (`A`), el código (`0041`) o el nombre del glifo.

### Añadir un glifo nuevo

Botón **+ Glifo** → escribe el carácter o su código hex. Si ya existe, se selecciona; si no, se crea vacío y se agrega a la fuente.

### Tamaño de celda

El slider **Celda** (80–260px) agranda o reduce **todas** las celdas a la vez manteniendo la misma escala relativa, de modo que editar un detalle fino es tan fácil como ver la fuente completa. Equivalente por teclado: `+`, `-` y `0` (reset a 140px).

---

## Las guías de cada recuadro

Cada recuadro muestra las líneas métricas del diseño tipográfico, todas en el espacio de 1000 UPM:

| Guía | Valor (y) | Color | Significado |
|---|---|---|---|
| Ascendente | +800 | Gris claro | Tope superior de letras como b, d, h |
| Altura mayúsculas | +700 | Verde | Tope de A, B, C... |
| Altura x | +500 | Azul | Tope de las minúsculas sin asta (a, e, o) |
| **Línea base** | **0** | **Roja** | Donde se apoyan todas las letras |
| Descendente | −200 | Gris claro | Tope inferior de g, p, q, y |
| Origen | x = 0 | Gris claro | Margen izquierdo de la letra |
| Avance | x = avance | Azul punteado | Dónde empieza la siguiente letra |

Al estar todas las celdas en la misma escala, las guías permiten comparar visualmente el tamaño de cada letra contra las demás.

---

## Herramientas de edición

| Herramienta | Tecla | Comportamiento |
|---|---|---|
| **Mover** | `V` | Arrastra puntos on-curve (cuadrados blancos) y off-curve (círculos naranjas). Al mover un punto on-curve, sus controles adyacentes se mueven con él. Arrastrar sobre un trazo mueve el contorno entero. Clic sobre un trazo lo selecciona (amarillo… en naranja) para convertirlo en curva o recta. |
| **Punto** | `A` | Clic sobre un trazo inserta un punto que **preserva la forma** (en curvas, divide la cuadrática exactamente en el punto de clic). |
| **Borrar** | `D` | Clic sobre un punto lo elimina y re-normaliza el contorno (si quedan dos off-curve consecutivos, se inserta el on-curve implícito). |
| **Dibujar** | `B` | Trazo libre con presión de lápiz. Al soltar, el trazo se convierte en contorno vectorial cerrado y suavizado. El grosor base se ajusta con el slider "Grosor" (10–200 unidades). |
| **Línea** | `L` | Clic por clic construye un contorno de segmentos rectos. Doble clic o `Enter` lo cierra y lo añade. `Esc` cancela. |
| **Contorno** | `E` | Borra un contorno completo. Al pasar el cursor, el contorno objetivo se resalta **en rojo punteado**; solo se elimina si el clic cae exactamente sobre el trazo (4.5px), evitando borrados accidentales. |

### Botones de edición estructural

| Botón | Efecto |
|---|---|
| **Suavizar** | Convierte la esquina del punto seleccionado en curva continua (alinea el control opuesto) |
| **Curva** | Convierte el segmento seleccionado en curva (añade un control en el punto medio) |
| **Recta** | Convierte el segmento seleccionado en línea recta (elimina su control) |
| **Vaciar** | Elimina todos los contornos del glifo seleccionado (con confirmación) |

### El avance (advance width)

El campo **Avance** de la barra inferior define cuánto se desplaza el cursor tras dibujar la letra. Se refleja al instante como línea azul punteada en la celda. Es editable por glifo y parte del historial de deshacer.

---

## El motor geométrico

### Por qué Bézier cuadráticas

El formato **TrueType** (`.ttf`) representa los contornos con **curvas Bézier cuadráticas**: secuencias de puntos donde cada segmento entre dos puntos *on-curve* puede tener un punto *off-curve* de control. En cambio, **CFF/OTF** usa cúbicas. Free Type Foundry trabaja internamente **siempre con cuadráticas**, así que:

- Lo que ves en pantalla es exactamente lo que se exporta.
- Al importar una OTF, cada cúbica se convierte a cuadráticas con una tolerancia de 0.5 unidades (invisible al ojo, dentro del límite de precisión del formato).

### Regla de oro de TrueType

Dos puntos off-curve consecutivos implican un punto on-curve en su punto medio. El motor aplica esta regla en `normalizeContour()`, lo que garantiza que cada contorno siempre sea una secuencia válida: on-curve, (off-curve), on-curve...

### Del trazo libre al contorno

Cuando dibujas con la herramienta **Dibujar**, el motor:

1. Registra las muestras del puntero con su **presión** (0–1).
2. Calcula un **offset izquierdo y derecho** perpendicular a la trayectoria, con ancho proporcional a la presión (`grosor × (0.25 + 0.75 × presión)`).
3. Simplifica el polígono resultante con **Ramer–Douglas–Peucker** (tolerancia 1.5).
4. Suaviza las esquinas con **Chaikin** (subdivisión de esquinas), generando el patrón alternado on/off-curve.
5. Normaliza y añade el contorno al glifo.

---

## Modelo de datos de un glifo

```js
{
  unicode: 65,                    // Código Unicode (65 = 'A')
  name: 'A',                      // Nombre del glifo ('space', 'uni00E1'...)
  advanceWidth: 620,              // Avance en unidades (1000 UPM)
  contours: [                     // Lista de contornos cerrados
    [                             // Contorno = lista de puntos en orden
      { x: 100, y: 0,    on: true  },   // on-curve (esquina)
      { x: 180, y: 350,  on: false },   // off-curve (control)
      { x: 260, y: 0,    on: true  },
      { x: 260, y: 700,  on: true  }
    ]
  ]
}
```

El **sentido del giro** de cada contorno determina el relleno en la convención non-zero de TrueType, pero como el editor pinta el glifo con relleno negro sólido even-odd, el usuario no necesita gestionar direcciones manualmente.

---

## Importación de fuentes

1. Botón **Subir TTF/OTF** → se abre el selector de archivos (`.ttf`, `.otf`, `.woff`, `.woff2`).
2. `FileReader` carga el binario como `ArrayBuffer`.
3. `opentype.parse()` interpreta las tablas (cmap, glyf/CFF, hmtx, head...).
4. Se normaliza a **1000 UPM** multiplicando coordenadas y avances por `1000/unitsPerEm` (Arial usa 2048; Roboto, 2048; OTF suelen usar 1000).
5. Solo se importan glifos con Unicode asignado y no duplicados; `.notdef` se regenera en la exportación.
6. El tablero se rellena con las celdas correspondientes y se selecciona la primera letra dibujada.

> Importar una fuente **no** sube el archivo a ningún servidor: todo el parse ocurre en memoria, en tu navegador.

---

## Exportación a TTF

1. Botón **Exportar TTF** (naranja).
2. Se construye la fuente: `.notdef` como glifo 0 + glifos ordenados por Unicode, cada uno con su `Path` de comandos M/L/Q/Z.
3. Metadatos escritos en la tabla `name`: familia, subfamilia Regular, nombre completo, PostScript, diseñador (Eduardo Fierro Duque), fabricante y URL (Free Animation Power), licencia GPL v3.0, versión y copyright.
4. `toArrayBuffer()` genera el binario; se descarga como `<nombre>.ttf`.

### Instalación

- **Windows:** doble clic → *Instalar*.
- **macOS:** doble clic → *Instalar fuente*.
- **Linux:** copiar a `~/.fonts` o `/usr/share/fonts` y ejecutar `fc-cache -f`.

La fuente queda disponible en Word, Photoshop, Blender, navegadores y cualquier programa que liste fuentes del sistema.

---

## Guardar y abrir proyectos (.ftf)

El formato `.ftf` es un JSON con todo el estado editable:

```json
{
  "app": "freetypefoundry",
  "version": 1,
  "savedAt": "2026-09-24T12:00:00.000Z",
  "familyName": "Mi Fuente",
  "glyphs": [
    {
      "unicode": 65,
      "name": "A",
      "advanceWidth": 620,
      "contours": [ [ [100, 0, 1], [180, 350, 0], [260, 0, 1] ] ]
    }
  ]
}
```

Cada punto se serializa como `[x, y, on]` (on = 1|0). Al abrir, se valida el campo `app` para evitar cargar archivos ajenos.

---

## Deshacer y rehacer

- Historial de **200 entradas** con snapshots completos (contornos + avance) del glifo afectado.
- `Ctrl+Z` deshace · `Ctrl+Y` (o `Ctrl+Shift+Z`) rehace · botones en la toolbar.
- Cada acción muestra un toast con su nombre y el recordatorio `Ctrl+Z deshace`.
- El historial sobrevive al cambio de celda: deshacer afecta al glifo correcto aunque ya no esté seleccionado.

---

## Atajos de teclado

| Tecla | Acción |
|---|---|
| `V` | Mover |
| `A` | Añadir punto |
| `D` | Borrar punto |
| `B` | Dibujar |
| `L` | Línea |
| `E` | Borrar contorno |
| `Ctrl+Z` / `Ctrl+Y` | Deshacer / Rehacer |
| `Enter` | Cerrar contorno (herramienta Línea) |
| `Esc` | Cancelar contorno en curso / quitar selección |
| `+` / `-` | Agrandar / reducir celdas |
| `0` | Tamaño de celda por defecto (140px) |

---

## Estandarización del tamaño de las letras

Todas las celdas comparten la **misma ventana de coordenadas** (x: −100 a 1080 · y: −300 a 860) y la **misma escala**. Al importar, todo se normaliza a 1000 UPM. Resultado: una letra que toca la altura de mayúsculas en su celda tiene exactamente el mismo tamaño físico en la fuente final que cualquier otra. Esto evita el problema clásico de las fuentes caseras donde cada letra termina con un tamaño distinto.

---

## Pruebas automatizadas

Requiere Node.js ≥ 18 (solo para tests; la app no lo necesita).

```
npm install        # instala opentype.js (única dependencia, solo tests)
node tests/geometry.js       # 19 tests del motor geométrico
node tests/export.js         # roundtrip: TTF generado → re-leído → verificado
node tests/import-real.js    # importación de arial.ttf real (upm 2048 → 1000)
node tests/flip.js           # inspección de comandos exportados
```

El harness de navegador `tests/harness.html` (14 pruebas integrales: grid, transformaciones, hit-testing, edición, exportación) se ejecuta abriéndolo en cualquier navegador o con:

```
php -S 127.0.0.1:8899 -t .
# abrir http://127.0.0.1:8899/tests/harness.html
```

---

## Dependencias

- **`opentype.js` 1.3.4** (MIT, vía CDN jsdelivr) — única dependencia de runtime. Es la tercera excepción CDN del ecosistema Free Animation Power (tras p5.js en Glitch y jsPDF en Storyboard), justificada porque escribir un parser TrueType/CFF desde cero multiplicaría el código por 20.
- Todo lo demás es **vanilla JS, CSS y HTML sin frameworks**, siguiendo la regla de cero dependencias del ecosistema.

---

## Hoja de ruta

- [ ] Edición de kerning por pares (tabla `kern`)
- [ ] Múltiples pesos/estilos por proyecto
- [ ] Ajuste de side bearings arrastrando en pantalla
- [ ] Plantilla base con proporciones clásicas (roman, cursiva)
- [ ] Previsualización de frase de prueba en vivo
- [ ] Exportar WOFF2
- [ ] Integración al hub (tools/font/index.php single-file)

---

## Licencia y créditos

- **Código:** GNU General Public License v3.0 (GPLv3).
- **Autor:** Eduardo Fierro Duque — [fierroduque.com](https://fierroduque.com)
- **Ecosistema:** [www.freeanimationpower.org](https://www.freeanimationpower.org)
- **GitHub:** [github.com/freeanimationpower](https://github.com/freeanimationpower)

Las fuentes que crees con esta herramienta son **tuyas**: la GPL cubre el editor, no lo que dibujas con él.
