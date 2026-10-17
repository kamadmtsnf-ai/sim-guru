function showMaintenanceModal(res) {
      var modal = document.getElementById('maintenanceModal');
      if (!modal) return;
      // Timestamp
      var ts = document.getElementById('mtnTimestamp');
      if (ts) {
        var now = new Date();
        var days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
        ts.textContent = days[now.getDay()] + ', ' +
          String(now.getDate()).padStart(2,'0') + '/' +
          String(now.getMonth()+1).padStart(2,'0') + '/' + now.getFullYear() + ' ' +
          String(now.getHours()).padStart(2,'0') + ':' +
          String(now.getMinutes()).padStart(2,'0');
      }
      // Custom message
      var msgBox  = document.getElementById('mtnMessageBox');
      var msgEl   = document.getElementById('mtnCustomMsg');
      var tipBox  = document.getElementById('mtnDefaultTips');
      var customMsg = (res && res.message && String(res.message).trim()) ? String(res.message).trim() : '';
      if (customMsg && msgBox && msgEl) {
        msgEl.textContent = customMsg;
        msgBox.style.display = 'block';
        if (tipBox) tipBox.style.display = 'none';
      } else {
        if (msgBox) msgBox.style.display = 'none';
        if (tipBox) tipBox.style.display = 'block';
      }
      // FIX Bug 3: Reset progress bar — must reset width AND remove animation
      // so the CSS-class animation restarts correctly on every open.
      var bar = modal.querySelector('.mtn-progress-bar');
      if (bar) {
        bar.style.animation = 'none';
        bar.style.width = '5%';
        bar.offsetHeight; // force reflow to restart animation
        bar.style.animation = '';
        bar.style.width = '';
      }
      modal.classList.add('mtn-open');
      document.body.style.overflow = 'hidden';
    }
    function closeMaintenanceModal() {
      var modal = document.getElementById('maintenanceModal');
      if (!modal) return;
      modal.classList.remove('mtn-open');
      // FIX Bug 6: Only clear overflow if no other modal is currently holding it
      // (e.g., simLoginModal may still be open underneath)
      var loginModal = document.getElementById('simLoginModal');
      var loginModalOpen = loginModal && loginModal.classList.contains('sim-modal-open');
      if (!loginModalOpen) {
        document.body.style.overflow = '';
      }
    }
    function updateMaintenanceCardStyle() {
      var manualChk = document.getElementById('cfgMaintenanceEnabled');
      var schedChk = document.getElementById('cfgMaintenanceScheduledEnabled');
      var card = document.getElementById('maintenanceConfigCard');
      var badge = document.getElementById('maintenanceStatusBadge');
      
      var isManualOn = manualChk && manualChk.checked;
      var isSchedOn = schedChk && schedChk.checked;
      var isAnyOn = isManualOn || isSchedOn;

      if (card) {
        card.style.borderColor = isAnyOn ? '#EF4444' : '#FECACA';
        card.style.background  = isAnyOn ? 'rgba(254,226,226,0.5)' : 'rgba(254,242,242,0.38)';
      }
      
      if (badge) {
        if (isManualOn) {
          badge.textContent = '⚠ Mode Manual AKTIF';
          badge.style.cssText = 'background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;';
          badge.classList.remove('hidden');
        } else if (isSchedOn) {
          badge.textContent = '⏳ Penjadwalan AKTIF';
          badge.style.cssText = 'background:#FFF7ED;color:#C2410C;border:1.5px solid #FFEDD5;';
          badge.classList.remove('hidden');
        } else {
          badge.classList.add('hidden');
        }
      }
    }
    function toggleMaintenanceMsgField() {
      var chk = document.getElementById('cfgMaintenanceEnabled');
      var sec = document.getElementById('maintenanceMsgSection');
      var isOn = chk && chk.checked;
      if (sec) sec.classList.toggle('hidden', !isOn);
      
      if (typeof updateMaintenanceCardStyle === 'function') updateMaintenanceCardStyle();
    }
    function toggleScheduledMsgField() {
      var chk = document.getElementById('cfgMaintenanceScheduledEnabled');
      var sec = document.getElementById('scheduledMaintenanceSection');
      if (sec) sec.classList.toggle('hidden', !(chk && chk.checked));
      
      if (typeof updateMaintenanceCardStyle === 'function') updateMaintenanceCardStyle();
    }
    function saveMaintenanceModeUI() {
      var token = localStorage.getItem('auth_token');
      var chk   = document.getElementById('cfgMaintenanceEnabled');
      var msgEl = document.getElementById('cfgMaintenanceMessage');
      var isOn  = chk && chk.checked;
      var msg   = (msgEl ? msgEl.value : '').trim();
      var schedChk = document.getElementById('cfgMaintenanceScheduledEnabled');
      var startEl = document.getElementById('cfgMaintenanceStart');
      var endEl = document.getElementById('cfgMaintenanceEnd');
      var isSchedOn = schedChk && schedChk.checked;
      var schedStart = startEl ? startEl.value : '';
      var schedEnd = endEl ? endEl.value : '';
      // FIX Bug 5: Validate message only when turning ON (not when OFF)
      if (isOn && !msg) {
        showToast('Mohon isi pesan maintenance yang akan ditampilkan ke pengguna.', 'warning');
        if (msgEl) try { msgEl.focus(); } catch (_) { }
        return;
      }
      if (isSchedOn) {
        if (!schedStart || !schedEnd) {
          showToast('Mohon lengkapi Waktu Mulai dan Waktu Selesai untuk jadwal maintenance.', 'warning');
          return;
        }
        if (new Date(schedStart) >= new Date(schedEnd)) {
          showToast('Waktu Mulai harus lebih awal dari Waktu Selesai.', 'warning');
          return;
        }
      }
      var btn = document.getElementById('btnSaveMaintenanceConfig');
      var restore = (typeof _busyButton === 'function') ? _busyButton(btn, 'Menyimpan...') :
        (function() {
          if (btn) { btn.disabled = true; btn.dataset._oh = btn.innerHTML; btn.innerHTML = 'Menyimpan...'; }
          return function() { if (btn) { btn.disabled = false; if (btn.dataset._oh) { btn.innerHTML = btn.dataset._oh; delete btn.dataset._oh; } } };
        }());
      // FIX Bug 5: Always send the current textarea value so the message is
      // preserved even when turning maintenance OFF — admin won't lose their
      // custom message if they toggle it back on later.
      var payload = {
        maintenance_mode: isOn ? 'true' : 'false',
        maintenance_message: msg,
        maintenance_scheduled: isSchedOn ? 'true' : 'false',
        maintenance_start: schedStart,
        maintenance_end: schedEnd
      };
      google.script.run.withSuccessHandler(function(res) {
        restore();
        if (res && res.status === 'success') {
          showToast('✅ Pengaturan maintenance berhasil disimpan.', 'success');
          if (typeof globalConfig !== 'undefined') {
            globalConfig.maintenance_mode = payload.maintenance_mode;
            globalConfig.maintenance_message = payload.maintenance_message;
            globalConfig.maintenance_scheduled = payload.maintenance_scheduled;
            globalConfig.maintenance_start = payload.maintenance_start;
            globalConfig.maintenance_end = payload.maintenance_end;
          }
          // FIX Bug 4: Do NOT call toggleMaintenanceMsgField() here — the UI
          // state is already correct; calling it again causes a flicker.
        } else {
          showToast((res && res.message) || 'Gagal menyimpan pengaturan maintenance.', 'error');
        }
      }).withFailureHandler(function(err) {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveSystemConfig(token, payload);
    }
    // ─── End Maintenance Modal Functions ──────────────────────────────
    