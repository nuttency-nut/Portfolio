(() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'contact-dialog';
  dialog.className = 'contact-section contact-dialog';
  dialog.setAttribute('aria-labelledby', 'contact-dialog-title');
  dialog.innerHTML = `
    <h2 class="contact-title" id="contact-dialog-title" tabindex="-1" autofocus>Let's Work <span>Together</span></h2>
    <form class="contact-form" aria-describedby="contact-dialog-status">
      <div class="contact-field">
        <label for="contact-dialog-name">Name</label>
        <input id="contact-dialog-name" name="name" type="text" placeholder="Your Name" autocomplete="name" required />
      </div>
      <div class="contact-field">
        <label for="contact-dialog-email">Email</label>
        <input id="contact-dialog-email" name="email" type="email" placeholder="Your@email.com" autocomplete="email" required />
      </div>
      <div class="contact-field contact-field--full">
        <label for="contact-dialog-service">How can i help you?</label>
        <select id="contact-dialog-service" name="service">
          <option value="">Lựa chọn</option>
          <option>Leader thực hiện dự án</option>
          <option>Leader vận hành thương mại điện tử</option>
          <option>Nhân viên xây dựng quy trình hệ thống</option>
          <option>Nhân viên phân tích dữ liệu</option>
        </select>
      </div>
      <div class="contact-field contact-field--full">
        <label for="contact-dialog-message">Message</label>
        <textarea id="contact-dialog-message" name="message" placeholder="Write for me"></textarea>
      </div>
      <button class="contact-submit" type="submit" disabled>Submit</button>
      <p class="contact-status" id="contact-dialog-status" role="status"></p>
    </form>`;
  document.body.append(dialog);

  let returnFocus;
  let closing = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function closeDialog() {
    if (!dialog.open || closing) return;
    closing = true;
    const finish = () => dialog.close();
    if (reducedMotion.matches) {
      finish();
      return;
    }
    dialog.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(12px)' }
    ], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished.then(finish, finish);
  }

  document.getElementById('topbar').addEventListener('click', event => {
    const link = event.target.closest('a[data-contact-dialog]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (dialog.open) return;
    returnFocus = link.closest('#mobileMenu') ? document.getElementById('menuBtn') : link;
    dialog.showModal();
    document.documentElement.classList.add('contact-dialog-open');
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog();
  });
  dialog.addEventListener('close', () => {
    closing = false;
    dialog.getAnimations().forEach(animation => animation.cancel());
    document.documentElement.classList.remove('contact-dialog-open');
    returnFocus?.focus({ preventScroll: true });
  });

  document.querySelectorAll('.contact-form').forEach(form => {
    const status = form.querySelector('.contact-status');
    form.addEventListener('submit', event => {
      event.preventDefault();
      status.textContent = 'Thông tin chưa được gửi. Form hiện đang ở chế độ xem trước.';
    });
    // Enable only after interception is ready; the preview must not post form data.
    form.querySelector('.contact-submit').disabled = false;
  });

  const photo = document.querySelector('.contact-photo-explore');
  if (!photo) return;
  const labels = ['170cm', '2001', 'Xữ nữ', 'GenZ', 'Coffee ☕', 'Trade', 'Vide Code', 'Automation', 'Ecom', 'Operation', 'BA', 'DA', 'Coach', 'Tpop'];
  // Shuffle once per page load; keep each hover point stable while exploring.
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  const zones = photo.querySelector('.contact-photo-zones');
  const points = labels.map((label, index) => {
    const cell = index < 7 ? index : index + 1; // Leave the central cell clear.
    const x = .17 + (cell % 3) * .33 + (Math.random() - .5) * .06;
    const y = .12 + Math.floor(cell / 3) * .19 + (Math.random() - .5) * .04;
    const point = document.createElement('span');
    point.className = 'contact-photo-point';
    point.style.setProperty('--point-x', `${x * 100}%`);
    point.style.setProperty('--point-y', `${y * 100}%`);
    point.style.setProperty('--tag-angle', `${(Math.random() - .5) * 6}deg`);
    const tag = document.createElement('span');
    tag.className = 'contact-photo-tag';
    tag.textContent = label;
    point.append(tag);
    zones.append(point);
    return { point, tag, x, y, label };
  });
  let active = -1;
  let pointerType = 'mouse';
  const show = index => {
    if (index === active) return;
    if (active >= 0) points[active].point.classList.remove('is-active');
    active = index;
    if (active >= 0) points[active].point.classList.add('is-active');
    photo.setAttribute('aria-label', active < 0 ? 'Khám phá thông tin về Duy. Chạm hoặc nhấn Enter để xem lần lượt.' : `${points[active].label}. Chạm hoặc nhấn Enter để xem thông tin tiếp theo.`);
  };
  const layoutTags = () => {
    const { width, height } = photo.getBoundingClientRect();
    for (const { point, tag, x, y } of points) {
      const left = Math.max(10, Math.min(width - tag.offsetWidth - 10, x * width - tag.offsetWidth / 2));
      const above = y * height - tag.offsetHeight - 14;
      const top = Math.max(10, Math.min(height - tag.offsetHeight - 10, above < 10 ? y * height + 14 : above));
      point.style.setProperty('--tag-left', `${left - x * width}px`);
      point.style.setProperty('--tag-top', `${top - y * height}px`);
    }
  };
  photo.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = photo.getBoundingClientRect();
    const distances = points.map(({ x, y }) => Math.hypot(event.clientX - bounds.left - x * bounds.width, event.clientY - bounds.top - y * bounds.height));
    show(distances.indexOf(Math.min(...distances)));
  });
  photo.addEventListener('pointerdown', event => { pointerType = event.pointerType; });
  photo.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse' && !photo.matches(':focus-visible')) show(-1); });
  photo.addEventListener('click', event => { if (pointerType !== 'mouse' || event.detail === 0 || active < 0) show((active + 1) % points.length); });
  photo.addEventListener('focus', () => { if (photo.matches(':focus-visible')) show(0); });
  photo.addEventListener('blur', () => { if (!photo.matches(':hover')) show(-1); });
  photo.addEventListener('keydown', event => {
    if (event.key === 'Escape') show(-1);
    else if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(event.key)) {
      event.preventDefault();
      show((active + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + points.length) % points.length);
    }
  });
  document.addEventListener('pointerdown', event => { if (!photo.contains(event.target)) show(-1); });
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) show(-1); }).observe(photo);
  photo.hidden = false;
  new ResizeObserver(layoutTags).observe(photo);
  document.fonts.ready.then(layoutTags);
  layoutTags();
})();
