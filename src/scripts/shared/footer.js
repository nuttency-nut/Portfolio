(() => {
  document.querySelectorAll('[data-site-footer]').forEach(footer => {
    footer.innerHTML = `
    <div class="site-footer-inner">
      <div class="site-footer-top">
        <address class="site-footer-contacts">
          <div><span>Email</span><a href="mailto:nqad667723@gmail.com">nqad667723@gmail.com</a></div>
          <div><span>Điện thoại</span><a href="tel:+84866214216">0866.214.216</a></div>
        </address>
        <nav class="site-footer-socials" aria-label="Mạng xã hội">
          <a href="https://www.linkedin.com/in/anh-duy-1b3a44378/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M7 10v7m4-4v4m0-4a3 3 0 1 1 6 0v4m-6-4v-3M7.125 6.75H7m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0"/><path d="M3 12c0-4.243 0-6.364 1.318-7.682S7.758 3 12 3s6.364 0 7.682 1.318S21 7.758 21 12s0 6.364-1.318 7.682S16.242 21 12 21s-6.364 0-7.682-1.318S3 16.242 3 12"/></g></svg>
          </a>
          <a href="https://zalo.me/0866214216" target="_blank" rel="noopener noreferrer" aria-label="Zalo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <path d="M12 3c-5 0-9 3.6-9 8 0 2.1.9 4 2.4 5.4L4 21l4.8-2.4c1 .3 2.1.4 3.2.4 5 0 9-3.6 9-8s-4-8-9-8Z"/>
              <path d="M8.5 8h7l-7 6h7"/>
            </svg>
          </a>
          <a href="https://www.bloomebridal.com/" target="_blank" rel="noopener noreferrer" aria-label="Website">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9"/>
              <ellipse cx="12" cy="12" rx="4" ry="9"/>
              <path d="M3 12h18M5 6.5c4.2 2 9.8 2 14 0M5 17.5c4.2-2 9.8-2 14 0"/>
            </svg>
          </a>
        </nav>
      </div>
      <p class="site-footer-copyright">© 2026 · Bản quyền thuộc về <a href="https://zalo.me/0866214216" target="_blank" rel="noopener noreferrer">NUT</a>.</p>
    </div>
    `;
  });
})();
