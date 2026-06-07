// ─── App ──────────────────────────────────────────────────────────────────────
// Componente raíz. Orquesta todos los componentes de la página.

(function () {
  const { useState } = React;

  function App() {
    const [cart, { addToCart, removeFromCart }] = window.useCart();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const cartCount = cart.reduce((n, i) => n + i.qty, 0);

    return (
      <div className="min-h-screen bg-[var(--bone)] text-[var(--ink)]">
        <Nav cartCount={cartCount} onCartOpen={() => setDrawerOpen(true)} />
        <Hero
          logoSrc={window.ASSET.mascotSticker}
          circleColor="#C41E1E"
          badge="Snacks saludables de malanga"
        />
        <Marquee speed={24} />
        <Manifesto />
        <FlavorGallery cart={cart} onAdd={addToCart} onRemove={removeFromCart} />
        <PuntosDeVenta />
        <ContactSection />
        <Footer />

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
