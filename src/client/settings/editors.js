function openAllowanceModal() {
      document.getElementById('allowanceModal').classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      document.getElementById('formAllowance').reset();
      document.getElementById('inpAllowanceId').value = '';
      var titleEl = document.getElementById('allowanceModalTitle');
      if (titleEl) titleEl.innerText = 'Tambah Tunjangan';
      var preview = document.getElementById('allowanceAmountPreview');
      if (preview) preview.classList.add('hidden');
      var sel = document.getElementById('inpDutyTeacher');
      if (sel) sel.innerHTML = '<option value="">Memuat daftar guru...</option>';
      var fillSelect = function (users) {
        if (!sel) return;
        let html = '<option value="">Pilih Guru...</option>';
        (users || []).filter(u => String(u.role).toLowerCase() === 'guru').forEach(u => {
          html += '<option value="' + escapeHtml(String(u.id)) + '">' + escapeHtml(u.full_name || '-') + '</option>';
        });
        sel.innerHTML = html;
      };
      if (Array.isArray(_allUsersCache) && _allUsersCache.length > 0) {
        fillSelect(_allUsersCache);
      } else {
        const token = localStorage.getItem('auth_token');
        google.script.run
          .withSuccessHandler((users) => {
            _allUsersCache = users || [];
            fillSelect(users);
          })
          .withFailureHandler((err) => {
            if (sel) sel.innerHTML = '<option value="">Gagal memuat guru</option>';
            showToast('Gagal memuat daftar guru', 'error');
          })
          .getAllUsers(token);
      }
      setTimeout(function () {
        var inp = document.getElementById('inpDutyName');
        if (inp) try { inp.focus(); } catch (_) { }
      }, 200);
    }
    function editAllowanceAction(id, duty, userId, amount) {
      openAllowanceModal();
      setTimeout(() => {
        document.getElementById('inpAllowanceId').value = id;
        document.getElementById('inpDutyName').value = duty;
        var sel = document.getElementById('inpDutyTeacher');
        var trySetUser = function (retry) {
          if (sel && sel.querySelector('option[value="' + userId + '"]')) {
            sel.value = userId;
          } else if (retry > 0) {
            setTimeout(function () { trySetUser(retry - 1); }, 100);
          }
        };
        trySetUser(50);
        document.getElementById('inpDutyAmount').value = amount;
        if (typeof _settingsPreviewAllowance === 'function') _settingsPreviewAllowance();
        var titleEl = document.getElementById('allowanceModalTitle');
        if (titleEl) titleEl.innerText = 'Edit Data Tunjangan';
      }, 200);
    }
    function closeAllowanceModal() {
      document.getElementById('allowanceModal').classList.add('hidden');
      _maybeReleaseBodyLock();
    }
    function _maybeReleaseBodyLock() {
      var openModalIds = [
        'subjectModal', 'allowanceModal', 'userModal', 'journalModal', 'viewJournalModal',
        'examPeriodModal', 'examSessionModal', 'examRoomModal', 'examSupModal', 'examComModal', 'examSubstModal',
        'slipModal', 'examBapModal', 'msDetailModal', 'scheduleModal', 'subModal', 'rekapKelasModal',
        'rekapGuruModal', 'rekapHariModal', 'rekapKelasHariModal', 'blokirJurnalModal', 'blokirAcaraModal'
      ];
      var anyOpen = openModalIds.some(function (id) {
        var el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
      });
      if (!anyOpen) document.body.classList.remove('overflow-hidden');
    }
    function _settingsPreviewAllowance() {
      var inp = document.getElementById('inpDutyAmount');
      var preview = document.getElementById('allowanceAmountPreview');
      if (!inp || !preview) return;
      var v = Number(inp.value);
      if (!inp.value || isNaN(v)) {
        preview.classList.add('hidden');
        return;
      }
      if (v < 0) {
        preview.textContent = '⚠️ Nominal tidak boleh negatif';
        preview.classList.remove('hidden', 'text-emerald-700');
        preview.classList.add('text-rose-600');
        return;
      }
      preview.textContent = '= Rp ' + v.toLocaleString('id-ID') + ' /bulan';
      preview.classList.remove('hidden', 'text-rose-600');
      preview.classList.add('text-emerald-700');
    }
    function _settingsUpdateSubjectCounter() {
      var inp = document.getElementById('inpSubjectName');
      var counter = document.getElementById('subjectCharCounter');
      if (!inp || !counter) return;
      var len = (inp.value || '').length;
      counter.textContent = len + '/50';
      if (len >= 45) counter.classList.add('text-amber-600', 'font-bold');
      else counter.classList.remove('text-amber-600', 'font-bold');
    }
    function submitAllowance() {
      const token = localStorage.getItem('auth_token');
      const dutyName = (document.getElementById('inpDutyName').value || '').trim();
      const userId = document.getElementById('inpDutyTeacher').value;
      const amount = document.getElementById('inpDutyAmount').value;
      if (!dutyName) {
        showToast('Nama tugas/tunjangan wajib diisi.', 'error');
        var dn = document.getElementById('inpDutyName');
        if (dn) try { dn.focus(); } catch (_) { }
        return;
      }
      if (!userId) {
        showToast('Pilih guru penerima terlebih dahulu.', 'error');
        var sel = document.getElementById('inpDutyTeacher');
        if (sel) try { sel.focus(); } catch (_) { }
        return;
      }
      if (amount === '' || isNaN(Number(amount)) || Number(amount) < 0) {
        showToast('Nominal tunjangan harus angka ≥ 0.', 'error');
        var amt = document.getElementById('inpDutyAmount');
        if (amt) try { amt.focus(); } catch (_) { }
        return;
      }
      const data = {
        id: document.getElementById('inpAllowanceId').value,
        duty_name: dutyName,
        user_id: userId,
        amount: amount
      };
      var btn = document.getElementById('btnSubmitAllowance');
      if (btn && btn.dataset.busy === 'true') return;
      var restore = _busyButton(btn, 'Menyimpan...');
      google.script.run.withSuccessHandler((res) => {
        restore();
        if (res && res.status === 'success') {
          showToast('Tunjangan disimpan', 'success');
          closeAllowanceModal();
          initSettings();
        } else {
          showToast((res && res.message) || 'Gagal menyimpan tunjangan.', 'error');
        }
      }).withFailureHandler((err) => {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveAllowance(token, data);
    }
    