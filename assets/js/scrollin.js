(function () {
  function addScrollInOnIntersect(selector, options) {
    var elements = document.querySelectorAll(selector);
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('scrollin'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('scrollin');
          observer.unobserve(entry.target);
        }
      });
    }, options || { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    addScrollInOnIntersect('.fadeup:not(.scrollin)');
    addScrollInOnIntersect('.fade_list li:not(.scrollin)');
    addScrollInOnIntersect('.com_sec_gallery .fade_g:not(.scrollin)', {
      threshold: 0.2,
      rootMargin: '0px 0px -10% 0px'
    });
    addScrollInOnIntersect('.page-title.facility-page:not(.scrollin), .page-title.about-page:not(.scrollin), .page-title.plan-page:not(.scrollin), .page-title.carrer-page:not(.scrollin), .page-title.coach-page:not(.scrollin), .page-title.schedule-page:not(.scrollin), .page-title.dropin-page:not(.scrollin), .page-title.trial-page:not(.scrollin)', {
      threshold: 0.1,
      rootMargin: '0px 0px -5% 0px'
    });
  });
})();
