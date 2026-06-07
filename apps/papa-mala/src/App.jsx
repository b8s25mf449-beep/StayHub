// ─── App ──────────────────────────────────────────────────────────────────────
// Componente raíz. Orquesta todos los componentes de la página y el panel
// de Tweaks. Aquí se pasa la configuración global de apariencia.

(function () {
  const { useState } = React;

  const LOGO_SRC = {
    sticker: window.ASSET.mascotSticker,
    blanco:  window.ASSET.mascotWhite,
    crema:   window.ASSET.mascotCream,
  };

  const TITLE_FONT = {
    anton: "Anton",
    bebas: '"Bebas Neue"',
    oswald: "Oswald",
  };

  // Valores por defecto del panel de Tweaks.
  // Cambia estos para ajustar el aspecto inicial de la página.
  const TWEAK_DEFAULTS = {
    logo:      "sticker",   // sticker | blanco | crema
    circle:    "#C41E1E",   // color del círculo de la mascota
    accent:    "#C41E1E",   // color rojo de toda la marca
    bg:        "#FAF7F2",   // color de fondo
    titleFont: "anton",     // anton | bebas | oswald
    marquee:   24,          // segundos por vuelta del marquee
    badge:     "Snacks saludables de malanga",
    grain:     true,        // textura de papel encendida/apagada
  };

  function App() {
    const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
    const [cart, { addToCart, removeFromCart }] = window.useCart();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const cartCount = cart.reduce((n, i) => n + i.qty, 0);
    const fam = TITLE_FONT[t.titleFont] || "Anton";

    return (
      <div
        className="min-h-screen bg-[var(--bone)] text-[var(--ink)]"
        style={{ "--clay": t.accent, "--bone": t.bg }}
      >
        {/* Inyecta la fuente de títulos activa */}
        <style>{`.font-display{font-family:${fam},sans-serif!important}`}</style>
        {/* Oculta el grano de papel si el tweak está apagado */}
        {!t.grain && <style>{"body::before{display:none}"}</style>}

        <Nav cartCount={cartCount} onCartOpen={() => setDrawerOpen(true)} />
        <Hero
          logoSrc={LOGO_SRC[t.logo] || LOGO_SRC.sticker}
          circleColor={t.circle}
          badge={t.badge}
        />
        <Marquee speed={t.marquee} />
        <Manifesto />
        <FlavorGallery cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
        <PuntosDeVenta />
        <ContactSection />
        <Footer />

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

        <CartDrawer
          cart={cart}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onAdd={addToCart}
          onRemove={removeFromCart}
        />
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById("root")).render(<App />);
})();
