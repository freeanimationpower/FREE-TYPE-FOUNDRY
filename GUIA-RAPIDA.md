# Free Type Foundry — Guía rápida

![Free Type Foundry](LOGO%20FREE%20TYPE%20FOUNDRY.png)

Editor de tipografías en el navegador: edita cada letra en su recuadro y exporta tu propia fuente TTF instalable.

## Empezar (3 pasos)

1. **Abrir:** doble clic en `index.html` (o `php -S 127.0.0.1:8899 -t .`).
2. **Crear:** la fuente ya viene en blanco con las letras básicas. O pulsa **Subir TTF/OTF** para partir de una fuente existente.
3. **Dibujar:** selecciona una celda, pulsa **Dibujar** (`B`) y traza la letra. Para editar puntos, usa **Mover** (`V`) y arrastra.

## Herramientas

| Botón | Tecla | Qué hace |
|---|---|---|
| Mover | `V` | Arrastrar puntos y contornos |
| Punto | `A` | Clic en un trazo añade un punto |
| Borrar | `D` | Clic en un punto lo elimina |
| Dibujar | `B` | Trazo libre → contorno vectorial |
| Línea | `L` | Contorno recto punto a punto (doble clic cierra) |
| Contorno | `E` | Borra un contorno (se marca en rojo antes) |

También: **Suavizar**, **Curva**, **Recta** (actúan sobre lo seleccionado) y **Vaciar**.

## Trucos

- Círculo naranja = qué letra es cada cuadro · código debajo.
- Línea roja = base de la letra · línea azul punteada = avance.
- Slider **Celda** (o `+` / `-`) agranda todas las celdas juntas.
- `Ctrl+Z` deshace · `Ctrl+Y` rehace · `Esc` cancela.
- **Guardar proyecto** genera un `.ftf` para continuar otro día.

## Exportar e instalar

**Exportar TTF** → descarga `mi-fuente.ttf` → doble clic → **Instalar**. Ya puedes usarla en Word, Photoshop o tu web.

## Notas

- 100% en tu navegador: nada se sube a servidores.
- Al importar, todo se normaliza a 1000 UPM → todas las letras quedan con tamaño estandarizado.
- Tu fuente es tuya: el editor es GPL v3.0, no lo que dibujas con él.

[Documentación completa](README.md) · [www.freeanimationpower.org](https://www.freeanimationpower.org)
