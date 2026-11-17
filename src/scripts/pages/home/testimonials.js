(() => {
  const section = document.querySelector('.testimonials');
  if (!section) return;
  const track = section.querySelector('.testimonials-track');
  const group = section.querySelector('.testimonials-group');
  const viewport = section.querySelector('.testimonials-window');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const copy = group.cloneNode(true);
  copy.setAttribute('aria-hidden', 'true');
  // Cloned links remain clickable without adding duplicate keyboard tab stops.
  copy.querySelectorAll('a[href]').forEach(link => { link.tabIndex = -1; });
  track.append(copy);
  let visible = false;
  let drag = null;
  const sync = () => {
    section.dataset.moving = String(visible && !drag && !document.hidden && !reduced.matches);
    section.dataset.dragging = String(Boolean(drag));
  };
  const animation = () => track.getAnimations()[0];
  const seek = time => {
    const loop = animation();
    if (!loop) return;
    const duration = loop.effect.getTiming().duration;
    loop.currentTime = ((time % duration) + duration) % duration;
  };
  const release = event => {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const id = drag.id;
    drag = null;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    sync();
  };
  // Two equal groups travel exactly one group width, so the loop has no jump.
  const resize = () => {
    track.style.setProperty('--testimonials-duration', `${group.getBoundingClientRect().width / 42}s`);
  };
  new ResizeObserver(resize).observe(group);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(section);
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || drag) return;
    if (event.target.closest('a[href], button, input, select, textarea')) return;
    if (reduced.matches && event.pointerType !== 'mouse') return;
    drag = { id: event.pointerId, x: event.clientX, time: animation()?.currentTime ?? 0, scroll: viewport.scrollLeft, native: reduced.matches };
    viewport.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') event.preventDefault();
    sync();
    if (!drag.native) seek(drag.time);
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const distance = event.clientX - drag.x;
    if (drag.native) viewport.scrollLeft = drag.scroll - distance;
    else seek(drag.time - distance / 42 * 1000);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(name, release);
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('keydown', event => {
    if (reduced.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    seek((animation()?.currentTime ?? 0) + (event.key === 'ArrowRight' ? 1 : -1) * viewport.clientWidth * .75 / 42 * 1000);
  });
  window.addEventListener('blur', () => release());
  reduced.addEventListener('change', () => { release(); viewport.scrollLeft = 0; sync(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); sync(); });
  resize();
  section.classList.add('is-ready');
  sync();
})();
