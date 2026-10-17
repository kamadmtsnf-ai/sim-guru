var cachedUpcomingCeremonies = [];
    function _busyButton(btn, busyText) {
      if (!btn || btn.dataset.busy === 'true') {
        return function noop() { };
      }
      var originalHTML = btn.innerHTML;
      var originalDisabled = btn.disabled;
      var originalMinWidth = btn.style.minWidth;
      var originalMaxWidth = btn.style.maxWidth;
      var originalOpacity = btn.style.opacity;
      var originalWhiteSpace = btn.style.whiteSpace;
      var rect = btn.getBoundingClientRect();
      btn.dataset.busy = 'true';
      btn.disabled = true;
      btn.style.minWidth = rect.width + 'px';
      btn.style.whiteSpace = 'nowrap';
      btn.style.opacity = '0.85';
      btn.setAttribute('aria-busy', 'true');
      var label = busyText || 'Memproses...';
      btn.innerHTML =
        '<span class="inline-flex items-center justify-center gap-1.5" style="max-width:100%;min-width:0;">' +
        '<span class="inline-block flex-shrink-0 w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" style="vertical-align:-2px;"></span>' +
        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">' + label + '</span>' +
        '</span>';
      return function restore() {
        if (!btn.dataset.busy) return;
        btn.dataset.busy = '';
        btn.disabled = !!originalDisabled;
        btn.style.minWidth = originalMinWidth;
        btn.style.maxWidth = originalMaxWidth;
        btn.style.opacity = originalOpacity;
        btn.style.whiteSpace = originalWhiteSpace;
        btn.removeAttribute('aria-busy');
        btn.innerHTML = originalHTML;
      };
    }
    function _setRowLoading(triggerEl) {
      if (!triggerEl || !triggerEl.closest) return function noop() { };
      var row = triggerEl.closest('tr') || triggerEl.closest('[data-row]');
      if (!row) return function noop() { };
      if (row.dataset.busy === 'true') return function noop() { };
      var prevPointerEvents = row.style.pointerEvents;
      var prevOpacity = row.style.opacity;
      var prevTransition = row.style.transition;
      row.dataset.busy = 'true';
      row.style.pointerEvents = 'none';
      row.style.opacity = '0.55';
      row.style.transition = 'opacity 0.15s ease';
      return function restore() {
        if (!row.dataset.busy) return;
        row.dataset.busy = '';
        row.style.pointerEvents = prevPointerEvents;
        row.style.opacity = prevOpacity;
        row.style.transition = prevTransition;
      };
    }
    function _setBlockLoading(triggerEl, containerSelector) {
      if (!triggerEl) return function noop() { };
      var container = containerSelector ? triggerEl.closest(containerSelector) : null;
      if (!container) container = triggerEl.parentElement;
      if (!container || container.dataset.busy === 'true') return function noop() { };
      var prevOpacity = container.style.opacity;
      var prevPointer = container.style.pointerEvents;
      var prevTransition = container.style.transition;
      container.dataset.busy = 'true';
      container.style.opacity = '0.65';
      container.style.pointerEvents = 'none';
      container.style.transition = 'opacity 0.15s ease';
      return function restore() {
        if (!container.dataset.busy) return;
        container.dataset.busy = '';
        container.style.opacity = prevOpacity;
        container.style.pointerEvents = prevPointer;
        container.style.transition = prevTransition;
      };
    }
    