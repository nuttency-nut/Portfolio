/* ===== 1. Bong bóng chào ===== */
(() => {
  function greeting() {
    const hour = new Date().getHours();
    if (hour < 5 || hour >= 18) return "Chào buổi tối 🌆";
    if (hour < 11) return "Chào buổi sáng ☀️";
    if (hour < 14) return "Chào buổi trưa 🌤️";
    return "Chào buổi chiều 🌞";
  }

  const messages = [greeting(), "Rất vui vì bạn ghé chơi ✨", "Cùng nghe nhạc với mình nhé 🎧", "Có tâm sự thì gửi thư cho mình 💌"];
  const bubble = document.getElementById("bubble");
  const text = document.getElementById("bubble-text");
  let current = 0;
  text.textContent = messages[current];
  setTimeout(() => bubble.classList.add("show"), 1600);
  setInterval(() => {
    bubble.classList.remove("show");
    setTimeout(() => {
      current = (current + 1) % messages.length;
      messages[0] = greeting();
      text.textContent = messages[current];
      bubble.classList.add("show");
    }, 2200);
  }, 8500);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && current === 0) text.textContent = greeting();
  });
})();

/* ===== 3. Website: xoay vòng Website → CMS 1 → CMS 2 ===== */
(() => {
  const wins = [...document.querySelectorAll("#web .win")], tabs = [...document.querySelectorAll("#web .tabs span")];
  let front = 0;
  setInterval(() => {
    front = (front + 1) % wins.length;
    wins.forEach((w, i) => (w.dataset.pos = (i - front + wins.length) % wins.length));
    tabs.forEach((t, i) => t.classList.toggle("on", i === front));
  }, 3200);
})();

/* ===== 5. Mạng xã hội: Facebook ⇄ TikTok mỗi 3.8s ===== */
(() => {
  const s = [...document.querySelectorAll(".slide")], d = [...document.querySelectorAll(".dots span")];
  let i = 0;
  setInterval(() => { s[i].classList.remove("active"); d[i].classList.remove("on"); i = (i + 1) % s.length; s[i].classList.add("active"); d[i].classList.add("on"); }, 3800);
})();

/* ===== 7. Phim: nhân đôi dãy poster để chạy vòng liên tục ===== */
(() => {
  const reel = document.getElementById('reel');
  [...reel.children].forEach(poster => {
    const copy = poster.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    reel.append(copy);
  });
})();

/* ===== 8. Đếm số sách ===== */
document.getElementById("bookCount").textContent = document.querySelectorAll("#shelf .book").length + " cuốn";

/* ===== Kéo thả để sắp xếp lại các ô ===== */
(() => {
  const grid = document.getElementById("bento");
  let drag = null;
  const flip = (fn) => {
    const cards = [...grid.children], before = new Map(cards.map((c) => [c, c.getBoundingClientRect()]));
    fn();
    cards.forEach((c) => {
      const a = before.get(c), b = c.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (dx || dy) c.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 300, easing: "cubic-bezier(.25,1,.5,1)" });
    });
  };
  grid.addEventListener("dragstart", (e) => e.preventDefault());   // tắt kéo link/ảnh mặc định
  grid.addEventListener("pointerdown", (e) => {
    const card = e.target.closest(".bento > .card");
    if (!card || e.button > 0 || e.target.closest("button, .shelf")) return;
    drag = { card, x: e.clientX, y: e.clientY, started: false, id: e.pointerId };
  });
  addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 8) return;
      const r = drag.card.getBoundingClientRect();
      Object.assign(drag, { started: true, dx: drag.x - r.left, dy: drag.y - r.top });
      drag.ghost = drag.card.cloneNode(true);
      drag.ghost.removeAttribute("id");
      drag.ghost.classList.add("drag-ghost");
      Object.assign(drag.ghost.style, { width: r.width + "px", height: r.height + "px" });
      document.body.appendChild(drag.ghost);
      drag.card.classList.add("is-dragging");
    }
    drag.ghost.style.left = e.clientX - drag.dx + "px";
    drag.ghost.style.top = e.clientY - drag.dy + "px";
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".bento > .card");
    if (over === drag.lastOver) return;
    drag.lastOver = over;
    if (over && over !== drag.card) {
      const cards = [...grid.children], from = cards.indexOf(drag.card), to = cards.indexOf(over);
      flip(() => grid.insertBefore(drag.card, from < to ? over.nextSibling : over));
    }
  });
  const end = (e) => {
    if (!drag) return;
    if (drag.started) {
      const card = drag.card;
      drag.ghost.remove(); card.classList.remove("is-dragging");
      // vừa kéo xong thì không mở link
      const stopClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
      card.addEventListener("click", stopClick, { capture: true, once: true });
      setTimeout(() => card.removeEventListener("click", stopClick, { capture: true }), 0);
    }
    drag = null;
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
})();
