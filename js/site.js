(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const progress = document.querySelector('.progress');
  const nav = document.querySelector('.nav');

  const updateScroll = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
    progress.style.width = `${Math.min(100, Math.max(0, ratio * 100))}%`;
    nav.classList.toggle('scrolled', window.scrollY > 24);
  };
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  const revealElements = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    revealElements.forEach((element) => revealObserver.observe(element));
  }

  const stats = document.querySelector('.community-stats');
  let counted = false;
  const countUp = () => {
    if (counted) return;
    counted = true;
    document.querySelectorAll('.counter').forEach((counter) => {
      const target = Number(counter.dataset.target);
      if (reducedMotion) {
        counter.textContent = target.toLocaleString('en-US');
        return;
      }
      const started = performance.now();
      const duration = 1100;
      const tick = (now) => {
        const progressValue = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - progressValue, 3);
        counter.textContent = Math.round(target * eased).toLocaleString('en-US');
        if (progressValue < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  if (stats && 'IntersectionObserver' in window) {
    const countObserver = new IntersectionObserver((entries, observer) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        countUp();
        observer.disconnect();
      }
    }, { threshold: 0.3 });
    countObserver.observe(stats);
  } else {
    countUp();
  }

  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const toggle = document.querySelector('.nav-toggle');
  const flyout = document.querySelector('.nav-flyout');
  const flyoutBtn = document.querySelector('.nav-flyout-btn');
  const closeNav = () => {
    nav.classList.remove('is-open');
    flyout.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    flyoutBtn.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) flyout.classList.remove('is-open');
  });
  flyoutBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = flyout.classList.toggle('is-open');
    flyoutBtn.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('.nav-links a').forEach((link) => {
    link.addEventListener('click', closeNav);
  });
  document.addEventListener('click', (event) => {
    if (!nav.contains(event.target)) closeNav();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });
})();
