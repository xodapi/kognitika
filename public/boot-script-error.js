(function () {
  window.__KOGNITIKA_PENDING_SCRIPT_ERROR__ = '';
  window.addEventListener('error', function (event) {
    const target = event.target;
    if (!target || target === window || target.tagName !== 'SCRIPT') return;

    const source = target.getAttribute('src') || target.src || '';
    const isMainBundle = source.indexOf('/assets/') !== -1 || source.indexOf('/src/main.tsx') !== -1;
    if (!isMainBundle) return;

    window.__KOGNITIKA_PENDING_SCRIPT_ERROR__ = 'Основной скрипт приложения не загрузился.';
    if (typeof window.handleScriptError === 'function') {
      window.handleScriptError();
    }
  }, true);
}());
