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
    Menu: (p) => (
      <svg viewBox="0 0 24 24" fill="none" width="1em" height="1em" {...p}>
        <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    WhatsApp: (p) => (
      <svg viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em" {...p}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    ),
  };
})();
