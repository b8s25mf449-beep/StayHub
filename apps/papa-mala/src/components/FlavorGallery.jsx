// ─── FlavorGallery ────────────────────────────────────────────────────────────
// Carrusel de sabores con drag & spring-snap.
// Los datos se leen de window.FLAVORS (src/data/flavors.js).

(function () {
  const { useState, useRef, useEffect } = React;
  const { motion, AnimatePresence, useMotionValue, useSpring, animate } = window.Motion;

  const CARD_W = 312;
  const GAP    = 22;
  const STEP   = CARD_W + GAP;

  /* Tarjeta individual de sabor */
  function FlavorCard({ f, active, cart, onAdd, onRemove }) {
    const qty = cart.find((i) => i.id === f.id)?.qty || 0;

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
            <AnimatePresence mode="popLayout">
              {qty === 0 ? (
                <motion.button
                  key="add"
                  onClick={(e) => { e.stopPropagation(); onAdd(f); }}
                  whileTap={{ scale: 0.88 }}
                  transition={window.SPRING}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] text-[var(--bone)]"
                >
                  <span className="text-[20px]"><Ico.Plus /></span>
                </motion.button>
              ) : (
                <motion.div
                  key="ctrl"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={window.SPRING_SOFT}
                  className="flex h-12 shrink-0 items-center gap-1 rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] px-1 text-[var(--bone)]"
                >
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onRemove(f.id); }}
                    whileTap={{ scale: 0.85 }}
                    className="grid h-9 w-9 place-items-center rounded-full text-[18px]"
                  >
                    <Ico.Minus />
                  </motion.button>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={qty}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={window.SPRING_SNAP}
                      className="min-w-[20px] text-center text-[15px] font-bold leading-none"
                    >
                      {qty}
                    </motion.span>
                  </AnimatePresence>
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); onAdd(f); }}
                    whileTap={{ scale: 0.85 }}
                    className="grid h-9 w-9 place-items-center rounded-full text-[18px]"
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
  function FlavorGallery({ cart = [], onAdd, onRemove }) {
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
              <FlavorCard key={f.id} f={f} active={i === index} cart={cart} onAdd={onAdd} onRemove={onRemove} />
            ))}
          </motion.div>
        </div>

        {/* Indicadores de posición */}
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
