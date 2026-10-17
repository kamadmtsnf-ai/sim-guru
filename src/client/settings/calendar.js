function setLiburMode(mode) {
      const single = document.getElementById('libur-single-mode');
      const range = document.getElementById('libur-range-mode');
      const btnSingle = document.getElementById('btnModeSingle');
      const btnRange = document.getElementById('btnModeRange');
      if (!single || !range) return;
      if (mode === 'range') {
        single.classList.add('hidden');
        range.classList.remove('hidden');
        btnSingle.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition';
        btnRange.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white transition';
      } else {
        single.classList.remove('hidden');
        range.classList.add('hidden');
        btnSingle.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white transition';
        btnRange.className = 'flex-1 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 transition';
      }
    }
    function addHolidayAction() {
      const rangeDiv = document.getElementById('libur-range-mode');
      const isRange = rangeDiv && !rangeDiv.classList.contains('hidden');
      const desc = (document.getElementById('inpLiburDesc').value || '').trim();
      const isBonus = document.getElementById('chkIsBonus').checked;
      const token = localStorage.getItem('auth_token');
      if (!desc) {
        showToast('Keterangan wajib diisi', 'error');
        var d = document.getElementById('inpLiburDesc'); if (d) try { d.focus(); } catch (_) { }
        return;
      }
      const btn = document.getElementById('btnAddHoliday');
      if (btn && btn.dataset.busy === 'true') return;
      var restore = _busyButton(btn, 'Menyimpan...');
      if (isRange) {
        const dateFrom = document.getElementById('inpLiburDateFrom').value;
        const dateTo = document.getElementById('inpLiburDateTo').value;
        if (!dateFrom || !dateTo) {
          restore();
          showToast('Tanggal mulai dan selesai wajib diisi', 'error');
          return;
        }
        if (dateTo < dateFrom) {
          restore();
          showToast('Tanggal selesai tidak boleh kurang dari tanggal mulai', 'error');
          return;
        }
        google.script.run.withSuccessHandler((res) => {
          restore();
          if (res && res.status === 'success') {
            showToast(res.message || 'Hari libur ditambahkan', 'success');
            resetLiburForm();
            initSettings();
          } else { showToast((res && res.message) || 'Gagal menambah hari libur', 'error'); }
        }).withFailureHandler((err) => {
          restore();
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        }).addHolidayRange(token, dateFrom, dateTo, desc, isBonus);
      } else {
        const date = document.getElementById('inpLiburDate').value;
        const id = document.getElementById('inpLiburId') ? document.getElementById('inpLiburId').value : null;
        if (!date) {
          restore();
          showToast('Tanggal wajib diisi', 'error');
          return;
        }
        google.script.run.withSuccessHandler((res) => {
          restore();
          if (res && res.status === 'success') {
            showToast('Hari libur ditambahkan', 'success');
            resetLiburForm();
            initSettings();
          } else { showToast((res && res.message) || 'Gagal menambah hari libur', 'error'); }
        }).withFailureHandler((err) => {
          restore();
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        }).addHoliday(token, date, desc, isBonus, id || null);
      }
    }
    