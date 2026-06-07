// ─── CartDrawer ────────────────────────────────────────────────────────────────
// Panel deslizable del carrito con resumen de artículos, opción de mayoreo y compra.
// Expone window.CartDrawer.

(function () {
  const { useEffect } = React;
  const { motion, AnimatePresence } = window.Motion;

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

  function CartItem({ item, onAdd, onRemove, index }) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...window.SPRING_SOFT, delay: index * 0.04 }}
        className="flex items-center gap-3 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] p-3"
      >
        {/* Color swatch */}
        <div
          className="h-7 w-7 shrink-0 rounded-md border-2 border-[var(--ink)]"
          style={{ backgroundColor: item.tint }}
        />
        {/* Name + note */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold leading-tight text-[var(--ink)]">{item.name}</p>
          <p className="truncate text-[11px] text-[var(--ink)]/50">{item.note}</p>
        </div>
        {/* Price */}
        <p className="shrink-0 text-[13px] font-bold text-[var(--ink)]">${item.qty * 35}</p>
        {/* Qty control */}
        <div className="flex shrink-0 items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] px-1 text-[var(--bone)]">
          <motion.button
            onClick={() => onRemove(item.id)}
            whileTap={{ scale: 0.85 }}
            className="grid h-7 w-7 place-items-center rounded-full text-[14px]"
          >
            <Ico.Minus />
          </motion.button>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={item.qty}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={window.SPRING_SNAP}
              className="min-w-[16px] text-center text-[12px] font-bold leading-none"
            >
              {item.qty}
            </motion.span>
          </AnimatePresence>
          <motion.button
            onClick={() => onAdd(item)}
            whileTap={{ scale: 0.85 }}
            className="grid h-7 w-7 place-items-center rounded-full text-[14px]"
          >
            <Ico.Plus />
          </motion.button>
        </div>
      </motion.div>
    );
  }

  function UpsellBanner() {
    const msg = "Hola Papa Mala 👋 Me interesa una compra a mayoreo. ¿Me pueden dar más información?";
    return (
      <div className="rounded-xl border-2 border-dashed border-[var(--clay)] bg-[#fff5f5] p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--clay)]">¿Quieres más?</p>
        <p className="mt-0.5 text-[13px] font-bold text-[var(--ink)]">Caja completa · 11 sabores</p>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[18px] font-black text-[var(--ink)]">$1,550</p>
          <button
            onClick={() => window.openWhatsApp(msg)}
            className="rounded-full border-2 border-[var(--clay)] bg-[var(--clay)] px-3 py-1.5 text-[11px] font-bold uppercase text-[var(--bone)] transition-opacity hover:opacity-80"
          >
            📦 Agregar
          </button>
        </div>
      </div>
    );
  }

  function CartDrawer({ cart, isOpen, onClose, onAdd, onRemove }) {
    const cartTotal = cart.reduce((n, i) => n + i.qty * 35, 0);
    const cartCount = cart.reduce((n, i) => n + i.qty, 0);

    // Body scroll lock
    useEffect(() => {
      document.body.style.overflow = isOpen ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    const handleOrder = () => {
      if (cart.length === 0) return;
      window.openWhatsApp(buildOrderMessage(cart));
    };

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
              className="fixed inset-0 z-[59] bg-[rgba(15,13,13,0.5)]"
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              drag="x"
              dragConstraints={{ left: 0 }}
              dragElastic={0.1}
              onDragEnd={(_e, info) => {
                if (info.velocity.x > 0.11 || info.offset.x > 120) onClose();
              }}
              className="fixed inset-y-0 right-0 z-[60] flex w-full flex-col bg-[var(--bone)] shadow-2xl md:w-80"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-[var(--ink)] px-5 py-4">
                <p className="text-[15px] font-bold text-[var(--ink)]">
                  Tu orden · <span className="text-[var(--clay)]">{cartCount} {cartCount === 1 ? "bolsa" : "bolsas"}</span>
                </p>
                <button
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--bone)]"
                  aria-label="Cerrar carrito"
                >
                  ×
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-4 py-4">
                {cart.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                    <p className="text-[15px] font-medium text-[var(--ink)]/60">Aún no has elegido ningún sabor 🌶</p>
                    <button
                      onClick={onClose}
                      className="rounded-full border-2 border-[var(--ink)] px-5 py-2.5 text-[13px] font-bold uppercase transition-colors hover:bg-[var(--ink)] hover:text-[var(--bone)]"
                    >
                      Ver sabores
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {cart.map((item, i) => (
                      <CartItem key={item.id} item={item} index={i} onAdd={onAdd} onRemove={onRemove} />
                    ))}
                    <div className="mt-2">
                      <UpsellBanner />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t-2 border-[var(--ink)] px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[13px] font-medium text-[var(--ink)]/60">Total</p>
                  <p className="text-[20px] font-black text-[var(--ink)]">${cartTotal}</p>
                </div>
                <button
                  onClick={handleOrder}
                  disabled={cart.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] py-3 text-[14px] font-bold uppercase tracking-tight text-[var(--bone)] transition-opacity disabled:opacity-40"
                >
                  <Ico.WhatsApp /> Pedir por WhatsApp
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  window.CartDrawer = CartDrawer;
})();
