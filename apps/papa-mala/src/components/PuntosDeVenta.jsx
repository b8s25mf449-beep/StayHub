// ─── PuntosDeVenta ────────────────────────────────────────────────────────────
// Sección de puntos de venta por ciudad.
// Los datos se leen de window.PLAZAS (src/data/plazas.js).

(function () {
  function PlazaCard({ p, delay }) {
    return (
      <Reveal delay={delay}>
        <div className="sticker h-full overflow-hidden rounded-[24px] border-[3px] border-[var(--ink)] bg-[var(--paper)]">
          {/* Banda de color con ciudad */}
          <div className="relative h-[168px] overflow-hidden" style={{ backgroundColor: p.tint }}>
            <div className="halftone-ink absolute inset-0 opacity-[0.12]" />
            <img src={window.ASSET.mascotRed} alt=""
              style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }}
              className="absolute -right-6 top-1/2 h-[150%] -translate-y-1/2 object-contain"
              draggable="false"
            />
            <span className="absolute left-5 top-5 rounded-full border-2 px-2.5 py-1 text-[11px] font-bold uppercase tracking-tight"
              style={{ borderColor: p.ink, color: p.ink }}>
              {p.tag}
            </span>
            <div className="absolute bottom-5 left-5">
              <h3 className="font-display text-[40px] uppercase leading-none tracking-tight" style={{ color: p.ink }}>{p.city}</h3>
              <p className="mt-1 text-[12.5px] font-bold uppercase tracking-[0.04em]" style={{ color: p.ink, opacity: 0.7 }}>{p.state}</p>
            </div>
          </div>

          {/* Lista de puntos */}
          <ul className="flex flex-col divide-y-2 divide-[var(--ink)]/10 border-t-[3px] border-[var(--ink)]">
            {p.points.map((pt, i) => {
              const inner = (
                <>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--ink)] bg-[var(--clay)] text-[12px] font-bold tabular-nums text-[var(--bone)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold uppercase leading-tight tracking-tight text-[var(--ink)]">{pt.name}</p>
                    <p className="text-[13px] font-medium leading-snug text-[var(--ink)]/55">{pt.area}</p>
                  </div>
                  {pt.maps && (
                    <span className="shrink-0 text-[11px] font-bold uppercase tracking-tight text-[var(--clay)]">Ver →</span>
                  )}
                </>
              );
              return pt.maps ? (
                <li key={i}>
                  <a href={pt.maps} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-[var(--tan)]/50">
                    {inner}
                  </a>
                </li>
              ) : (
                <li key={i} className="flex items-center gap-3.5 px-5 py-4">
                  {inner}
                </li>
              );
            })}
          </ul>
        </div>
      </Reveal>
    );
  }

  function PuntosDeVenta() {
    return (
      <section id="puntos" className="relative overflow-hidden border-t-2 border-[var(--ink)] bg-[var(--bone)] py-16 md:py-20">
        <div className="halftone pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative mx-auto max-w-[1280px] px-5 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <Reveal><Pill>Encuéntranos cerca</Pill></Reveal>
              <Reveal delay={0.06}>
                <h2 className="mt-3 font-display text-[clamp(2.2rem,5.5vw,4rem)] uppercase leading-[0.9] tracking-tight text-[var(--ink)]">
                  Puntos de <span className="text-[var(--clay)]">venta.</span>
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1} className="max-w-[34ch] text-[15px] font-medium leading-relaxed text-[var(--ink)]/60">
              Dos ciudades, un mismo crujido. Pásate por tu favorito o pregúntanos por nuevos puntos.
            </Reveal>
          </div>

          <div className="mt-10 grid items-stretch gap-7 md:grid-cols-2">
            {window.PLAZAS.map((p, i) => (
              <PlazaCard key={p.city} p={p} delay={0.08 + i * 0.08} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  window.PuntosDeVenta = PuntosDeVenta;
})();
