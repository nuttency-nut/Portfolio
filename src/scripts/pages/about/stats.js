(() => {
  const counters = [...document.querySelectorAll('.about-stat-value[data-count]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!counters.length || reduced.matches || !window.IntersectionObserver || !Element.prototype.animate) return;
  const running = new Map();
  function finish(counter) {
    const state = running.get(counter);
    if (!state) return;
    running.delete(counter);
    state.animation.cancel();
    counter.textContent = state.final;
    counter.classList.remove('is-counting');
  }
  function count(counter) {
    const target = Number(counter.dataset.count);
    if (!Number.isSafeInteger(target) || target <= 0) return;
    const suffix = counter.dataset.suffix || '';
    const final = `${target}${suffix}`;
    const visual = document.createElement('span');
    visual.className = 'about-counter';
    visual.setAttribute('aria-hidden', 'true');
    const reelWindow = document.createElement('span');
    reelWindow.className = 'about-counter-window';
    const track = document.createElement('span');
    track.className = 'about-counter-track';
    // Limit the reel to about 100 rows even if a future metric is much larger.
    const step = Math.max(1, Math.ceil(target / 100));
    for (let number = 0; number < target; number += step) {
      const row = document.createElement('span');
      row.textContent = number;
      track.append(row);
    }
    const last = document.createElement('span');
    last.textContent = target;
    track.append(last);
    reelWindow.append(track);
    visual.append(reelWindow, document.createTextNode(suffix));
    counter.setAttribute('aria-label', final);
    counter.replaceChildren(visual);
    counter.classList.add('is-counting');
    const animation = track.animate([
      { transform: 'translateY(0)' },
      { transform: 'translateY(calc(-100% + 1.1em))' },
    ], { duration: 1800, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });
    running.set(counter, { animation, final });
    animation.finished.then(() => finish(counter), () => {});
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting || entry.intersectionRatio < .5) continue;
      observer.unobserve(entry.target);
      if (!reduced.matches) count(entry.target);
    }
  }, { threshold: .5 });
  document.fonts.ready.then(() => {
    if (!reduced.matches) counters.forEach(counter => observer.observe(counter));
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    observer.disconnect();
    [...running.keys()].forEach(finish);
  });
})();
