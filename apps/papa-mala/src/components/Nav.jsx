// ─── Nav ──────────────────────────────────────────────────────────────────────
// Barra de navegación sticky con logo, links de sección y botón WhatsApp.

(function () {
  const { useState, useEffect } = React;
  const { motion, AnimatePresence } = window.Motion;

  const NAV_LINKS = [
    { label: "Sabores",         href: "#sabores"  },
    { label: "Origen",          href: "#origen"   },
    { label: "Puntos de venta", href: "#puntos"   },
    { label: "Contacto",        href: "#contacto" },
  ];

  function Nav({ cartCount = 0, onCartOpen }) {
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
      document.body.style.overflow = menuOpen ? "hidden" : "";
      return () => { document.body.style.overflow = ""; };
    }, [menuOpen]);

    const closeMenu = () => setMenuOpen(false);

    return (
      <>
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

            {/* Links — solo desktop */}
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
              {/* Hamburguesa — solo móvil */}
              <motion.button
                onClick={() => setMenuOpen((o) => !o)}
                whileTap={{ scale: 0.9 }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] text-[var(--ink)] md:hidden"
                aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {menuOpen ? (
                    <motion.span key="close"
                      initial={{ opacity: 0, rotate: -45 }} animate={{ opacity: 1, rotate: 0 }}
                      exit={{ opacity: 0 }} transition={window.SPRING_SNAP}
                      className="text-[22px] leading-none font-light">×</motion.span>
                  ) : (
                    <motion.span key="open"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }} transition={window.SPRING_SNAP}
                      className="text-[20px]"><Ico.Menu /></motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Carrito */}
              <motion.button
                onClick={onCartOpen}
                whileTap={{ scale: 0.9 }}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--bone)] text-[var(--ink)]"
                aria-label="Ver carrito"
              >
                <Ico.Cart className="text-[20px]" />
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: "spring", ...window.SPRING_SNAP }}
                      className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--clay)] px-[3px] text-[10px] font-bold leading-none text-[var(--bone)]"
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

        {/* Menú móvil — fullscreen overlay */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={window.SPRING_SOFT}
              className="fixed inset-0 z-[55] flex flex-col items-center justify-center gap-1 bg-[var(--bone)] md:hidden"
            >
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={closeMenu}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...window.SPRING_SOFT, delay: i * 0.06 }}
                  className="rounded-full px-6 py-3 font-display text-[clamp(2rem,8vw,2.8rem)] uppercase leading-tight tracking-tight text-[var(--ink)] no-underline active:text-[var(--clay)]"
                >
                  {l.label}
                </motion.a>
              ))}

              <motion.a
                href={"https://wa.me/" + window.WA_NUMBER + "?text=" + encodeURIComponent("Hola Papa Mala 👋 Quiero hacer un pedido")}
                target="_blank" rel="noopener noreferrer"
                onClick={closeMenu}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...window.SPRING_SOFT, delay: NAV_LINKS.length * 0.06 + 0.04 }}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--ink)] px-6 text-[14px] font-bold uppercase tracking-tight text-[var(--bone)] no-underline"
              >
                <Ico.WhatsApp /> WhatsApp
              </motion.a>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  window.Nav = Nav;
})();
