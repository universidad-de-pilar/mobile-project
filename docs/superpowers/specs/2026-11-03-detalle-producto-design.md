# Detalle de producto en el autopedido — diseño

Fecha: 2026-11-03
Referencia UX: menú de DexOrder (modal de detalle con imagen grande, descripción completa, cantidad y botón "Agregar · $total"). Se copia el patrón de interacción, no la marca: se mantienen los tokens de `ui/mostrador/tokens.ts`.

## Problema

En el catálogo del cliente (`mobile/src/app/[storeSlug]/index.tsx`) solo se puede tocar "+" en la card. La descripción se corta a 2 líneas, la imagen es de 88px y no hay forma de agregar varias unidades de una vez.

## Alcance

Incluye:
- Abrir un detalle al tocar la card de producto.
- Elegir cantidad y agregar al carrito desde el detalle.

Excluye (YAGNI): modificadores, búsqueda, scroll continuo con scrollspy, landing de categorías, ruta/deep link al producto.

## Decisiones

- **Presentación:** `Modal` de React Native con estado local en el catálogo (sin ruta nueva ni refetch). Limitación aceptada: en web el "atrás" del navegador no cierra el modal.
- **Botón "+" de la card:** sigue agregando 1 unidad sin abrir el detalle. Tocar el resto de la card abre el detalle.

## Componentes

### `ProductDetailSheet` (nuevo, `mobile/src/components/ui/mostrador/product-detail-sheet.tsx`)

Presentacional. Props:
- `product: { name: string; description?: string | null; price: string; imageUrl?: string | null } | null` (con `null` el modal está cerrado)
- `maxQuantity: number` (unidades que todavía se pueden agregar)
- `onClose: () => void`
- `onAdd: (quantity: number) => void`

Comportamiento:
- En mobile se muestra como bottom sheet (alto máximo ~90%) y en pantallas anchas (`useWide`) como diálogo centrado de 520px de ancho máximo.
- Contenido: la imagen en 4:3, con el placeholder `image-outline` sobre `primarySoft` si no hay imagen. Después el nombre, la descripción completa con scroll si es larga, el precio unitario, el `Stepper` existente (de 1 a `maxQuantity`) y el botón primario "Agregar · $total", donde el total es precio × cantidad.
- La cantidad arranca en 1 cada vez que se abre.
- Si `maxQuantity` es 0, el botón queda deshabilitado y aparece el texto "Ya tenés el máximo de este producto (50)".
- Se cierra con la X (`accessibilityLabel="Cerrar"`), tocando el fondo, o con Esc/back de Android vía `onRequestClose`.

### `ProductCard` (cambio)

- Nueva prop `onPress?: () => void`. La card pasa a ser un `Pressable` con `accessibilityRole="button"`.
- El "+" mantiene `onAdd` y no dispara `onPress`.

### Catálogo (`index.tsx`)

- Estado nuevo: `selected: PublicProduct | null`.
- `maxQuantity = MAX_QUANTITY - (cantidad de ese producto en el carrito)`.
- `onAdd(q)` llama a `addProduct(product, q)`, cierra el sheet y actualiza `capReached` con el resultado, para que se muestre el aviso existente si se superó el tope de 50 líneas.

## Reglas de carrito

- `addLine(lines, product, quantity = 1)`:
  - Si existe una línea del producto, la cantidad queda en `existente + quantity`, limitada a `MAX_QUANTITY`.
  - Si no existe y hay menos de `MAX_LINES` líneas, se agrega una línea con `quantity`, limitada a entre 1 y `MAX_QUANTITY`.
  - Si no existe y ya hay `MAX_LINES` líneas, se rechaza (`rejected: true`), igual que hoy.
- La firma de `CartContext.addProduct` pasa a ser `(product, quantity?)`, y `quantity` toma 1 por defecto.

## Errores y bordes

- Producto sin imagen: placeholder.
- Producto sin descripción: no se muestra el bloque.
- Producto ya en 50 unidades: el botón queda deshabilitado con el texto explicativo.
- Tope de 50 productos distintos: el sheet se cierra y se muestra el aviso existente del catálogo.

## Pruebas

- TDD en `mobile/src/lib/cart-rules.test.ts`. Los casos son:
  - Agregar N a una línea nueva.
  - Agregar N a una línea existente.
  - Que se limite a 50 al sumar.
  - Que se rechace por `MAX_LINES` con una cantidad mayor a 1.
  - Que la llamada sin `quantity` siga funcionando igual que hoy.
- Sin tests de componentes (markup/estilos).
- En `docs/testing.md` se agregan casos manuales:
  - Abrir el detalle tocando la card.
  - Que el "+" agregue sin abrir el detalle.
  - Elegir una cantidad y verificar el total del botón y el total del carrito.
  - Cerrar con la X, el fondo y Esc.
  - Producto ya en 50: botón deshabilitado.
  - Layout de mobile (sheet) y de pantallas anchas (diálogo).
