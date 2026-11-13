(() => {
  const frames = [...document.querySelectorAll('.project-media')];
  if (!frames.length) return;
  const visible = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-visible', entry.isIntersecting);
  });
  for (const frame of frames) {
    const image = frame.querySelector('img');
    const error = frame.querySelector('.project-image-error');
    const finish = state => {
      frame.dataset.imageState = state;
      frame.setAttribute('aria-busy', 'false');
      error.hidden = state !== 'error';
      visible.unobserve(frame);
      frame.classList.remove('is-visible');
    };
    const ready = async () => {
      try { await image.decode(); } catch {}
      finish(image.naturalWidth > 0 ? 'ready' : 'error');
    };
    frame.setAttribute('aria-busy', 'true');
    image.addEventListener('load', ready, { once: true });
    image.addEventListener('error', () => finish('error'), { once: true });
    visible.observe(frame);
    if (image.complete) {
      if (image.naturalWidth > 0) void ready();
      else if (image.currentSrc) finish('error');
    }
  }
  document.body.classList.add('has-image-loading');
})();
