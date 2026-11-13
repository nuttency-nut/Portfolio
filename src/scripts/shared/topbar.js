(() => {
  const wrap = document.getElementById('topbar');
  const button = document.getElementById('menuBtn');
  const menu = document.getElementById('mobileMenu');
  const desktop = window.matchMedia('(min-width: 768px)');

  function setOpen(open) {
    wrap.classList.toggle('open', open);
    menu.hidden = !open;
    menu.inert = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
  }

  button.addEventListener('click', () => setOpen(menu.hidden));
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      button.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) setOpen(false);
  });
  wrap.addEventListener('focusout', (event) => {
    if (!wrap.contains(event.relatedTarget)) setOpen(false);
  });
  desktop.addEventListener('change', () => {
    if (desktop.matches && menu.contains(document.activeElement)) {
      wrap.querySelector('.nav-links a').focus();
    }
    setOpen(false);
  });

  wrap.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-scroll-target]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(link.dataset.scrollTarget);
    if (!target) {
      // Cross-page Home/Contact links keep a clean URL, without a # fragment.
      try { sessionStorage.setItem('portfolio-scroll-target', link.dataset.scrollTarget); } catch {}
      return;
    }
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  try {
    const pending = sessionStorage.getItem('portfolio-scroll-target');
    const target = pending && document.getElementById(pending);
    if (target) {
      sessionStorage.removeItem('portfolio-scroll-target');
      const restore = () => target.scrollIntoView({ behavior: 'instant', block: 'start' });
      if (document.readyState === 'complete') restore();
      else window.addEventListener('load', restore, { once: true });
    }
  } catch {}
})();
