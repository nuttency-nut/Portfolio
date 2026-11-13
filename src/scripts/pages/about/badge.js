// Blur and vertical slide inspired by https://preview.21st.dev/@witharc/components/logo-carousel.
(async () => {
  const badge = document.querySelector('.about-name-tag');
  if (!badge) return;
  const candidates = [...badge.querySelectorAll('.about-badge-panel')];
  const companies = candidates.slice(1);
  const loaded = await Promise.allSettled(companies.map(panel => panel.querySelector('img').decode()));
  await document.fonts.ready;
  const panels = [candidates[0], ...companies.filter((panel, index) => loaded[index].status === 'fulfilled')];
  if (panels.length < 2) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let visible = false;
  let hovered = false;
  let focused = false;
  let timer = 0;
  let animations = [];

  for (const [index, panel] of panels.entries()) {
    panel.hidden = false;
    panel.inert = index !== 0;
    panel.setAttribute('aria-hidden', String(index !== 0));
  }

  function sync() {
    clearTimeout(timer);
    timer = 0;
    if (visible && !hovered && !focused && !document.hidden && !reduced.matches && !animations.length) {
      timer = setTimeout(advance, 3200);
    }
  }

  function advance() {
    const previous = panels[current];
    current = (current + 1) % panels.length;
    const next = panels[current];
    previous.classList.replace('is-current', 'is-leaving');
    previous.inert = true;
    previous.setAttribute('aria-hidden', 'true');
    next.classList.add('is-current');
    next.inert = false;
    next.setAttribute('aria-hidden', 'false');
    const timing = { duration: 500, easing: 'ease-in-out', fill: 'both' };
    animations = [
      previous.animate([
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
        { opacity: 0, transform: 'translateY(-20px)', filter: 'blur(8px)' },
      ], timing),
      next.animate([
        { opacity: 0, transform: 'translateY(20px)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0px)' },
      ], timing),
    ];
    Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      previous.classList.remove('is-leaving');
      for (const animation of animations) animation.cancel();
      animations = [];
      sync();
    });
  }

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(badge);
  badge.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; sync(); }
  });
  badge.addEventListener('pointerleave', () => { hovered = false; sync(); });
  badge.addEventListener('focusin', () => { focused = true; sync(); });
  badge.addEventListener('focusout', () => { focused = false; sync(); });
  reduced.addEventListener('change', () => {
    if (reduced.matches) for (const animation of animations) animation.finish();
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  sync();
})();
