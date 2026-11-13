(() => {
  const title = document.querySelector('.hero-title');
  if (!title) return;

  const description = document.querySelector('.hero-description');
  const blurMedia = window.matchMedia('(max-width: 767px), (max-width: 1023px) and (orientation: portrait)');
  const blurCanvas = document.createElement('canvas');
  const blurContext = blurCanvas.getContext('2d');
  let blurFrame = 0;
  const refreshTextBlur = () => {
    blurFrame = 0;
    if (!description || !blurMedia.matches || !blurContext) return;
    const span = description.querySelector(description.classList.contains('is-typing')
      ? '.hero-description-typed' : '.hero-description-source');
    const node = span.firstChild;
    if (!node) { description.style.removeProperty('--hero-text-mask'); return; }
    const bounds = description.getBoundingClientRect();
    const style = getComputedStyle(span);
    const padding = 8, ratio = Math.min(devicePixelRatio || 1, 2);
    blurCanvas.width = Math.ceil((bounds.width + padding * 2) * ratio);
    blurCanvas.height = Math.ceil((bounds.height + padding * 2) * ratio);
    blurContext.scale(ratio, ratio);
    blurContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    blurContext.fillStyle = blurContext.strokeStyle = '#fff';
    blurContext.lineWidth = 6;
    blurContext.lineJoin = 'round';
    blurContext.filter = 'blur(1.5px)';
    // Measure the browser's actual wrapped lines so the mask follows the text,
    // including its changing right alignment during the typing effect.
    const range = document.createRange(), lines = [];
    for (const part of new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(node.textContent)) {
      if (/^\s+$/.test(part.segment)) continue;
      range.setStart(node, part.index);
      range.setEnd(node, part.index + part.segment.length);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      let line = lines.at(-1);
      if (!line || Math.abs(line.top - rect.top) > 1) {
        line = { top: rect.top, left: rect.left, start: part.index };
        lines.push(line);
      }
      line.end = part.index + part.segment.length;
    }
    for (const line of lines) {
      const text = node.textContent.slice(line.start, line.end);
      const x = line.left - bounds.left + padding;
      const ascent = blurContext.measureText(text).fontBoundingBoxAscent ?? parseFloat(style.fontSize);
      const y = line.top - bounds.top + padding + ascent;
      blurContext.strokeText(text, x, y);
      blurContext.fillText(text, x, y);
    }
    description.style.setProperty('--hero-text-mask', `url("${blurCanvas.toDataURL()}")`);
  };
  const scheduleTextBlur = () => {
    if (!blurFrame) blurFrame = requestAnimationFrame(refreshTextBlur);
  };
  if (description) new ResizeObserver(scheduleTextBlur).observe(description);
  blurMedia.addEventListener('change', scheduleTextBlur);
  if (description && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const source = description.querySelector('.hero-description-source');
    const typed = description.querySelector('.hero-description-typed');
    const characters = [...new Intl.Segmenter('vi', { granularity: 'grapheme' }).segment(source.textContent)]
      .map(part => part.segment);
    description.classList.add('is-typing');
    const onTitleEnd = event => {
      if (event.animationName !== 'hero-title-split-right') return;
      title.removeEventListener('animationend', onTitleEnd);
      let index = 0;
      const type = () => {
        if (index === characters.length) {
          description.classList.remove('is-typing');
          typed.textContent = '';
          scheduleTextBlur();
          return;
        }
        const character = characters[index++];
        typed.textContent += character;
        scheduleTextBlur();
        setTimeout(type, /[!?.\n]/.test(character) ? 200 : 24);
      };
      type();
    };
    title.addEventListener('animationend', onTitleEnd);
  }

  // The heading width and both slide endpoints must use the final font metrics.
  Promise.all([
    document.fonts.load('700 80px Oswald'),
    document.fonts.load('200 40px Oswald'),
    document.fonts.load('400 16px "Be Vietnam Pro"'),
  ]).catch(() => {}).then(() => {
    const firstName = title.querySelector('.hero-first-name');
    const roles = title.querySelector('.hero-roles');
    const business = title.querySelector('.hero-role--business > span');
    const syncRoleWidth = () => {
      roles.style.width = `${firstName.getBoundingClientRect().width}px`;
      // Align E with the i in Kinh using the loaded font's actual K width.
      const prefix = document.createRange();
      prefix.setStart(business.firstChild, 0);
      prefix.setEnd(business.firstChild, 1);
      roles.style.setProperty('--hero-commerce-offset', `${prefix.getBoundingClientRect().width}px`);
    };
    syncRoleWidth();
    new ResizeObserver(syncRoleWidth).observe(firstName);
    new ResizeObserver(syncRoleWidth).observe(business);
    scheduleTextBlur();
    requestAnimationFrame(() => title.classList.add('is-ready'));
  });
})();
