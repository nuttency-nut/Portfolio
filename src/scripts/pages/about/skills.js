// Pointer motion adapted from https://ui.aceternity.com/components/wobble-card
(() => {
  const cards = document.querySelectorAll('.about-skill-card, .about-faq-item');
  const finePointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  for (const card of cards) {
    const details = card.querySelector('details');
    const summary = details.querySelector('summary');
    const reveal = details.querySelector('.about-skill-reveal, .about-faq-answer');
    const isFaq = card.classList.contains('about-faq-item');
    let expanded = details.open;
    let expansion = null;
    let frame = 0;
    let x = 0;
    let y = 0;

    function resetWobble() {
      cancelAnimationFrame(frame);
      frame = 0;
      card.classList.remove('is-active');
      card.style.removeProperty('--wobble-x');
      card.style.removeProperty('--wobble-y');
    }

    function finishExpansion() {
      expansion?.cancel();
      expansion = null;
      delete details.dataset.animating;
      details.open = expanded;
      for (const property of ['height', 'opacity', 'transform']) reveal.style.removeProperty(property);
    }

    function setExpanded(open, animate = true) {
      if (expanded === open && !expansion && details.open === open) return;
      const height = details.open ? reveal.getBoundingClientRect().height : 0;
      const style = getComputedStyle(reveal);
      const opacity = details.open ? style.opacity : '0';
      const transform = details.open ? style.transform : 'translateY(8px)';
      expansion?.cancel();
      expansion = null;
      expanded = open;
      card.classList.toggle('is-expanded', open);
      summary.setAttribute('aria-expanded', String(open));
      if (!open && reveal.contains(document.activeElement)) summary.focus({ preventScroll: true });
      reveal.inert = !open;
      reveal.setAttribute('aria-hidden', String(!open));
      if (!animate || reduced.matches || !reveal.animate) {
        finishExpansion();
        return;
      }
      details.open = true;
      reveal.style.height = 'auto';
      const targetHeight = open ? reveal.getBoundingClientRect().height : 0;
      reveal.style.height = `${height}px`;
      reveal.style.opacity = opacity;
      reveal.style.transform = transform;
      const animation = reveal.animate([
        { height: `${height}px`, opacity, transform },
        { height: `${targetHeight}px`, opacity: open ? 1 : 0, transform: open ? 'translateY(0)' : 'translateY(8px)' },
      ], { duration: open ? 600 : 450, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' });
      expansion = animation;
      details.dataset.animating = 'true';
      animation.finished.then(() => {
        if (expansion === animation) finishExpansion();
      }, () => {});
    }

    summary.setAttribute('aria-expanded', String(expanded));
    reveal.inert = !expanded;
    reveal.setAttribute('aria-hidden', String(!expanded));
    summary.addEventListener('click', event => {
      event.preventDefault();
      if (isFaq && event.pointerType === 'mouse' && finePointer.matches) return;
      setExpanded(!expanded);
    });
    details.addEventListener('toggle', () => {
      if (!expansion && details.open !== expanded) setExpanded(details.open, false);
    });
    card.addEventListener('keydown', event => {
      if (event.key === 'Escape') setExpanded(false);
    });
    reduced.addEventListener('change', () => {
      resetWobble();
      if (reduced.matches && expansion) finishExpansion();
    });

    card.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && finePointer.matches) setExpanded(true);
    });
    card.addEventListener('focusout', event => {
      if (!card.contains(event.relatedTarget) && !card.matches(':hover')) setExpanded(false);
    });
    card.addEventListener('pointerleave', event => {
      resetWobble();
      if (isFaq && event.pointerType === 'touch') return;
      if (!card.contains(document.activeElement) || (isFaq && !summary.matches(':focus-visible'))) setExpanded(false);
    });

    if (isFaq) continue;

    card.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || !finePointer.matches || reduced.matches) return;
      const bounds = card.getBoundingClientRect();
      x = Math.max(-12, Math.min(12, (event.clientX - bounds.left - bounds.width / 2) / 20));
      y = Math.max(-12, Math.min(12, (event.clientY - bounds.top - bounds.height / 2) / 20));
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        card.style.setProperty('--wobble-x', `${x}px`);
        card.style.setProperty('--wobble-y', `${y}px`);
        card.classList.add('is-active');
      });
    });

    card.addEventListener('pointercancel', resetWobble);
    finePointer.addEventListener('change', resetWobble);
    addEventListener('blur', resetWobble);
  }
})();
