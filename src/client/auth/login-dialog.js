function _showLoginInlineError(pfx, msg) {
      var el = document.getElementById((pfx || '') + 'loginErrorBanner');
      if (!el) return;
      if (!msg) {
        el.classList.add('hidden');
        el.innerHTML = '';
        return;
      }
      el.innerHTML =
        '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">' +
        '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>' +
        '<span>' + escapeHtml(msg) + '</span>';
      el.classList.remove('hidden');
    }
    function openLoginModal() {
      var modal = document.getElementById('simLoginModal');
      if (!modal) return;
      var sheet = document.getElementById('simLoginModalSheet');
      if (sheet) sheet.classList.remove('sim-sheet-closing');
      modal.classList.add('sim-modal-open');
      document.body.style.overflow = 'hidden';
      try {
        _showLoginInlineError('m_', '');
        var deskUser = document.getElementById('username');
        var modUser = document.getElementById('m_username');
        if (deskUser && modUser && deskUser.value && !modUser.value) {
          modUser.value = deskUser.value;
        }
      } catch (_) { }
      var tc = document.getElementById('toast-container');
      if (!tc) {
        tc = document.createElement('div');
        tc.id = 'toast-container';
        tc.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(tc);
      } else {
        tc.style.zIndex = '99999';
      }
      setTimeout(function () {
        var inp = document.getElementById('m_username');
        if (inp && !inp.value) inp.focus();
        else {
          var pwd = document.getElementById('m_password');
          if (pwd) pwd.focus();
        }
      }, 380);
    }
    function closeLoginModal() {
      var modal = document.getElementById('simLoginModal');
      var sheet = document.getElementById('simLoginModalSheet');
      if (!modal || !sheet) return;
      sheet.classList.add('sim-sheet-closing');
      setTimeout(function () {
        modal.classList.remove('sim-modal-open');
        sheet.classList.remove('sim-sheet-closing');
        sheet.style.transform = '';
        document.body.style.overflow = '';
      }, 280);
    }
    function initLoginPage() {
      function _bindCapsHint(passId, hintId) {
        var inp = document.getElementById(passId);
        var hint = document.getElementById(hintId);
        if (!inp || !hint) return;
        if (inp.dataset.capsBound === 'true') return;
        inp.dataset.capsBound = 'true';
        function updateFromEvent(e) {
          var on = false;
          try {
            if (e && typeof e.getModifierState === 'function') {
              on = e.getModifierState('CapsLock');
            }
          } catch (_) { }
          hint.classList.toggle('hidden', !on);
        }
        inp.addEventListener('keydown', updateFromEvent);
        inp.addEventListener('keyup', updateFromEvent);
        inp.addEventListener('blur', function () { hint.classList.add('hidden'); });
        hint.classList.add('hidden');
      }
      _bindCapsHint('password', 'capsHintDesktop');
      _bindCapsHint('m_password', 'capsHintMobile');
      function _bindLiveValidate(prefix) {
        var u = document.getElementById(prefix + 'username');
        var p = document.getElementById(prefix + 'password');
        var btn = document.getElementById(prefix + 'btnLogin');
        if (!u || !p || !btn) return;
        if (u.dataset.liveBound === 'true') return;
        u.dataset.liveBound = 'true';
        p.dataset.liveBound = 'true';
        function updateBtnState() {
          var has = u.value.trim().length > 0 && p.value.length > 0;
          btn.classList.toggle('is-ready', has);
        }
        function clearError(field) {
          try {
            var wrap = field.closest && field.closest('.sim-input-wrap');
            if (wrap) wrap.classList.remove('is-error');
          } catch (_) { }
          var banner = document.getElementById(prefix + 'loginErrorBanner');
          if (banner && !banner.classList.contains('hidden')) {
            banner.classList.add('hidden');
            banner.innerHTML = '';
          }
        }
        u.addEventListener('input', function () { clearError(u); updateBtnState(); });
        p.addEventListener('input', function () { clearError(p); updateBtnState(); });
        updateBtnState();
      }
      _bindLiveValidate('');
      _bindLiveValidate('m_');
      function _bindEyeIcon(passId) {
        var p = document.getElementById(passId);
        if (!p) return;
        var btn = p.parentElement && p.parentElement.querySelector('.sim-eye-btn');
        if (!btn) return;
        if (btn.dataset.eyeBound === 'true') return;
        btn.dataset.eyeBound = 'true';
        btn.dataset.passId = passId;
      }
      _bindEyeIcon('password');
      _bindEyeIcon('m_password');
      try {
        var fy = new Date().getFullYear();
        var ys = document.querySelectorAll('.sim-footer-year');
        for (var i = 0; i < ys.length; i++) ys[i].textContent = String(fy);
      } catch (_) { }
      try {
        if (window.globalConfig) {
          var ver = String(window.globalConfig.app_version || '').trim();
          if (ver) {
            var subEl = document.querySelector('.sim-logo-text-sub');
            if (subEl) subEl.textContent = 'v ' + ver;
          }
        }
      } catch (_) { }
      try {
        var remembered = localStorage.getItem('remember_username') || '';
        if (remembered) {
          var u = document.getElementById('username');
          var mu = document.getElementById('m_username');
          var c = document.getElementById('chkRemember');
          var mc = document.getElementById('m_chkRemember');
          if (u && !u.value) u.value = remembered;
          if (mu && !mu.value) mu.value = remembered;
          if (c) c.checked = true;
          if (mc) mc.checked = true;
          try {
            var displayName = (localStorage.getItem('user_name') || '').trim() || remembered;
            var wb = document.getElementById('simWelcomeBack');
            var wbName = document.getElementById('simWelcomeBackName');
            if (wb && wbName) {
              wbName.textContent = displayName;
              wb.classList.remove('hidden');
            }
            var mwb = document.getElementById('m_simWelcomeBack');
            var mwbName = document.getElementById('m_simWelcomeBackName');
            if (mwb && mwbName) {
              mwbName.textContent = displayName;
              mwb.classList.remove('hidden');
            }
          } catch (_) { }
          var pwd = document.getElementById('password');
          if (pwd && window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) {
            setTimeout(function () { try { pwd.focus(); } catch (_) { } }, 240);
          }
        } else {
          if (window.matchMedia && window.matchMedia('(min-width: 1024px)').matches) {
            var unField = document.getElementById('username');
            if (unField) setTimeout(function () { try { unField.focus(); } catch (_) { } }, 240);
          }
        }
      } catch (_) { }
      var sheet = document.getElementById('simLoginModalSheet');
      if (!sheet) return;
      var dragArea = sheet.querySelector('.sim-sheet-handle-bar');
      var headerArea = sheet.querySelector('.sim-sheet-header');
      var dragTargets = [dragArea, headerArea].filter(Boolean);
      var startY = 0, currentY = 0, isDragging = false;
      function onTouchStart(e) {
        if (e.target && e.target.closest && e.target.closest('.sim-sheet-close')) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        sheet.style.transition = 'none';
      }
      function onTouchMove(e) {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        var diff = currentY - startY;
        if (diff > 0) {
          sheet.style.transform = 'translateY(' + diff + 'px)';
          var bd = document.getElementById('simModalBackdrop');
          if (bd) bd.style.opacity = Math.max(0.3, 1 - (diff / 400));
        }
      }
      function onTouchEnd() {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = '';
        var bd = document.getElementById('simModalBackdrop');
        if (bd) bd.style.opacity = '';
        var diff = currentY - startY;
        if (diff > 100) {
          sheet.style.transform = '';
          closeLoginModal();
        } else {
          sheet.style.transform = '';
        }
      }
      dragTargets.forEach(function (t) {
        if (!t) return;
        t.addEventListener('touchstart', onTouchStart, { passive: true });
        t.addEventListener('touchmove', onTouchMove, { passive: true });
        t.addEventListener('touchend', onTouchEnd);
        t.addEventListener('touchcancel', onTouchEnd);
      });
      if (!window.__simLoginEscBound) {
        window.__simLoginEscBound = true;
        document.addEventListener('keydown', function (e) {
          if (e.key !== 'Escape' && e.keyCode !== 27) return;
          var dv = document.getElementById('docVerifyModal');
          if (dv) { dv.remove(); return; }
          var m = document.getElementById('simLoginModal');
          if (m && m.classList.contains('sim-modal-open')) closeLoginModal();
        });
      }
    }
    