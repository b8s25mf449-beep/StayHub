# Papa Mala — Carrito de compras

**Fecha:** 2026-06-06
**Estado:** Aprobado

## Resumen

Agregar un carrito de compras al sitio web de Papa Mala. El usuario puede añadir bolsas de sabores individuales ($35 c/u) desde la galería, ver su orden en un drawer lateral, y enviar el pedido por WhatsApp. El flujo de caja completa (mayoreo, $1,550) se mantiene separado como upsell dentro del drawer.

---

## Decisiones de diseño

| Decisión | Elección |
|---|---|
| Patrón del carrito | Drawer lateral (desliza desde la derecha) |
| Feedback en tarjeta | Control `−qty+` inline (botón `+` muta en contador) |
| Caja completa | Upsell banner (dashed clay) dentro del drawer; abre flujo de WhatsApp mayoreo separado, no se suma al total |
| Pago | WhatsApp con mensaje pre-formateado (sin backend) |

---

## Arquitectura

El proyecto es un sitio estático con React 18 + Framer Motion vía CDN y Babel standalone. No hay build tools ni router. Todo el estado del carrito vive en `App.jsx` y se comparte hacia abajo como props.

```
App (cart state — useState)
  ├── Nav            ← recibe: cartCount, onCartOpen
  ├── FlavorGallery  ← recibe: cart, onAdd, onRemove
  │     └── FlavorCard  ← qty control inline
  └── CartDrawer     ← recibe: cart, isOpen, onClose, onAdd, onRemove
```

---

## Estado del carrito

**Hook:** `src/hooks/useCart.jsx` — expone en `window.useCart`.

```js
// Estructura de un item
{ id: "fl-flama", name: "Flama", tint: "#C41E1E", ink: "#FAF7F2", note: "Chile intenso & limón", qty: 1 }

// API
const [cart, { addToCart, removeFromCart, clearCart }] = window.useCart();

// Derivados
const cartCount = cart.reduce((n, i) => n + i.qty, 0);
const cartTotal = cart.reduce((n, i) => n + i.qty * 35, 0);
```

`addToCart(flavor)` — incrementa `qty` si ya existe, agrega con `qty: 1` si no.
`removeFromCart(id)` — decrementa `qty`; elimina el item si llega a 0.
`clearCart()` — vacía el array.

---

## Datos

**`src/data/flavors.js`** — agregar `price: 35` a cada objeto del array `FLAVORS`.

---

## FlavorCard (modificado)

El botón de la tarjeta tiene dos estados controlados por si el sabor está en el carrito:

**Estado vacío (`qty === 0`):**
Botón circular `+` en `--clay`, idéntico al actual pero ahora llama `addToCart(flavor)` en lugar de abrir WhatsApp.

**Estado con items (`qty >= 1`):**
El botón muta con `AnimatePresence` a un control `−qty+`:
- `−`: llama `removeFromCart(flavor.id)`. Si qty baja a 0, vuelve al botón `+`.
- Número central: qty actual.
- `+`: llama `addToCart(flavor)`.

**Animación (Emil):**
- `AnimatePresence mode="popLayout"` entre los dos estados.
- El control `−qty+` entra con `scale(0.85) + opacity: 0 → scale(1) + opacity: 1`, spring suave.
- El número dentro hace pop con spring cuando cambia.
- Duración efectiva: ~200ms.

---

## Nav (modificado)

Nuevo botón justo antes del botón de WhatsApp:

```jsx
<button onClick={onCartOpen} style={{ position: 'relative' }}>
  <Ico.Cart />
  {cartCount > 0 && <Badge count={cartCount} />}
</button>
```

**Badge:**
- Círculo rojo `--clay`, 18px, posicionado `top: -5px right: -5px`.
- Cuando `cartCount` cambia, hace `scale(0) → scale(1.3) → scale(1)` con `SPRING_SNAP` usando `key={cartCount}` para forzar el remount y re-animar.
- Desaparece con `AnimatePresence` cuando `cartCount` llega a 0.

**Icono de carrito:** nuevo SVG en `src/ui/Icons.jsx` — `Ico.Cart`.

---

## CartDrawer (nuevo)

**`src/components/CartDrawer.jsx`**

### Layout y posición

```
position: fixed
inset: top-0 right-0 bottom-0
width: 320px (≥ md), 100% (< md)
z-index: 60
```

Overlay semitransparente (`rgba(15,13,13,0.5)`) detrás del panel, hace fade in/out con `opacity`.

### Animación (Emil)

| Evento | Propiedad | Valor |
|---|---|---|
| Entrada | `translateX` | `100% → 0` |
| Entrada | Easing | `cubic-bezier(0.32, 0.72, 0, 1)` (iOS drawer) |
| Entrada | Duración | `350ms` |
| Salida | `translateX` | `0 → 100%` |
| Salida | Easing | `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out fuerte) |
| Salida | Duración | `220ms` |

Usar `AnimatePresence` en el wrapper para animar mount/unmount del drawer completo.

### Drag para cerrar

Drag horizontal hacia la derecha sobre el panel:
- Si `velocity.x > 0.11` o `offset.x > 120px` → cerrar.
- Damping al arrastrar hacia la izquierda (no pasa del borde).
- Usar `dragConstraints={{ left: 0 }}` y `dragElastic={0.1}`.

### Estructura interna

```
CartDrawer
  ├── Header
  │     ├── "Tu orden · N bolsas"
  │     └── Botón ✕ (cierra drawer)
  ├── Body (scrollable, flex-col gap-2)
  │     ├── [estado vacío] → mensaje + CTA "Ver sabores"
  │     ├── [items] → CartItem × N (con stagger)
  │     └── UpsellBanner (siempre visible cuando hay ≥ 0 items)
  └── Footer (sticky bottom)
        ├── Total: $XXX
        └── Botón "Pedir por WhatsApp"
```

### CartItem

Por cada item en el carrito:
- Swatch cuadrado con el `tint` del sabor (28×28px, border ink).
- Nombre + nota del sabor.
- Precio calculado: `qty × $35`.
- Control `−qty+` idéntico al de la tarjeta.

**Stagger:** cada item entra con `delay: index * 40ms` (spring, y: 8 → 0 + opacity).

### UpsellBanner

```
border: 2px dashed --clay
border-radius: 12px
background: #fff5f5
padding: 12px
```

Contenido:
- Label pequeño: "¿Quieres más?"
- Nombre: "Caja completa · 11 sabores"
- Precio: "$1,550"
- Botón "📦 Agregar" → llama `window.openWhatsApp("Hola Papa Mala 👋 Me interesa una compra a mayoreo. ¿Me pueden dar más información?")` directamente. No modifica el carrito ni el total.

### Footer

- Total: `${ cartTotal }` (suma de qty × $35 de todos los items).
- Botón "📱 Pedir por WhatsApp" → llama `window.openWhatsApp(buildOrderMessage(cart))`.
- Deshabilitado (opacity reducida) si el carrito está vacío.

### Mensaje de WhatsApp — pedido individual

```js
function buildOrderMessage(cart) {
  const lines = cart.map(i => `• ${i.name} × ${i.qty} — $${i.qty * 35}`);
  const total = cart.reduce((n, i) => n + i.qty * 35, 0);
  return [
    "Hola Papa Mala 👋 Quiero hacer un pedido:",
    "",
    ...lines,
    "",
    `*Total: $${total}*`,
  ].join("\n");
}
```

---

## Archivos nuevos y modificados

| Archivo | Tipo | Cambio |
|---|---|---|
| `src/data/flavors.js` | Modificado | Agregar `price: 35` a cada sabor |
| `src/hooks/useCart.jsx` | Nuevo | Hook `useCart` con add/remove/clear |
| `src/ui/Icons.jsx` | Modificado | Agregar `Ico.Cart` (SVG de carrito) |
| `src/components/CartDrawer.jsx` | Nuevo | Panel drawer completo |
| `src/components/Nav.jsx` | Modificado | Badge + botón carrito |
| `src/components/FlavorGallery.jsx` | Modificado | Qty control inline en FlavorCard |
| `src/App.jsx` | Modificado | Estado del carrito, wiring de props |
| `index.html` | Modificado | `<script>` tags para useCart y CartDrawer |

---

## Comportamientos de borde

- **Carrito vacío:** el botón "Pedir por WhatsApp" está deshabilitado (visualmente opaco, no clickeable).
- **Estado vacío del drawer:** mensaje "Aún no has elegido ningún sabor 🌶" con botón ghost que cierra el drawer y hace scroll a `#sabores`.
- **Reducción de movimiento:** respetar `prefers-reduced-motion` — desactivar translateX y springs, mantener solo opacity.
- **Drawer abierto + scroll de página:** bloquear scroll del `body` con `overflow: hidden` mientras el drawer está abierto.

---

## Fuera del scope

- Persistencia del carrito (localStorage) — no incluida.
- Checkout real / pasarela de pago — no incluida (todo va a WhatsApp).
- Variantes de tamaño de bolsa — no incluidas.
