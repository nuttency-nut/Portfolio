// Loop settings adapted from the supplied React Bits LogoLoop.
document.querySelectorAll('.about-tools-window').forEach(viewport => {
  const track = viewport.querySelector('.about-tools-track');
  const group = track.querySelector('.about-tools-list');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const speed = Number(viewport.dataset.speed ?? 85);
  const direction = viewport.dataset.direction === 'right' ? -1 : 1;
  const tilt = Number(viewport.dataset.tilt ?? 0) * Math.PI / 180;
  let loop = null;
  let period = 0;
  let visible = false;
  let hovered = false;
  let focused = false;
  let drag = null;
  let introduced = false;
  let suppressClickUntil = 0;

  // A leading copy keeps both ends filled while looping and dragging.
  for (let index = 0; index < 3; index++) {
    const copy = group.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    for (const link of copy.querySelectorAll('a')) link.tabIndex = -1;
    if (index === 0) track.prepend(copy);
    else track.append(copy);
  }

  function sync() {
    if (!loop) return;
    if (visible && !hovered && !focused && !drag && !document.hidden && !reduced.matches) loop.play();
    else loop.pause();
  }

  function resize() {
    viewport.style.setProperty('--tools-perspective', `${Math.max(viewport.clientWidth, 480) * 1.3}px`);
    if (reduced.matches) {
      loop?.cancel();
      loop = null;
      return;
    }
    const width = group.offsetWidth;
    if (!width || (width === period && loop)) return;
    const phase = loop ? Number(loop.currentTime) / (period / speed * 2000) % 1 : .5;
    loop?.cancel();
    period = width;
    loop = track.animate([
      { transform: 'translateX(0)' },
      { transform: `translateX(${-period * 2}px)` },
    ], { duration: period / speed * 2000, iterations: Infinity, easing: 'linear', direction: direction === 1 ? 'normal' : 'reverse' });
    loop.currentTime = phase * period / speed * 2000;
    sync();
  }

  function seek(time) {
    if (!loop) return;
    const duration = period / speed * 2000;
    loop.currentTime = (time % duration + duration) % duration;
  }

  function pointerPosition(clientX) {
    const x = clientX - viewport.getBoundingClientRect().left - viewport.clientWidth / 2;
    const depth = Math.max(viewport.clientWidth, 480) * 1.3;
    return x * depth / (Math.cos(tilt) * depth - Math.sin(tilt) * x);
  }

  function release(event) {
    if (!drag || (event?.pointerId !== undefined && event.pointerId !== drag.id)) return;
    const id = drag.id;
    if (drag.active) suppressClickUntil = performance.now() + 350;
    drag = null;
    delete viewport.dataset.dragging;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    sync();
  }

  viewport.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { hovered = true; sync(); }
  });
  viewport.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') { hovered = false; sync(); }
  });
  viewport.addEventListener('focusin', event => {
    focused = event.target.matches(':focus-visible');
    if (focused && event.target.matches('a') && !reduced.matches) {
      const item = event.target.closest('li');
      const offset = item.parentElement.offsetLeft + item.offsetLeft + item.offsetWidth / 2 - viewport.clientWidth / 2;
      viewport.scrollLeft = 0;
      const time = offset / speed * 1000;
      seek(direction === 1 ? time : period / speed * 2000 - time);
    }
    sync();
  });
  viewport.addEventListener('focusout', () => { focused = false; sync(); });
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0 || reduced.matches || drag) return;
    focused = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: pointerPosition(event.clientX), time: Number(loop?.currentTime ?? 0), active: false };
    if (event.pointerType === 'mouse') event.preventDefault();
    sync();
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    if (!drag.active) {
      const dx = Math.abs(event.clientX - drag.x), dy = Math.abs(event.clientY - drag.y);
      if (dy > dx && dy > 6) { release(event); return; }
      if (dx < 6) return;
      drag.active = true;
      viewport.dataset.dragging = '';
      viewport.setPointerCapture(event.pointerId);
    }
    seek(drag.time - (pointerPosition(event.clientX) - drag.origin) / (speed * direction) * 1000);
  });
  for (const name of ['pointerup', 'pointercancel']) viewport.addEventListener(name, release);
  viewport.addEventListener('lostpointercapture', event => {
    if (event.target === viewport) release(event);
  });
  // A mouse can leave the viewport before reaching the drag threshold.
  addEventListener('pointerup', release);
  viewport.addEventListener('click', event => {
    if (event.detail > 0 && performance.now() < suppressClickUntil) event.preventDefault();
  }, true);
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('keydown', event => {
    if (reduced.matches || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    seek(Number(loop?.currentTime ?? 0) + (event.key === 'ArrowRight' ? 1 : -1) * viewport.clientWidth * .75 / (speed * direction) * 1000);
  });
  const observer = new ResizeObserver(resize);
  observer.observe(viewport);
  observer.observe(group);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !introduced) {
      introduced = true;
      if (!reduced.matches) {
        for (const list of track.children) {
          [...list.children].forEach((item, index) => item.animate([
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], { duration: 700, delay: index / group.children.length * 450, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'backwards' }));
        }
      }
    }
    sync();
  }).observe(viewport);
  reduced.addEventListener('change', () => {
    release();
    viewport.scrollLeft = 0;
    if (reduced.matches) {
      for (const item of track.querySelectorAll('li')) {
        for (const animation of item.getAnimations()) animation.cancel();
      }
    }
    resize();
  });
  addEventListener('blur', () => { hovered = false; release(); sync(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) release(); sync(); });
  viewport.classList.add('is-ready');
  resize();
});
