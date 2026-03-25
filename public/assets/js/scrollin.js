(() => {
  const addScrollInOnIntersect = (selector, options) => {
    const elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(el => el.classList.add('scrollin'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('scrollin');
          observer.unobserve(entry.target);
        }
      });
    }, options ?? { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

    elements.forEach(el => observer.observe(el));
  };

  document.addEventListener('DOMContentLoaded', () => {
    addScrollInOnIntersect('.fadeup:not(.scrollin)');
    addScrollInOnIntersect('.fade_list li:not(.scrollin)');
    addScrollInOnIntersect('.com_sec_gallery .fade_g:not(.scrollin)', {
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px',
    });
    addScrollInOnIntersect(
      [
        '.page-title.facility-page',
        '.page-title.about-page',
        '.page-title.plan-page',
        '.page-title.carrer-page',
        '.page-title.coach-page',
        '.page-title.schedule-page',
        '.page-title.access-page',
        '.page-title.hyrox-page',
        '.page-title.spartan-page',
        '.page-title.dropin-page',
        '.page-title.trial-page',
      ]
        .map(s => `${s}:not(.scrollin)`)
        .join(', '),
      { threshold: 0.1, rootMargin: '0px 0px -5% 0px' }
    );
  });
})();
