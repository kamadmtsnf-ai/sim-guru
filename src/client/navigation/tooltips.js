(function() {
      function _attachCollapsedTooltips() {
        var sidebar = document.getElementById('sidebar');
        if (!sidebar || sidebar._tipListenersAdded) return;
        sidebar._tipListenersAdded = true;
        sidebar.addEventListener('mouseenter', function(e) {
          if (!sidebar.classList.contains('sidebar-collapsed')) return;
          var item = e.target && e.target.closest ? e.target.closest('.nav-item') : null;
          if (!item) return;
          var rect = item.getBoundingClientRect();
          _showSidebarTooltip(item.getAttribute('data-tooltip'), rect.top + rect.height / 2);
        }, true);
        sidebar.addEventListener('mouseleave', function(e) {
          if (!sidebar.classList.contains('sidebar-collapsed')) return;
          var item = e.target && e.target.closest ? e.target.closest('.nav-item') : null;
          if (item) _hideSidebarTooltip();
        }, true);
        sidebar.addEventListener('mouseleave', function() {
          _hideSidebarTooltip();
        }, false);
      }
      var _tipEl = null;
      function _getSidebarTip() {
        if (!_tipEl) {
          _tipEl = document.createElement('div');
          _tipEl.id = 'sidebarCollapsedTip';
          _tipEl.style.cssText = [
            'position:fixed',
            'left:4.75rem',
            'background:#1E293B',
            'color:#E2E8F0',
            'font-size:0.72rem',
            'font-weight:600',
            'white-space:nowrap',
            'padding:5px 10px',
            'border-radius:7px',
            'pointer-events:none',
            'opacity:0',
            'z-index:9999',
            'box-shadow:0 4px 12px rgba(0,0,0,0.25)',
            'transition:opacity 0.15s ease',
            'transform:translateY(-50%)'
          ].join(';');
          document.body.appendChild(_tipEl);
        }
        return _tipEl;
      }
      function _showSidebarTooltip(text, midY) {
        if (!text) return;
        var tip = _getSidebarTip();
        tip.textContent = text;
        tip.style.top = midY + 'px';
        tip.style.opacity = '1';
      }
      function _hideSidebarTooltip() {
        var tip = _getSidebarTip();
        tip.style.opacity = '0';
      }
      window._hideSidebarTooltip = _hideSidebarTooltip;
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _attachCollapsedTooltips);
      } else {
        _attachCollapsedTooltips();
      }
      var _origInitSidebarState = window.initSidebarState;
      window.initSidebarState = function() {
        if (typeof _origInitSidebarState === 'function') _origInitSidebarState();
        _attachCollapsedTooltips();
      };
    })();
    