# Papa Mala — Carrito Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un carrito de compras con drawer lateral al sitio Papa Mala — el usuario añade bolsas desde la galería, ajusta cantidades con un control inline, y envía su pedido por WhatsApp.

**Architecture:** Estado del carrito en `App.jsx` (un hook `useCart`), propagado como props hacia `Nav`, `FlavorGallery` y `CartDrawer`. No hay router ni backend; el pago es un mensaje de WhatsApp pre-formateado. Todos los archivos son JSX interpretados por Babel standalone vía CDN — sin build tools.

**Tech Stack:** React 18 CDN, Framer Motion 10 CDN (`window.Motion`), Tailwind CDN, Babel standalone, CSS vars (`--bone`, `--clay`, `--ink`, `--green`), `window.openWhatsApp()`, `window.SPRING_SNAP`, `window.SPRING_SOFT`, `window.SPRING`.

---

## File Map

| Archivo | Acción |
|---|---|
| `apps/papa-mala/src/data/flavors.js` | Modificar — agregar `price: 35` a cada sabor |
| `apps/papa-mala/src/ui/Icons.jsx` | Modificar — agregar `Ico.Cart` e `Ico.Minus` |
| `apps/papa-mala/src/hooks/useCart.jsx` | Crear — hook con add/remove/clear |
| `apps/papa-mala/src/components/Nav.jsx` | Modificar — badge + botón carrito |
| `apps/papa-mala/src/components/FlavorGallery.jsx` | Modificar — qty control inline en FlavorCard |
| `apps/papa-mala/src/components/CartDrawer.jsx` | Crear — drawer completo |
| `apps/papa-mala/src/App.jsx` | Modificar — wiring de cart state + props |
| `apps/papa-mala/index.html` | Modificar — dos nuevos `<script>` tags |

---

## Task 1: Agregar `price` a los datos de sabores

**Files:**
- Modify: `apps/papa-mala/src/data/flavors.js`

- [ ] **Step 1: Editar flavors.js — añadir `price: 35` a cada sabor**

Reemplaza todo el contenido del archivo con:

```js
// ─── Sabores ─────────────────────────────────────────────────────────────────
// Edita aquí para agregar, quitar o cambiar los sabores del carrusel.

window.FLAVORS = [
  { id: "fl-naturales", name: "Naturales",     note: "Solo malanga",           tint: "#E8DECE", ink: "#0F0D0D", kcal: "130", tag: "Clásico",   price: 35 },
  { id: "fl-chipotle",  name: "Chipotle",       note: "Chipotle ahumado",       tint: "#7A2E1E", ink: "#FAF7F2", kcal: "134", tag: "Ahumado",   price: 35 },
  { id: "fl-flama",     name: "Flama",          note: "Chile intenso & limón",  tint: "#C41E1E", ink: "#FAF7F2", kcal: "136", tag: "Intenso",   price: 35 },
  { id: "fl-takis",     name: "Takis",          note: "Picante & limón",        tint: "#6E2438", ink: "#FAF7F2", kcal: "138", tag: "Brutal",    price: 35 },
  { id: "fl-queso",     name: "Queso Jalapeño", note: "Queso & jalapeño",       tint: "#D8A21E", ink: "#0F0D0D", kcal: "142", tag: "Cremoso",   price: 35 },
  { id: "fl-adobadas",  name: "Adobadas",       note: "Adobo con chiles",       tint: "#A8341C", ink: "#FAF7F2", kcal: "137", tag: "Picante",   price: 35 },
  { id: "fl-especias",  name: "Especias",       note: "Mezcla de especias",     tint: "#7C5A2E", ink: "#FAF7F2", kcal: "131", tag: "Especiado", price: 35 },
  { id: "fl-ruffles",   name: "Ruffles",        note: "Clásico ondulado",       tint: "#C9A36B", ink: "#0F0D0D", kcal: "133", tag: "Clásico",   price: 35 },
  { id: "fl-hotnuts",   name: "Hot Nuts",       note: "Cacahuate enchilado",    tint: "#8B0000", ink: "#FAF7F2", kcal: "145", tag: "Brutal",    price: 35 },
  { id: "fl-esquite",   name: "Esquite",        note: "Elote, mayo & limón",    tint: "#E0B23A", ink: "#0F0D0D", kcal: "139", tag: "Antojito",  price: 35 },
  { id: "fl-bbq",       name: "BBQ",            note: "Barbacoa dulce ahumada", tint: "#5A3417", ink: "#FAF7F2", kcal: "141", tag: "Ahumado",   price: 35 },
];
```

- [ ] **Step 2: Verificar en browser**

Abre `index.html` en el browser. Abre la consola y ejecuta:
```js
window.FLAVORS[0].price  // → 35
```

- [ ] **Step 3: Commit**

```bash
git add apps/papa-mala/src/data/flavors.js
git commit -m "feat(papa-mala): agregar price:35 a todos los sabores"
```

---

## Task 2: Nuevos iconos Cart y Minus

**Files:**
- Modify: `apps/papa-mala/src/ui/Icons.jsx`

- [ ] **Step 1: Agregar `Ico.Cart` e `Ico.Minus` al objeto `window.Ico`**

En `Icons.jsx`, agrega dos entradas al objeto `window.Ico`, justo antes del cierre `};`:

```jsx
    Minus: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    Cart: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
```

El archivo completo queda así:

```jsx
// ─── Icons ────────────────────────────────────────────────────────────────────
// Colección de iconos SVG de trazo limpio.
// Uso: <Ico.Arrow /> <Ico.WhatsApp /> <Ico.Cart /> <Ico.Minus />

(function () {
  window.Ico = {
    Arrow: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Check: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    Plus: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    Minus: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    Cart: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
        <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    Bag: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M6 8h12l-1 11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
    Leaf: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M20 4S8 4 6 12c-1.5 6 3 8 3 8M8.5 14.5c4-4 9-4 9-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    WhatsApp: (p) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" {...p}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  };
})();
```

- [ ] **Step 2: Verificar en browser**

Abre la consola y ejecuta:
```js
window.Ico.Cart   // → función
window.Ico.Minus  // → función
```

- [ ] **Step 3: Commit**

```bash
git add apps/papa-mala/src/ui/Icons.jsx
git commit -m "feat(papa-mala): agregar Ico.Cart e Ico.Minus"
```

---

## Task 3: Hook `useCart`

**Files:**
- Create: `apps/papa-mala/src/hooks/useCart.jsx`

- [ ] **Step 1: Crear el archivo**

```jsx
// ─── useCart ──────────────────────────────────────────────────────────────────
// Gestión del estado del carrito. Expone window.useCart().
// Uso: const [cart, { addToCart, removeFromCart, clearCart }] = window.useCart();

(function () {
  const { useState } = React;

  function useCart() {
    const [cart, setCart] = useState([]);

    function addToCart(flavor) {
      setCart((prev) => {
        const existing = prev.find((i) => i.id === flavor.id);
        if (existing) {
          return prev.map((i) =>
            i.id === flavor.id ? { ...i, qty: i.qty + 1 } : i
          );
        }
        return [
          ...prev,
          {
            id:   flavor.id,
            name: flavor.name,
            tint: flavor.tint,
            ink:  flavor.ink,
            note: flavor.note,
            qty:  1,
          },
        ];
      });
    }

    function removeFromCart(id) {
      setCart((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (!existing) return prev;
        if (existing.qty === 1) return prev.filter((i) => i.id !== id);
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i));
      });
    }

    function clearCart() {
      setCart([]);
    }

    return [cart, { addToCart, removeFromCart, clearCart }];
  }

  window.useCart = useCart;
})();
```

- [ ] **Step 2: Agregar el script tag en index.html**

En `apps/papa-mala/index.html`, justo **después** de la línea de `useTweaks.jsx`, agrega:

```html
  <script type="text/babel" src="src/hooks/useCart.jsx"></script>
```

El bloque de hooks quedará:
```html
  <!-- ════ HOOKS ════ -->
  <script type="text/babel" src="src/hooks/useMagnetic.jsx"></script>
  <script type="text/babel" src="src/hooks/useTweaks.jsx"></script>
  <script type="text/babel" src="src/hooks/useCart.jsx"></script>
```

- [ ] **Step 3: Verificar en browser**

Abre la consola y ejecuta:
```js
window.useCart   // → función (no undefined)
```

- [ ] **Step 4: Commit**

```bash
git add apps/papa-mala/src/hooks/useCart.jsx apps/papa-mala/index.html
git commit -m "feat(papa-mala): hook useCart con add/remove/clear"
```

---

## Task 4: Nav con botón de carrito y badge animado

**Files:**
- Modify: `apps/papa-mala/src/components/Nav.jsx`

- [ ] **Step 1: Reemplazar Nav.jsx completo**

```jsx
// ─── Nav ──────────────────────────────────────────────────────────────────────
// Barra de navegación sticky. Acepta cartCount y onCartOpen para el carrito.

(function () {
  const { AnimatePresence, motion } = window.Motion;

  const NAV_LINKS = [
    { label: "Sabores",         href: "#sabores"  },
    { label: "Origen",          href: "#origen"   },
    { label: "Puntos de venta", href: "#puntos"   },
    { label: "Contacto",        href: "#contacto" },
  ];

  function Nav({ cartCount = 0, onCartOpen }) {
    return (
      <Reveal as="header" y={-12}
        className="sticky top-0 z-50 border-b-2 border-[var(--ink)] bg-[var(--bone)]/85 backdrop-blur"
      >
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-5 py-3.5 md:px-10">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 no-underline">
            <img src={window.ASSET.mascotRed} alt="Papa Mala" className="h-9 w-9 object-contain" />
            <span className="font-display text-[22px] leading-none tracking-[0.01em] text-[var(--ink)]">PAPA</span>
            <span className="rounded-[6px] bg-[var(--clay)] px-1.5 pb-1 pt-1.5 font-display text-[22px] leading-none tracking-[0.01em] text-[var(--bone)]">MALA</span>
          </a>

          {/* Links desktop */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href}
                className="rounded-full px-3.5 py-2 text-[13.5px] font-bold uppercase tracking-tight text-[var(--ink)]/70 no-underline transition-colors hover:text-[var(--clay)]">
                {l.label}
              </a>
            ))}
          </nav>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Botón carrito */}
            <motion.button
              onClick={onCartOpen}
              whileTap={{ scale: 0.9 }}
              transition={window.SPRING}
              aria-label="Ver carrito"
              className="relative grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] text-[18px] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bone)]"
            >
              <Ico.Cart />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={window.SPRING_SNAP}
                    className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-[var(--bone)] bg-[var(--clay)] px-[3px] text-[10px] font-black text-white"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* WhatsApp CTA */}
            <a href={"https://wa.me/" + window.WA_NUMBER + "?text=" + encodeURIComponent("Hola Papa Mala 👋 Quiero hacer un pedido")}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-4 text-[13px] font-bold uppercase tracking-tight text-[var(--bone)] no-underline transition-transform hover:scale-[1.03]">
              <Ico.WhatsApp /> <span className="hidden sm:inline">WhatsApp</span>
            </a>
          </div>
        </div>
      </Reveal>
    );
  }

  window.Nav = Nav;
})();
```

- [ ] **Step 2: Verificar en browser**

Recarga la página. El nav debe verse igual que antes (el botón de carrito aparece vacío sin badge porque aún no hay cart state conectado). El icono de bolsa de compras debe verse en el nav.

- [ ] **Step 3: Commit**

```bash
git add apps/papa-mala/src/components/Nav.jsx
git commit -m "feat(papa-mala): nav con botón de carrito y badge animado"
```

---

## Task 5: FlavorCard con control `−qty+` inline

**Files:**
- Modify: `apps/papa-mala/src/components/FlavorGallery.jsx`

- [ ] **Step 1: Reemplazar FlavorGallery.jsx completo**

`FlavorGallery` ahora recibe `cart`, `onAdd`, `onRemove`. `FlavorCard` ya no maneja su propio estado de loading/done — el clic en `+` llama `onAdd` directamente.

```jsx
// ─── FlavorGallery ────────────────────────────────────────────────────────────
// Carrusel de sabores con drag & spring-snap.
// Props de FlavorGallery: cart, onAdd, onRemove

(function () {
  const { useState, useRef, useEffect } = React;
  const { motion, AnimatePresence, useMotionValue, useSpring, animate } = window.Motion;

  const CARD_W = 312;
  const GAP    = 22;
  const STEP   = CARD_W + GAP;

  /* Tarjeta individual de sabor */
  function FlavorCard({ f, active, cart, onAdd, onRemove }) {
    const cartItem = cart.find((i) => i.id === f.id);
    const qty      = cartItem ? cartItem.qty : 0;

    const rx = useSpring(0, { stiffness: 220, damping: 18 });
    const ry = useSpring(0, { stiffness: 220, damping: 18 });

    const onTilt = (e) => {
      if (!active) return;
      const r = e.currentTarget.getBoundingClientRect();
      ry.set(((e.clientX - r.left) / r.width  - 0.5) * 9);
      rx.set(-((e.clientY - r.top)  / r.height - 0.5) * 9);
    };
    const resetTilt = () => { rx.set(0); ry.set(0); };

    return (
      <motion.div
        animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.5 }}
        transition={window.SPRING_SOFT}
        onMouseMove={onTilt} onMouseLeave={resetTilt}
        style={{ width: CARD_W, rotateX: rx, rotateY: ry, transformPerspective: 900 }}
        className="shrink-0 select-none [transform-style:preserve-3d]"
      >
        <div className="sticker overflow-hidden rounded-[24px] border-[3px] border-[var(--ink)] bg-[var(--paper)]">
          {/* Área de color */}
          <div className="relative h-[330px]" style={{ backgroundColor: f.tint }}>
            <div className="halftone-ink absolute inset-0 opacity-[0.12]" />
            <img src={window.ASSET.mascotRed} alt=""
              style={{ filter: f.ink === "#FAF7F2" ? "brightness(0) invert(1)" : "none", opacity: 0.92 }}
              className="absolute left-1/2 top-1/2 h-[68%] -translate-x-1/2 -translate-y-1/2 object-contain"
              draggable="false"
            />
            <span className="absolute left-4 top-4 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight"
              style={{ borderColor: f.ink, color: f.ink }}>
              {f.tag}
            </span>
          </div>

          {/* Footer de la tarjeta */}
          <div className="flex items-end justify-between gap-3 border-t-[3px] border-[var(--ink)] bg-[var(--paper)] p-4">
            <div>
              <h3 className="font-display text-[24px] uppercase leading-none tracking-tight text-[var(--ink)]">{f.name}</h3>
              <p className="mt-1.5 text-[13px] font-medium leading-snug text-[var(--ink)]/60">{f.note}</p>
              <p className="mt-1.5 text-[11.5px] font-bold uppercase tracking-tight text-[var(--ink)]/40">{f.kcal} kcal · 100g</p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {qty === 0 ? (
                <motion.button
                  key="add"
                  onClick={() => onAdd(f)}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={window.SPRING_SNAP}
                  whileTap={{ scale: 0.88 }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] text-[var(--bone)]"
                >
                  <Ico.Plus />
                </motion.button>
              ) : (
                <motion.div
                  key="qty"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={window.SPRING_SNAP}
                  className="flex h-12 shrink-0 items-center overflow-hidden rounded-full border-2 border-[var(--ink)]"
                >
                  <motion.button
                    onClick={() => onRemove(f.id)}
                    whileTap={{ scale: 0.85 }} transition={window.SPRING}
                    className="flex h-full w-10 items-center justify-center text-[var(--ink)] text-[18px]"
                  >
                    <Ico.Minus />
                  </motion.button>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={qty}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={window.SPRING_SNAP}
                      className="min-w-[1.75rem] text-center text-[15px] font-bold text-[var(--ink)]"
                    >
                      {qty}
                    </motion.span>
                  </AnimatePresence>
                  <motion.button
                    onClick={() => onAdd(f)}
                    whileTap={{ scale: 0.85 }} transition={window.SPRING}
                    className="flex h-full w-10 items-center justify-center bg-[var(--clay)] text-[var(--bone)] text-[18px]"
                  >
                    <Ico.Plus />
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    );
  }

  /* Carrusel */
  function FlavorGallery({ cart, onAdd, onRemove }) {
    const [index,  setIndex]  = useState(0);
    const [center, setCenter] = useState(0);
    const wrapRef = useRef(null);
    const x = useMotionValue(0);

    useEffect(() => {
      const measure = () => {
        const w = wrapRef.current ? wrapRef.current.offsetWidth : 0;
        setCenter((w - CARD_W) / 2);
      };
      measure();
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }, []);

    useEffect(() => {
      const controls = animate(x, center - index * STEP, window.SPRING_SOFT);
      return controls.stop;
    }, [index, center]);

    const go = (dir) => setIndex((i) => Math.min(window.FLAVORS.length - 1, Math.max(0, i + dir)));

    const onDragEnd = (_e, info) => {
      const predicted = x.get() + info.velocity.x * 0.18;
      let i = Math.round((center - predicted) / STEP);
      i = Math.min(window.FLAVORS.length - 1, Math.max(0, i));
      setIndex(i);
      animate(x, center - i * STEP, window.SPRING_SNAP);
    };

    return (
      <section id="sabores" className="relative overflow-hidden border-t-2 border-[var(--ink)] bg-[var(--tan)]/40 py-16">
        <div className="halftone pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal><Pill>Once sabores con actitud</Pill></Reveal>
              <Reveal delay={0.06}>
                <h2 className="mt-3 font-display text-[clamp(2.2rem,5.5vw,4rem)] uppercase leading-[0.9] tracking-tight text-[var(--ink)]">
                  Elige tu lado <span className="text-[var(--clay)]">oscuro.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="flex items-center gap-2.5">
              <button onClick={() => go(-1)} disabled={index === 0}
                className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bone)] disabled:opacity-30">
                <span className="rotate-180"><Ico.Arrow /></span>
              </button>
              <button onClick={() => go(1)} disabled={index === window.FLAVORS.length - 1}
                className="grid h-12 w-12 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bone)] disabled:opacity-30">
                <Ico.Arrow />
              </button>
            </Reveal>
          </div>
        </div>

        <div ref={wrapRef} className="relative mt-9 w-full">
          <motion.div
            drag="x"
            dragConstraints={{ left: center - (window.FLAVORS.length - 1) * STEP - 40, right: center + 40 }}
            dragElastic={0.12}
            onDragEnd={onDragEnd}
            style={{ x }}
            className="flex cursor-grab items-stretch gap-[22px] px-1 active:cursor-grabbing"
          >
            {window.FLAVORS.map((f, i) => (
              <FlavorCard key={f.id} f={f} active={i === index}
                cart={cart} onAdd={onAdd} onRemove={onRemove} />
            ))}
          </motion.div>
        </div>

        {/* Indicadores */}
        <div className="relative mx-auto mt-9 flex max-w-[1280px] items-center justify-center gap-2 px-5">
          {window.FLAVORS.map((f, i) => (
            <button key={f.id} onClick={() => setIndex(i)} aria-label={f.name}
              className="h-2.5 rounded-full border-2 border-[var(--ink)] transition-all"
              style={{ width: i === index ? 30 : 10, backgroundColor: i === index ? "var(--clay)" : "transparent" }}
            />
          ))}
        </div>
      </section>
    );
  }

  window.FlavorGallery = FlavorGallery;
})();
```

- [ ] **Step 2: Verificar en browser**

La galería se ve igual que antes. Al hacer clic en `+` en cualquier tarjeta, el botón desaparece y aparece el control `−1+`. Clic en `+` de nuevo sube a `2`, clic en `−` baja, y al llegar a 0 vuelve al botón `+`. El badge del nav aún no se actualiza (se conecta en Task 7).

- [ ] **Step 3: Commit**

```bash
git add apps/papa-mala/src/components/FlavorGallery.jsx
git commit -m "feat(papa-mala): control qty inline en FlavorCard"
```

---

## Task 6: CartDrawer

**Files:**
- Create: `apps/papa-mala/src/components/CartDrawer.jsx`

- [ ] **Step 1: Crear el archivo**

```jsx
// ─── CartDrawer ───────────────────────────────────────────────────────────────
// Panel lateral deslizable del carrito.
// Props: isOpen, cart, onClose, onAdd, onRemove

(function () {
  const { useEffect } = React;
  const { motion, AnimatePresence } = window.Motion;

  /* Construye el mensaje de WhatsApp con el detalle del pedido */
  function buildOrderMessage(cart) {
    const lines = cart.map((i) => `• ${i.name} × ${i.qty} — $${i.qty * 35}`);
    const total = cart.reduce((n, i) => n + i.qty * 35, 0);
    return [
      "Hola Papa Mala 👋 Quiero hacer un pedido:",
      "",
      ...lines,
      "",
      `*Total: $${total}*`,
    ].join("\n");
  }

  /* Item individual dentro del drawer */
  function CartItem({ item, onAdd, onRemove, delay }) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { ...window.SPRING_SNAP, delay } }}
        exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
        className="flex items-center gap-3 rounded-[14px] border-2 border-[var(--ink)] bg-[var(--bone)] p-3"
      >
        {/* Swatch */}
        <div
          className="h-9 w-9 shrink-0 rounded-[10px] border-2 border-[var(--ink)]"
          style={{ backgroundColor: item.tint }}
        />
        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-[var(--ink)]">{item.name}</p>
          <p className="text-[11px] text-[var(--ink)]/50">${item.qty * 35}</p>
        </div>
        {/* Control qty */}
        <div className="flex items-center gap-1">
          <motion.button
            whileTap={{ scale: 0.85 }} transition={window.SPRING}
            onClick={() => onRemove(item.id)}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] text-[14px]"
          >
            <Ico.Minus />
          </motion.button>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={item.qty}
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              transition={window.SPRING_SNAP}
              className="min-w-[1.25rem] text-center text-[13px] font-bold text-[var(--ink)]"
            >
              {item.qty}
            </motion.span>
          </AnimatePresence>
          <motion.button
            whileTap={{ scale: 0.85 }} transition={window.SPRING}
            onClick={() => onAdd(item)}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] text-[var(--bone)] text-[14px]"
          >
            <Ico.Plus />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  /* Banner de upsell para la caja completa */
  function UpsellBanner() {
    return (
      <div className="mt-1 rounded-[12px] border-2 border-dashed border-[var(--clay)] bg-[#fff5f5] p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.07em] text-[var(--clay)]">¿Quieres más?</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <div>
            <p className="text-[12px] font-bold text-[var(--ink)]">Caja completa</p>
            <p className="text-[11px] text-[var(--ink)]/55">11 sabores · Mayoreo</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold text-[var(--ink)]">$1,550</span>
            <motion.button
              whileTap={{ scale: 0.92 }} transition={window.SPRING}
              onClick={() => window.openWhatsApp("Hola Papa Mala 👋 Me interesa una compra a mayoreo. ¿Me pueden dar más información?")}
              className="h-8 rounded-full border-2 border-[var(--clay)] bg-[var(--clay)] px-3 text-[11px] font-black text-[var(--bone)]"
            >
              Agregar
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  /* Drawer principal */
  function CartDrawer({ isOpen, cart, onClose, onAdd, onRemove }) {
    const cartCount = cart.reduce((n, i) => n + i.qty, 0);
    const cartTotal = cart.reduce((n, i) => n + i.qty * 35, 0);

    /* Bloquear scroll del body mientras el drawer está abierto */
    useEffect(() => {
      document.body.style.overflow = isOpen ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={onClose}
              className="fixed inset-0 z-[59] bg-[var(--ink)]/50"
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] } }}
              exit={{ x: "100%", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
              drag="x"
              dragConstraints={{ left: 0 }}
              dragElastic={{ left: 0.1 }}
              onDragEnd={(_e, info) => {
                if (info.velocity.x > 0.11 || info.offset.x > 120) onClose();
              }}
              className="fixed right-0 top-0 bottom-0 z-[60] flex w-full flex-col border-l-2 border-[var(--ink)] bg-[var(--paper)] md:w-80"
            >
              {/* Header */}
              <div className="flex shrink-0 items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--bone)] px-5 py-4">
                <h2 className="font-display text-[20px] uppercase leading-none tracking-tight text-[var(--ink)]">
                  Tu orden
                  {cartCount > 0 && (
                    <span className="ml-2 text-[var(--ink)]/40 text-[16px]">· {cartCount}</span>
                  )}
                </h2>
                <motion.button
                  whileTap={{ scale: 0.88 }} transition={window.SPRING}
                  onClick={onClose}
                  aria-label="Cerrar carrito"
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] text-[14px]"
                >
                  ✕
                </motion.button>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
                <AnimatePresence initial={false}>
                  {cart.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center"
                    >
                      <span className="text-4xl">🌶</span>
                      <p className="text-[14px] font-medium text-[var(--ink)]/50">
                        Aún no has elegido ningún sabor
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.96 }} transition={window.SPRING}
                        onClick={onClose}
                        className="mt-1 rounded-full border-2 border-[var(--ink)] px-5 py-2 text-[13px] font-bold text-[var(--ink)]"
                      >
                        Ver sabores
                      </motion.button>
                    </motion.div>
                  ) : (
                    cart.map((item, i) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onAdd={onAdd}
                        onRemove={onRemove}
                        delay={i * 0.04}
                      />
                    ))
                  )}
                </AnimatePresence>

                {/* Upsell siempre visible */}
                <UpsellBanner />
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t-2 border-[var(--ink)] bg-[var(--bone)] p-4">
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-[14px] font-bold text-[var(--ink)]">Total</span>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={cartTotal}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={window.SPRING_SNAP}
                      className="font-display text-[22px] leading-none text-[var(--ink)]"
                    >
                      ${cartTotal}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }} transition={window.SPRING}
                  disabled={cart.length === 0}
                  onClick={() => window.openWhatsApp(buildOrderMessage(cart))}
                  className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] py-3.5 text-[14px] font-bold uppercase tracking-tight text-[var(--bone)] shadow-[0_10px_24px_-10px_rgba(140,0,0,0.5)] transition-opacity disabled:opacity-40"
                >
                  <Ico.WhatsApp /> Pedir por WhatsApp
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  window.CartDrawer = CartDrawer;
})();
```

- [ ] **Step 2: Agregar script tag en index.html**

Justo **antes** del tag de `App.jsx` y **después** de `Footer.jsx`:

```html
  <script type="text/babel" src="src/components/CartDrawer.jsx"></script>
```

El bloque de componentes queda:
```html
  <!-- ... Footer.jsx ... -->
  <script type="text/babel" src="src/components/Footer.jsx"></script>
  <script type="text/babel" src="src/components/CartDrawer.jsx"></script>

  <!-- App -->
  <script type="text/babel" src="src/App.jsx"></script>
```

- [ ] **Step 3: Verificar en consola**

Recarga. En la consola ejecuta:
```js
window.CartDrawer  // → función
```

No debe haber errores en consola.

- [ ] **Step 4: Commit**

```bash
git add apps/papa-mala/src/components/CartDrawer.jsx apps/papa-mala/index.html
git commit -m "feat(papa-mala): CartDrawer con overlay, drag-to-close y upsell"
```

---

## Task 7: Wiring en App.jsx

**Files:**
- Modify: `apps/papa-mala/src/App.jsx`

- [ ] **Step 1: Reemplazar App.jsx completo**

```jsx
// ─── App ──────────────────────────────────────────────────────────────────────
// Componente raíz. Orquesta todos los componentes y el estado del carrito.

(function () {
  const { useState } = React;

  const LOGO_SRC = {
    sticker: window.ASSET.mascotSticker,
    blanco:  window.ASSET.mascotWhite,
    crema:   window.ASSET.mascotCream,
  };

  const TITLE_FONT = {
    anton:  "Anton",
    bebas:  '"Bebas Neue"',
    oswald: "Oswald",
  };

  const TWEAK_DEFAULTS = {
    logo:      "sticker",
    circle:    "#C41E1E",
    accent:    "#C41E1E",
    bg:        "#FAF7F2",
    titleFont: "anton",
    marquee:   24,
    badge:     "Snacks saludables de malanga",
    grain:     true,
  };

  function App() {
    const [t, setTweak]     = window.useTweaks(TWEAK_DEFAULTS);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [cart, { addToCart, removeFromCart }] = window.useCart();

    const cartCount = cart.reduce((n, i) => n + i.qty, 0);
    const fam = TITLE_FONT[t.titleFont] || "Anton";

    return (
      <div
        className="min-h-screen bg-[var(--bone)] text-[var(--ink)]"
        style={{ "--clay": t.accent, "--bone": t.bg }}
      >
        <style>{`.font-display{font-family:${fam},sans-serif!important}`}</style>
        {!t.grain && <style>{"body::before{display:none}"}</style>}

        <Nav
          cartCount={cartCount}
          onCartOpen={() => setDrawerOpen(true)}
        />
        <Hero
          logoSrc={LOGO_SRC[t.logo] || LOGO_SRC.sticker}
          circleColor={t.circle}
          badge={t.badge}
        />
        <Marquee speed={t.marquee} />
        <Manifesto />
        <FlavorGallery
          cart={cart}
          onAdd={addToCart}
          onRemove={removeFromCart}
        />
        <PuntosDeVenta />
        <ContactSection />
        <Footer />

        <CartDrawer
          isOpen={drawerOpen}
          cart={cart}
          onClose={() => setDrawerOpen(false)}
          onAdd={addToCart}
          onRemove={removeFromCart}
        />

        {/* Panel de ajustes en vivo */}
        <TweaksPanel title="⚙ Papa Mala Tweaks">
          <TweakSection label="Logo del círculo" />
          <LogoSwatches value={t.logo} onChange={(v) => setTweak("logo", v)} />
          <TweakColor label="Color del círculo" value={t.circle}
            options={["#C41E1E", "#8B0000", "#0F0D0D", "#7A2E1E"]}
            onChange={(v) => setTweak("circle", v)} />

          <TweakSection label="Marca y color" />
          <TweakColor label="Acento (rojo)" value={t.accent}
            options={["#C41E1E", "#8B0000", "#A8341C", "#B5532E"]}
            onChange={(v) => setTweak("accent", v)} />
          <TweakColor label="Fondo" value={t.bg}
            options={["#FAF7F2", "#F3ECDD", "#EFE6D2", "#FFFFFF"]}
            onChange={(v) => setTweak("bg", v)} />
          <TweakToggle label="Grano de papel" value={t.grain}
            onChange={(v) => setTweak("grain", v)} />

          <TweakSection label="Tipografía de títulos" />
          <TweakRadio label="Fuente" value={t.titleFont}
            options={["anton", "bebas", "oswald"]}
            onChange={(v) => setTweak("titleFont", v)} />

          <TweakSection label="Movimiento y copy" />
          <TweakSlider label="Velocidad marquesina" value={t.marquee} min={8} max={44} step={1} unit="s"
            onChange={(v) => setTweak("marquee", v)} />
          <TweakText label="Etiqueta del hero" value={t.badge}
            onChange={(v) => setTweak("badge", v)} />
        </TweaksPanel>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
```

- [ ] **Step 2: Verificar flujo completo**

1. Recarga la página.
2. En la galería, haz clic en `+` de cualquier sabor → aparece control `−1+`.
3. El badge del nav muestra `1`.
4. Haz clic en el ícono del carrito en el nav → el drawer desliza desde la derecha.
5. Dentro del drawer, ajusta la cantidad con `−` y `+` → el total se actualiza.
6. Baja la cantidad a 0 → el item desaparece del drawer y el control en la tarjeta vuelve a `+`.
7. Con items en el carrito, haz clic en "Pedir por WhatsApp" → se abre WhatsApp con el mensaje formateado.
8. Haz clic en "Agregar" en el banner de caja completa → se abre WhatsApp con mensaje de mayoreo.
9. Arrastra el panel hacia la derecha → se cierra.
10. Clic en el overlay → se cierra.

- [ ] **Step 3: Commit final**

```bash
git add apps/papa-mala/src/App.jsx
git commit -m "feat(papa-mala): carrito completo — drawer + qty inline + upsell mayoreo"
```

---

## Checklist de verificación final

- [ ] Badge del nav aparece al agregar, desaparece cuando el carrito está vacío
- [ ] El número del badge hace pop-spring en cada cambio de cantidad
- [ ] El control `−qty+` reemplaza al `+` con animación suave
- [ ] El drawer entra desde la derecha con easing iOS (0.32, 0.72, 0, 1)
- [ ] El drawer cierra más rápido (220ms) que como entra (350ms)
- [ ] Arrastrar el drawer >120px hacia la derecha lo cierra
- [ ] El body no hace scroll cuando el drawer está abierto
- [ ] Estado vacío del drawer muestra el emoji 🌶 y el CTA "Ver sabores"
- [ ] El total en el footer se anima cuando cambia
- [ ] El botón "Pedir por WhatsApp" está deshabilitado con carrito vacío
- [ ] El mensaje de WhatsApp lista cada sabor con qty y precio, más total
- [ ] El upsell de caja completa abre el flujo de mayoreo sin afectar el total del carrito
