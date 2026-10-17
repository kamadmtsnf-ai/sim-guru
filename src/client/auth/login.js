function handleLogin(event) {
      event.preventDefault();
      var modalOpen = !!(document.getElementById('simLoginModal') &&
        document.getElementById('simLoginModal').classList.contains('sim-modal-open'));
      var pfx = modalOpen ? 'm_' : '';
      const btn = document.getElementById(pfx + 'btnLogin');
      const userEl = document.getElementById(pfx + 'username');
      const passEl = document.getElementById(pfx + 'password');
      const userInp = (userEl ? userEl.value : '').trim();
      const passInp = passEl ? passEl.value : '';
      function _markFieldError(el, isErr) {
        if (!el) return;
        var wrap = el.closest && el.closest('.sim-input-wrap');
        if (!wrap) return;
        wrap.classList.toggle('is-error', !!isErr);
      }
      _markFieldError(userEl, false);
      _markFieldError(passEl, false);
      if (!userInp) {
        _showLoginInlineError(pfx, 'Username wajib diisi.');
        _markFieldError(userEl, true);
        try { userEl.focus(); } catch (_) { }
        showToast('Username wajib diisi', 'error');
        return;
      }
      if (!passInp) {
        _showLoginInlineError(pfx, 'Password wajib diisi.');
        _markFieldError(passEl, true);
        try { passEl.focus(); } catch (_) { }
        showToast('Password wajib diisi', 'error');
        return;
      }
      _showLoginInlineError(pfx, '');
      if (!btn) return;
      btn.disabled = true;
      btn.dataset.origHtml = btn.innerHTML;
      btn.innerHTML = '<span class="sim-btn-loader" aria-hidden="true"></span><span class="sim-btn-label">Memverifikasi...</span>';
      function _restoreBtn() {
        if (!btn) return;
        btn.disabled = false;
        if (btn.dataset.origHtml) {
          btn.innerHTML = btn.dataset.origHtml;
          delete btn.dataset.origHtml;
        } else {
          btn.innerHTML = '<span class="sim-btn-label">Masuk Aplikasi</span>';
        }
      }
      function _showLoginError(msg) {
        showToast(msg, 'error');
        _showLoginInlineError(pfx, msg);
        _markFieldError(passEl, true);
        try { passEl.focus(); passEl.select && passEl.select(); } catch (_) { }
      }
      google.script.run
        .withSuccessHandler((res) => {
          if (res && res.status === 'maintenance') {
            _restoreBtn();
            _showLoginInlineError(pfx, '');
            showMaintenanceModal(res);
            return;
          }
          if (res && res.status === 'success') {
            showToast('Login berhasil', 'success');
            try {
              var rememberEl = document.getElementById(pfx + 'chkRemember');
              if (rememberEl && rememberEl.checked) {
                localStorage.setItem('remember_username', userInp);
              } else {
                localStorage.removeItem('remember_username');
              }
            } catch (_) { }
            localStorage.setItem('auth_token', res.token);
            localStorage.setItem('user_name', res.user.name);
            localStorage.setItem('user_role', res.user.role);
            localStorage.setItem('is_default_pass', res.user.is_default_pass);
            localStorage.setItem('has_security_question', res.user.has_security_question ? 'true' : 'false');
            localStorage.setItem('has_email_verified', res.user.has_email_verified ? 'true' : 'false');
            if (res.user.email) localStorage.setItem('user_email', String(res.user.email));
            else localStorage.removeItem('user_email');
            localStorage.setItem('user_username', String(userInp || '').trim());
            if (typeof window._onLoginSuccess === 'function') window._onLoginSuccess();
            if (modalOpen) closeLoginModal();
            try {
              sessionStorage.removeItem('ann_session_shown');
              localStorage.removeItem('ann_seen_ids_v1');
              if (window._annCache) window._annCache = null;
            } catch (_) { }
            if (res.user.is_default_pass) {
              loadPage('Page_Profile');
            } else if (!res.user.has_security_question) {
              localStorage.setItem('force_security_question', 'true');
              showSecurityQuestionOverlay();
              loadPage('Page_Profile');
            } else if (!res.user.has_email_verified) {
              localStorage.setItem('force_email_verify', 'true');
              loadPage('Page_Profile');
            } else {
              loadPage('Page_Dashboard');
            }
          } else {
            _showLoginError((res && res.message) || 'Username atau password salah.');
            _restoreBtn();
          }
        })
        .withFailureHandler((err) => {
          _showLoginError('Gagal terhubung ke server. Periksa koneksi Anda.');
          _restoreBtn();
        })
        .loginUser(userInp, passInp);
    }
    // ─── Maintenance Modal Functions ───────────────────────────────────
    