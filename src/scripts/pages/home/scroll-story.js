(() => {
  const story = document.querySelector('.scroll-story');
  if (!story) return;
  const track = story.querySelector('.scroll-story-track');
  const path = story.querySelector('.scroll-story-mask');
  const rail = story.querySelector('.scroll-story-rail');
  const dot = story.querySelector('.scroll-story-dot');
  const glow = story.querySelector('.scroll-story-glow');
  const rows = [...story.querySelectorAll('.scroll-story-row')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 767px)');
  const disclosures = rows.map(row => row.querySelector('.scroll-story-details'));
  const dotToggle = story.querySelector('.scroll-story-dot-toggle');
  const hint = story.querySelector('.scroll-story-hint');
  const disclosureStates = new Map(disclosures.map(detail => [detail, {
    expanded: detail.open,
    animation: null,
    copy: detail.querySelector('.scroll-story-details-copy'),
  }]));
  function syncDotToggle() {
    const allOpen = disclosures.every(detail => disclosureStates.get(detail).expanded);
    const label = `${allOpen ? 'Thu gọn' : 'Mở rộng'} tất cả các mốc`;
    dotToggle.setAttribute('aria-expanded', String(allOpen));
    dotToggle.setAttribute('aria-controls', disclosures.map(detail => detail.id).join(' '));
    dotToggle.setAttribute('aria-label', label);
    dotToggle.title = label;
    hint.classList.toggle('is-used', disclosures.some(detail => disclosureStates.get(detail).expanded));
  }
  function settleDisclosure(detail) {
    const state = disclosureStates.get(detail);
    state.animation?.cancel();
    state.animation = null;
    delete detail.dataset.animating;
    detail.open = state.expanded;
    for (const property of ['height', 'opacity', 'transform']) state.copy.style.removeProperty(property);
    syncDotToggle();
    layout();
  }
  function setExpanded(detail, expanded, animate = true) {
    const state = disclosureStates.get(detail);
    const { copy } = state;
    if (state.expanded === expanded && !state.animation && detail.open === expanded) return;
    const fromHeight = detail.open ? copy.getBoundingClientRect().height : 0;
    const style = getComputedStyle(copy);
    const fromOpacity = detail.open ? style.opacity : '0';
    const fromTransform = detail.open ? style.transform : 'translateY(8px)';
    state.animation?.cancel();
    state.animation = null;
    state.expanded = expanded;
    detail.dataset.expanded = String(expanded);
    rows[disclosures.indexOf(detail)].classList.toggle('is-expanded', expanded);
    detail.querySelector('summary').setAttribute('aria-expanded', String(expanded));
    if (!expanded && copy.contains(document.activeElement)) detail.querySelector('summary').focus({ preventScroll: true });
    copy.inert = !expanded;
    copy.setAttribute('aria-hidden', String(!expanded));
    syncDotToggle();
    if (!animate || reduced.matches || !copy.animate) { settleDisclosure(detail); return; }
    // Keep native details open until the closing motion finishes.
    detail.open = true;
    copy.style.height = 'auto';
    const toHeight = expanded ? copy.getBoundingClientRect().height : 0;
    copy.style.height = `${fromHeight}px`;
    copy.style.opacity = fromOpacity;
    copy.style.transform = fromTransform;
    const animation = copy.animate([
      { height: `${fromHeight}px`, opacity: fromOpacity, transform: fromTransform },
      { height: `${toHeight}px`, opacity: expanded ? 1 : 0, transform: expanded ? 'translateY(0)' : 'translateY(8px)' },
    ], { duration: expanded ? 800 : 650, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
    state.animation = animation;
    detail.dataset.animating = 'true';
    animation.finished.then(() => {
      if (state.animation === animation) settleDisclosure(detail);
    }, () => {});
    layout();
  }
  disclosures.forEach((detail, index) => {
    const state = disclosureStates.get(detail);
    rows[index].classList.toggle('is-expanded', state.expanded);
    detail.dataset.expanded = String(state.expanded);
    detail.querySelector('summary').setAttribute('aria-expanded', String(state.expanded));
    state.copy.inert = !state.expanded;
    state.copy.setAttribute('aria-hidden', String(!state.expanded));
    detail.querySelector('summary').addEventListener('click', event => {
      event.preventDefault();
      setExpanded(detail, !state.expanded);
    });
    detail.addEventListener('toggle', () => {
      if (!state.animation && detail.open !== state.expanded) setExpanded(detail, detail.open, false);
    });
  });
  syncDotToggle();
  dotToggle.addEventListener('click', () => {
    const expand = !disclosures.every(detail => disclosureStates.get(detail).expanded);
    disclosures.forEach(detail => setExpanded(detail, expand));
  });
  let total = 0;
  let frame = 0;
  let previous = -1;

  const container = story.closest('.scroll-story-container');
  const lessonPanel = container.querySelector('.scroll-story-lessons');
  const quotes = rows.map(row => {
    const quote = row.querySelector('.scroll-story-lesson p').cloneNode(true);
    quote.className = 'scroll-story-lesson-quote';
    lessonPanel.querySelector('.scroll-story-lesson-quotes').append(quote);
    return quote;
  });
  let activeLesson = -1;
  container.classList.add('has-lesson-panel');
  lessonPanel.hidden = false;

  function syncLesson() {
    let index = 0;
    rows.forEach((row, i) => { if (row.getBoundingClientRect().top <= innerHeight * .6) index = i; });
    if (index === activeLesson) return;
    activeLesson = index;
    quotes.forEach((quote, i) => quote.classList.toggle('is-active', i === index));
  }

  const photos = [...story.querySelectorAll('.scroll-story-photo')];
  const videoPhotos = photos.filter(photo => photo.querySelector('video'));
  let centeredPhoto = null;
  function syncPhotoVideo(photo) {
    const video = photo.querySelector('video');
    if (!video) return;
    const bounds = photo.getBoundingClientRect();
    const visible = bounds.bottom > 0 && bounds.top < innerHeight;
    if (photo.classList.contains('is-open') && visible && !document.hidden && !reduced.matches) {
      video.muted = true;
      video.play().catch(() => { /* Keep the poster if playback is blocked or interrupted. */ });
    } else video.pause();
  }
  function setPhotoOpen(photo, open) {
    photo.classList.toggle('is-open', open);
    photo.querySelector('button').setAttribute('aria-expanded', String(open));
    syncPhotoVideo(photo);
  }
  function openPhoto(photo) {
    photos.forEach(item => setPhotoOpen(item, item === photo));
  }
  function syncPhotoFocus() {
    if (!mobile.matches) return;
    let nearest = null;
    let distance = Math.min(120, innerHeight * .16);
    photos.forEach(photo => {
      const rect = photo.getBoundingClientRect();
      const offset = Math.abs(rect.top + rect.height / 2 - innerHeight / 2);
      if (offset < distance) { nearest = photo; distance = offset; }
    });
    if (nearest === centeredPhoto) return;
    centeredPhoto = nearest;
    photos.forEach(photo => setPhotoOpen(photo, photo === nearest));
  }
  photos.forEach(photo => {
    const button = photo.querySelector('.scroll-story-photo-toggle');
    button.addEventListener('pointerenter', event => { if (!mobile.matches && event.pointerType === 'mouse') openPhoto(photo); });
    button.addEventListener('pointerleave', event => { if (!mobile.matches && event.pointerType === 'mouse') setPhotoOpen(photo, false); });
    button.addEventListener('click', event => {
      if (event.pointerType === 'mouse' || !photo.classList.contains('is-open')) openPhoto(photo);
      else setPhotoOpen(photo, false);
      // Reduced motion keeps a still poster until the visitor explicitly opens it.
      if (reduced.matches && photo.classList.contains('is-open')) {
        const video = photo.querySelector('video');
        if (video) video.play().catch(() => { /* Keep the poster if playback is unavailable. */ });
      }
    });
    button.addEventListener('blur', () => { if (!mobile.matches) setPhotoOpen(photo, false); });
  });
  if (videoPhotos.length) {
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => syncPhotoVideo(entry.target));
    });
    videoPhotos.forEach(photo => videoObserver.observe(photo));
    document.addEventListener('visibilitychange', () => videoPhotos.forEach(syncPhotoVideo));
    reduced.addEventListener('change', () => videoPhotos.forEach(syncPhotoVideo));
  }
  document.addEventListener('pointerdown', event => {
    if (mobile.matches) return;
    photos.forEach(photo => { if (!photo.contains(event.target)) setPhotoOpen(photo, false); });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') photos.forEach(photo => setPhotoOpen(photo, false));
  });

  const description = story.querySelector('.scroll-story-description');
  if (description && !reduced.matches) {
    const source = description.querySelector('.scroll-story-description-source');
    const typed = description.querySelector('.scroll-story-description-typed');
    const characters = [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(source.textContent)]
      .map(part => part.segment);
    let index = 0;
    let timer = 0;
    description.classList.add('is-typing');
    function finishTyping() {
      clearTimeout(timer);
      description.classList.remove('is-typing');
      typed.textContent = '';
      observer.disconnect();
    }
    function type() {
      if (reduced.matches || index === characters.length) { finishTyping(); return; }
      const character = characters[index++];
      typed.textContent += character;
      timer = setTimeout(type, /[!?.…]/.test(character) ? 200 : 24);
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25)) return;
      observer.disconnect();
      type();
    }, { rootMargin: '-120px 0px -10% 0px', threshold: .25 });
    observer.observe(description);
    reduced.addEventListener('change', () => { if (reduced.matches) finishTyping(); });
  }

  function update() {
    frame = 0;
    syncLesson();
    syncPhotoFocus();
    dotToggle.hidden = !total || reduced.matches || mobile.matches || !track.getClientRects().length;
    hint.toggleAttribute('hidden', dotToggle.hidden);
    if (dotToggle.hidden) return;
    const bounds = track.getBoundingClientRect();
    const start = scrollY + bounds.top - innerHeight / 2;
    // The last point must remain reachable when this is the page's final section.
    const end = Math.min(start + bounds.height, document.documentElement.scrollHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
    hint.classList.toggle('is-dismissed', progress > .0005);
    if (progress === previous) return;
    previous = progress;
    const point = path.getPointAtLength(total * progress);
    for (const circle of [dot, glow]) {
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
    }
    dotToggle.style.left = `${point.x}px`;
    dotToggle.style.top = `${point.y}px`;
  }

  function layout() {
    container.style.setProperty('--story-intro-height', `${story.querySelector('.scroll-story-body').offsetTop}px`);
    const width = story.clientWidth;
    const height = rows.at(-1).offsetTop + rows.at(-1).offsetHeight;
    const left = width * .4, right = width * .6, center = width * .5;
    let x = left;
    let d = `M ${center} 0 V 18 Q ${center} 30 ${center - 12} 30 H ${left + 12} Q ${left} 30 ${left} 42`;
    for (let i = 0; i < rows.length - 1; i++) {
      const y = rows[i + 1].offsetTop;
      const nextX = i % 2 === 0 ? right : left;
      const direction = Math.sign(nextX - x);
      if (i === 1) {
        // Preserve the demo's diagonal turn between the second and third rows.
        d += ` V ${y - 70} Q ${x} ${y - 64} ${x - 6} ${y - 58} L ${nextX + 6} ${y + 58} Q ${nextX} ${y + 64} ${nextX} ${y + 70}`;
      } else {
        d += ` V ${y - 12} Q ${x} ${y} ${x + direction * 12} ${y} H ${nextX - direction * 12} Q ${nextX} ${y} ${nextX} ${y + 12}`;
      }
      x = nextX;
    }
    d += ` V ${height - 24} Q ${x} ${height - 12} ${x + 12} ${height - 12} H ${center}`;
    track.setAttribute('viewBox', `0 0 ${width} ${height}`);
    path.setAttribute('d', d);
    rail.setAttribute('d', d);
    total = path.getTotalLength();
    previous = -1;
    onScroll();
  }

  function onScroll() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  mobile.addEventListener('change', () => {
    centeredPhoto = null;
    photos.forEach(photo => setPhotoOpen(photo, false));
    onScroll();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) disclosures.forEach(detail => { if (disclosureStates.get(detail).animation) settleDisclosure(detail); });
    previous = -1;
    onScroll();
  });
  new ResizeObserver(layout).observe(story);
  document.fonts.ready.then(layout);
  layout();
})();
