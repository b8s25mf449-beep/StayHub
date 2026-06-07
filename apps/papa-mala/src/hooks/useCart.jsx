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
