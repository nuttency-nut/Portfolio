(() => {
  const section = document.querySelector('.work-timeline-section');
  if (!section) return;
  const MOVE = 1000; // One second per segment; no hold between milestones.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 767px)');
  const viewport = section.querySelector('.work-timeline');
  const inner = section.querySelector('.work-timeline-inner');
  const track = section.querySelector('.work-timeline-track');
  const runner = section.querySelector('.work-timeline-runner');
  const items = [...section.querySelectorAll('.work-timeline-item')];
  if (!items.length) return;
  inner.style.setProperty('--timeline-count', items.length);
  section.style.setProperty('--timeline-move', `${MOVE}ms`);
  let index = 0, reachedIndex = 0, stepFrame = 0, moving = false, visible = false, touching = false;
  let previewPinned = false, activePhotoButton = null, restoringPhotoFocus = false;
  let previewAnimation = null;
  const photoGroups = [];
  const preview = document.createElement('div');
  preview.id = 'work-timeline-photo-preview';
  preview.className = 'work-timeline-photo-preview';
  preview.hidden = true;
  preview.setAttribute('role', 'region');
  preview.innerHTML = '<img alt="" /><button class="work-timeline-photo-close" type="button" aria-label="Đóng ảnh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>';
  document.body.append(preview);
  const previewImage = preview.querySelector('img');
  const marks = items.map((item, i) => {
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'work-timeline-mark';
    mark.setAttribute('aria-label', `Mốc ${i + 1}: ${item.querySelector('h3').textContent.trim()}`);
    mark.addEventListener('click', () => go(i));
    track.append(mark);
    item.addEventListener('click', () => go(i));
    const photos = document.createElement('div');
    photos.className = `work-timeline-photos${i === items.length - 1 ? ' is-final' : ''}`;
    photos.setAttribute('role', 'group');
    photos.setAttribute('aria-label', `Ảnh của ${item.querySelector('h3').textContent.trim()}`);
    photos.inert = true;
    const sources = item.querySelector('.work-timeline-photo-sources')?.content.querySelectorAll('img') || [];
    [...sources].slice(0, 3).forEach((source, photoIndex) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'work-timeline-photo';
      button.setAttribute('aria-label', `Xem ${source.alt || `ảnh ${photoIndex + 1} của mốc ${i + 1}`}`);
      button.setAttribute('aria-controls', preview.id);
      button.setAttribute('aria-expanded', 'false');
      const image = source.cloneNode();
      image.loading = 'lazy';
      image.decoding = 'async';
      button.append(image);
      button.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse' && !previewPinned) openPhoto(button, false);
      });
      button.addEventListener('pointerleave', () => { if (!previewPinned && activePhotoButton === button) closePhoto(); });
      button.addEventListener('focus', () => { if (!restoringPhotoFocus && !previewPinned) openPhoto(button, false); });
      button.addEventListener('blur', () => { if (!previewPinned && activePhotoButton === button) closePhoto(); });
      button.addEventListener('click', event => {
        event.stopPropagation();
        if (previewPinned && activePhotoButton === button) closePhoto();
        else openPhoto(button, true);
      });
      photos.append(button);
    });
    track.append(photos);
    photoGroups.push(photos);
    return mark;
  });
  const posOf = i => mobile.matches
    ? items[i].offsetTop + items[i].querySelector('h3').offsetTop + 22
    : items[i].offsetLeft - track.offsetLeft + 24;
  const schedule = () => {
    cancelAnimationFrame(stepFrame);
    if (!visible || moving || touching || previewPinned || document.hidden || reducedMotion.matches || index >= items.length - 1) return;
    stepFrame = requestAnimationFrame(() => go(index + 1));
  };
  function setPosition(i) {
    track.style.setProperty(mobile.matches ? '--timeline-y' : '--timeline-x', `${posOf(i)}px`);
    if (mobile.matches) track.style.setProperty('--timeline-progress', String((posOf(i) - posOf(0)) / Math.max(1, posOf(items.length - 1) - posOf(0))));
  }
  function layout() {
    marks.forEach((mark, i) => {
      const parent = mobile.matches ? items[i] : track;
      if (photoGroups[i].parentElement !== parent) parent.append(photoGroups[i]);
      mark.style.left = mobile.matches ? '50%' : `${posOf(i)}px`;
      mark.style.top = mobile.matches ? `${posOf(i)}px` : '';
      photoGroups[i].style.setProperty('--photo-x', `${posOf(i)}px`);
    });
    track.style.setProperty('--timeline-start', `${posOf(0)}px`);
    const length = mobile.matches ? track.clientHeight : track.clientWidth;
    track.style.setProperty('--timeline-end-gap', `${length - posOf(items.length - 1)}px`);
    setPosition(index);
  }
  function showReached(i) {
    reachedIndex = i;
    marks.forEach((mark, k) => {
      mark.classList.toggle('done', k <= i);
      if (k === i) mark.setAttribute('aria-current', 'step');
      else mark.removeAttribute('aria-current');
    });
    items.forEach((item, k) => item.classList.toggle('active', k <= i));
    runner.classList.toggle('arrived', i === items.length - 1);
    if (visible) revealPhotos();
  }
  function revealPhotos() {
    photoGroups.forEach((group, i) => {
      if (i <= reachedIndex) {
        group.classList.add('is-reached');
        group.inert = false;
      }
    });
  }
  function positionPhoto() {
    if (preview.hidden || !activePhotoButton) return;
    const rect = activePhotoButton.getBoundingClientRect();
    const scroller = viewport.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || rect.right < scroller.left || rect.left > scroller.right) {
      closePhoto();
      return;
    }
    const width = preview.offsetWidth, height = preview.offsetHeight;
    const safeTop = (document.querySelector('.topbar-wrap')?.getBoundingClientRect().bottom || 0) + 12;
    const left = Math.max(12, Math.min(innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    let top = rect.top - height - 12;
    if (top < safeTop) top = rect.bottom + 12;
    top = Math.max(12, Math.min(innerHeight - height - 12, top));
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  }
  function openPhoto(button, pinned) {
    const fromRect = preview.hidden ? button.querySelector('img').getBoundingClientRect() : preview.getBoundingClientRect();
    const fromOpacity = preview.hidden ? 0 : getComputedStyle(preview).opacity;
    previewAnimation?.cancel();
    activePhotoButton?.setAttribute('aria-expanded', 'false');
    activePhotoButton = button;
    previewPinned = pinned;
    const image = button.querySelector('img');
    previewImage.src = image.currentSrc || image.src;
    previewImage.alt = image.alt;
    preview.setAttribute('aria-label', image.alt || button.getAttribute('aria-label'));
    preview.hidden = false;
    preview.inert = false;
    preview.classList.toggle('is-pinned', pinned);
    button.setAttribute('aria-expanded', 'true');
    if (pinned) viewport.scrollTo({ left: viewport.scrollLeft, behavior: 'instant' });
    positionPhoto();
    if (activePhotoButton !== button) return;
    animatePhoto(fromRect, fromOpacity, null);
    schedule();
  }
  function animatePhoto(fromRect, fromOpacity, toRect) {
    const opening = !toRect;
    if (reducedMotion.matches) { preview.hidden = !opening; previewAnimation = null; return; }
    const bounds = preview.getBoundingClientRect();
    const transform = rect => `translate(${rect.left - bounds.left}px, ${rect.top - bounds.top}px) scale(${rect.width / bounds.width})`;
    const animation = preview.animate([
      { opacity: fromOpacity, transform: transform(fromRect) },
      { opacity: opening ? 1 : 0, transform: opening ? 'none' : transform(toRect) },
    ], {
      duration: opening ? 320 : 180,
      easing: opening ? 'cubic-bezier(.16, 1, .3, 1)' : 'cubic-bezier(.4, 0, 1, 1)',
      fill: 'both',
    });
    previewAnimation = animation;
    animation.finished.then(() => {
      if (previewAnimation !== animation) return;
      if (!opening) preview.hidden = true;
      animation.cancel();
      previewAnimation = null;
    }).catch(() => {}); // A quick hover switch cancels the previous animation.
  }
  function closePhoto() {
    const button = activePhotoButton;
    if (!button || preview.hidden) return;
    const fromRect = preview.getBoundingClientRect();
    const fromOpacity = getComputedStyle(preview).opacity;
    const imageRect = button.querySelector('img').getBoundingClientRect();
    const toRect = { width: imageRect.width,
      left: Math.max(0, Math.min(innerWidth - imageRect.width, imageRect.left)),
      top: Math.max(0, Math.min(innerHeight - imageRect.height, imageRect.top)) };
    previewAnimation?.cancel();
    const returnFocus = preview.contains(document.activeElement);
    button?.setAttribute('aria-expanded', 'false');
    activePhotoButton = null;
    previewPinned = false;
    preview.inert = true;
    preview.classList.remove('is-pinned');
    animatePhoto(fromRect, fromOpacity, toRect);
    if (returnFocus && button) {
      restoringPhotoFocus = true;
      button.focus({ preventScroll: true });
      restoringPhotoFocus = false;
    }
    schedule();
  }
  preview.querySelector('button').addEventListener('click', closePhoto);
  document.addEventListener('pointerdown', event => {
    if (previewPinned && !preview.contains(event.target) && !event.target.closest('.work-timeline-photo')) closePhoto();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !preview.hidden) { event.preventDefault(); closePhoto(); }
  });
  window.addEventListener('resize', positionPhoto);
  window.addEventListener('scroll', positionPhoto, { capture: true, passive: true });
  function arrive() {
    moving = false;
    showReached(index);
    schedule();
  }
  function go(i) {
    if (i === index) return;
    cancelAnimationFrame(stepFrame);
    index = i;
    moving = true;
    runner.classList.remove('arrived');
    setPosition(i);
    if (!mobile.matches && visible && viewport.scrollWidth > viewport.clientWidth) {
      viewport.scrollTo({ left: items[i].offsetLeft - 24, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }
    if (reducedMotion.matches) arrive();
  }
  runner.addEventListener('transitionend', event => {
    if (event.target === runner && event.propertyName === 'translate' && moving) arrive();
  });
  viewport.addEventListener('touchstart', () => { touching = true; schedule(); }, { passive: true });
  const endTouch = () => { touching = false; schedule(); };
  viewport.addEventListener('touchend', endTouch, { passive: true });
  viewport.addEventListener('touchcancel', endTouch, { passive: true });
  viewport.addEventListener('keydown', event => {
    if (event.target.closest('.work-timeline-photo')) return;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    go(Math.max(0, Math.min(items.length - 1, index + (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1))));
  });
  document.addEventListener('visibilitychange', () => schedule());
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches && previewAnimation) {
      previewAnimation.cancel();
      previewAnimation = null;
      preview.hidden = !activePhotoButton;
    }
    if (reducedMotion.matches && moving) arrive();
    else schedule();
  });
  new ResizeObserver(layout).observe(viewport);
  const visibleMarks = new Set();
  const visibility = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) visibleMarks.add(entry.target);
      else visibleMarks.delete(entry.target);
    });
    visible = visibleMarks.size > 0;
    if (visible) revealPhotos();
    schedule();
  }, { threshold: 0, rootMargin: '-104px 0px -24px 0px' });
  marks.forEach(mark => visibility.observe(mark));
  document.fonts.ready.then(layout);
  layout();
  showReached(0);
})();
