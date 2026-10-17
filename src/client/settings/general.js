function initSettings() {
      const token = localStorage.getItem('auth_token');
      const tbodyHolidays = document.getElementById('tbodyHolidays');
      const tbodySubjects = document.getElementById('tbodySubjects');
      const tbodyAllowances = document.getElementById('tbodyAllowances');
      if (tbodyHolidays) tbodyHolidays.innerHTML = skeletonTableRows(4, 3);
      if (tbodySubjects) tbodySubjects.innerHTML = skeletonTableRows(2, 3);
      if (tbodyAllowances) tbodyAllowances.innerHTML = skeletonTableRows(4, 3);
      google.script.run.withSuccessHandler((data) => {
        if (!data) {
          showToast('Data konfigurasi kosong.', 'error');
          return;
        }
        if (data.status === 'success') {
          globalConfig = data.config;
          if (document.getElementById('cfgKepsek')) document.getElementById('cfgKepsek').value = data.config.kepala_sekolah || '';
          if (document.getElementById('cfgSalary')) document.getElementById('cfgSalary').value = data.config.base_salary || '';
          if (document.getElementById('cfgLevel')) document.getElementById('cfgLevel').value = data.config.tingkatan || 'SD';
          if (typeof _syncParallelMaxOptions === 'function') _syncParallelMaxOptions();
          if (document.getElementById('cfgTahunPelajaran')) document.getElementById('cfgTahunPelajaran').value = data.config.tahun_pelajaran || '';
          if (document.getElementById('cfgSemester')) document.getElementById('cfgSemester').value = data.config.semester || 'Ganjil';
          if (document.getElementById('cfgWaktuPerJTM')) document.getElementById('cfgWaktuPerJTM').value = data.config.waktu_per_jtm || '40';
          if (document.getElementById('cfgAppVersion')) document.getElementById('cfgAppVersion').value = data.config.app_version || '2.1.1';
          if (document.getElementById('chkUseParallel')) document.getElementById('chkUseParallel').checked = (data.config.use_parallel === 'true');
          if (document.getElementById('selParallelMax')) document.getElementById('selParallelMax').value = data.config.parallel_max || 'A';
          if (document.getElementById('chkAllowH1Journal')) document.getElementById('chkAllowH1Journal').checked = (String(data.config.allow_h_minus_1_journal || '').toLowerCase() === 'true');
          if (document.getElementById('cfgTarifPerKm')) document.getElementById('cfgTarifPerKm').value = data.config.tarif_per_km || '';
          if (document.getElementById('cfgTransportEnabled')) document.getElementById('cfgTransportEnabled').checked = (String(data.config.transport_allowance_enabled).toLowerCase() === 'true');
          // Maintenance Mode fields
          var mtnChk = document.getElementById('cfgMaintenanceEnabled');
          var mtnMsg = document.getElementById('cfgMaintenanceMessage');
          // FIX Bug 7: Use null-safe check — if key absent, data.config.maintenance_mode is
          // undefined; String(undefined) === 'undefined' which would never equal 'true', but
          // explicit null-coalescing makes intent clear and prevents future surprises.
          if (mtnChk) mtnChk.checked = (String(data.config.maintenance_mode || '').toLowerCase() === 'true');
          if (mtnMsg) mtnMsg.value = data.config.maintenance_message || '';
          if (typeof toggleMaintenanceMsgField === 'function') toggleMaintenanceMsgField();
          
          var schedChk = document.getElementById('cfgMaintenanceScheduledEnabled');
          var startEl = document.getElementById('cfgMaintenanceStart');
          var endEl = document.getElementById('cfgMaintenanceEnd');
          if (schedChk) schedChk.checked = (String(data.config.maintenance_scheduled || '').toLowerCase() === 'true');
          if (startEl) startEl.value = data.config.maintenance_start || '';
          if (endEl) endEl.value = data.config.maintenance_end || '';
          if (typeof toggleScheduledMsgField === 'function') toggleScheduledMsgField();
          renderClassInputs();
          renderHolidaysList(data.holidays);
          renderSubjectsList(data.subjects);
          renderAllowancesList(data.allowances);
        } else {
          showToast(data.message, 'error');
          if (tbodyHolidays) tbodyHolidays.innerHTML = errorTableRows(4, 'Gagal memuat data.', 'initSettings()');
          if (tbodySubjects) tbodySubjects.innerHTML = errorTableRows(2, 'Gagal memuat data.', 'initSettings()');
          if (tbodyAllowances) tbodyAllowances.innerHTML = errorTableRows(4, 'Gagal memuat data.', 'initSettings()');
        }
      }).withFailureHandler((err) => {
        showToast('Gagal terhubung ke server.', 'error');
        if (tbodyHolidays) tbodyHolidays.innerHTML = errorTableRows(4, 'Koneksi gagal.', 'initSettings()');
        if (tbodySubjects) tbodySubjects.innerHTML = errorTableRows(2, 'Koneksi gagal.', 'initSettings()');
        if (tbodyAllowances) tbodyAllowances.innerHTML = errorTableRows(4, 'Koneksi gagal.', 'initSettings()');
      }).getSettingsMasterData(token);
    }
    function saveSystemConfig() {
      const token = localStorage.getItem('auth_token');
      const kepsekEl = document.getElementById('cfgKepsek');
      const salaryEl = document.getElementById('cfgSalary');
      const levelEl = document.getElementById('cfgLevel');
      const useParallelEl = document.getElementById('chkUseParallel');
      const parallelMaxEl = document.getElementById('selParallelMax');
      const tahunPelajaranEl = document.getElementById('cfgTahunPelajaran');
      const semesterEl = document.getElementById('cfgSemester');
      const waktuPerJTMEl = document.getElementById('cfgWaktuPerJTM');
      const appVersionEl = document.getElementById('cfgAppVersion');
      const kepsek = (kepsekEl ? kepsekEl.value : '').trim();
      const salaryRaw = salaryEl ? salaryEl.value : '';
      const level = levelEl ? levelEl.value : 'SD';
      const useParallel = useParallelEl ? useParallelEl.checked : false;
      const parallelMax = parallelMaxEl ? parallelMaxEl.value : 'A';
      const tahunPelajaran = (tahunPelajaranEl ? tahunPelajaranEl.value : '').trim();
      const semester = (semesterEl ? semesterEl.value : 'Ganjil');
      const waktuPerJTM = (waktuPerJTMEl ? waktuPerJTMEl.value : '40');
      const appVersion = (appVersionEl ? appVersionEl.value : '').trim();
      if (!kepsek) {
        showToast('Nama kepala sekolah wajib diisi.', 'error');
        if (kepsekEl) try { kepsekEl.focus(); } catch (_) { }
        return;
      }
      if (salaryRaw === '' || isNaN(Number(salaryRaw)) || Number(salaryRaw) < 0) {
        showToast('Gaji pokok per JTM harus angka ≥ 0.', 'error');
        if (salaryEl) try { salaryEl.focus(); } catch (_) { }
        return;
      }
      if (!tahunPelajaran) {
        showToast('Tahun pelajaran wajib diisi.', 'error');
        if (tahunPelajaranEl) try { tahunPelajaranEl.focus(); } catch (_) { }
        return;
      }
      if (!waktuPerJTM || isNaN(Number(waktuPerJTM)) || Number(waktuPerJTM) <= 0) {
        showToast('Waktu per JTM harus angka > 0.', 'error');
        if (waktuPerJTMEl) try { waktuPerJTMEl.focus(); } catch (_) { }
        return;
      }
      if (!appVersion) {
        showToast('Versi aplikasi wajib diisi.', 'error');
        if (appVersionEl) try { appVersionEl.focus(); } catch (_) { }
        return;
      }
      let classData = {};
      const inputs = document.querySelectorAll('[id^="inpStd_"]');
      // Ambil max dan min sesuai tingkatan yang dipilih
      const _saveStdMax = _STD_MAX_BY_LEVEL[level] || 36;
      const _saveStdMin = useParallel ? _STD_MIN_PARALLEL : 0; // min hanya berlaku saat paralel aktif
      let classValidError = '';
      inputs.forEach(inp => {
        if (classValidError) return; // stop pada error pertama
        const kelasName  = inp.id.split('inpStd_')[1];
        const rawVal     = inp.value.trim();
        const numVal     = rawVal === '' ? 0 : Number(rawVal);
        if (isNaN(numVal) || !Number.isInteger(numVal) || numVal < 0) {
          classValidError = `Nilai siswa untuk kelas ${kelasName} harus berupa bilangan bulat ≥ 0.`;
          try { inp.focus(); } catch (_) { }
          return;
        }
        if (numVal > _saveStdMax) {
          classValidError = `Kelas ${kelasName}: jumlah siswa (${numVal}) melebihi batas maksimal ${_saveStdMax} untuk tingkatan ${level}.`;
          try { inp.focus(); } catch (_) { }
          return;
        }
        if (useParallel && numVal > 0 && numVal < _saveStdMin) {
          classValidError = `Kelas ${kelasName}: jumlah siswa (${numVal}) kurang dari batas minimal ${_saveStdMin} saat kelas paralel aktif.`;
          try { inp.focus(); } catch (_) { }
          return;
        }
        const key = 'std_kelas_' + kelasName;
        classData[key] = numVal;
      });
      if (classValidError) {
        showToast(classValidError, 'error');
        return;
      }
      const allowH1JournalEl = document.getElementById('chkAllowH1Journal');
      const allowH1Journal = allowH1JournalEl ? allowH1JournalEl.checked : false;
      const configData = {
        kepala_sekolah: kepsek,
        base_salary: salaryRaw,
        tingkatan: level,
        use_parallel: useParallel ? 'true' : 'false',
        parallel_max: parallelMax,
        tahun_pelajaran: tahunPelajaran,
        semester: semester,
        waktu_per_jtm: waktuPerJTM,
        app_version: appVersion,
        allow_h_minus_1_journal: allowH1Journal ? 'true' : 'false',
        ...classData
      };
      var btn = document.getElementById('btnSaveConfig');
      if (btn && btn.dataset.busy === 'true') return;
      var restore = (typeof _busyButton === 'function') ? _busyButton(btn, 'Menyimpan...') : function () {
        if (btn) { btn.disabled = true; btn.dataset._oldHTML = btn.innerHTML; btn.innerHTML = 'Menyimpan...'; }
        return function () { if (btn) { btn.disabled = false; if (btn.dataset._oldHTML) { btn.innerHTML = btn.dataset._oldHTML; delete btn.dataset._oldHTML; } } };
      }();
      google.script.run.withSuccessHandler((res) => {
        restore();
        if (res && res.status === 'success') {
          showToast('Konfigurasi sistem disimpan', 'success');
          globalConfig = { ...globalConfig, ...configData };
          if (document.getElementById('txtFooterVersion')) {
             document.getElementById('txtFooterVersion').innerText = configData.app_version || '2.1.1';
          }
          if (document.getElementById('txtLoginVersionLeft')) {
             document.getElementById('txtLoginVersionLeft').innerText = configData.app_version || '2.1.1';
          }
          if (typeof populateGlobalClassSelects === 'function') populateGlobalClassSelects();
        }
        else showToast((res && res.message) || 'Gagal menyimpan konfigurasi.', 'error');
      }).withFailureHandler((err) => {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveSystemConfig(token, configData);
    }
    function saveTransportConfigUI() {
      const token = localStorage.getItem('auth_token');
      const tarifEl = document.getElementById('cfgTarifPerKm');
      const enabledEl = document.getElementById('cfgTransportEnabled');
      const tarif_per_km = tarifEl ? tarifEl.value : '';
      const enabled = enabledEl ? enabledEl.checked : false;
      if (!tarif_per_km || isNaN(Number(tarif_per_km)) || Number(tarif_per_km) <= 0) {
        showToast('Tarif per KM harus diisi angka positif.', 'error');
        if (tarifEl) try { tarifEl.focus(); } catch (_) { }
        return;
      }
      var btn = document.getElementById('btnSaveTransportConfig');
      if (btn && btn.dataset.busy === 'true') return;
      var restore = (typeof _busyButton === 'function') ? _busyButton(btn, 'Menyimpan...') : function () {
        if (btn) { btn.disabled = true; btn.dataset._oldHTML = btn.innerHTML; btn.innerHTML = 'Menyimpan...'; }
        return function () { if (btn) { btn.disabled = false; if (btn.dataset._oldHTML) { btn.innerHTML = btn.dataset._oldHTML; delete btn.dataset._oldHTML; } } };
      }();
      const payload = {
        tarif_per_km: Number(tarif_per_km),
        transport_allowance_enabled: enabled
      };
      google.script.run.withSuccessHandler((res) => {
        restore();
        if (res && res.status === 'success') {
          showToast('Konfigurasi transportasi disimpan', 'success');
          globalConfig.tarif_per_km = payload.tarif_per_km;
          globalConfig.transport_allowance_enabled = payload.transport_allowance_enabled;
        } else {
          showToast((res && res.message) || 'Gagal menyimpan konfigurasi.', 'error');
        }
      }).withFailureHandler((err) => {
        restore();
        showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
      }).saveTransportConfig(token, payload);
    }
    function populateGlobalClassSelects() {
      const level = globalConfig.tingkatan || 'SMP';
      const useParallel = globalConfig.use_parallel === 'true';
      const parallelMax = globalConfig.parallel_max || 'A';
      let baseClasses = [];
      if (level === 'SD') baseClasses = [1, 2, 3, 4, 5, 6];
      else if (level === 'SMA' || level === 'SMK') baseClasses = [10, 11, 12];
      else baseClasses = [7, 8, 9];
      let finalClasses = [];
      if (useParallel) {
        const maxIndex = _ALPHABET_FULL.indexOf(parallelMax);
        baseClasses.forEach(c => {
          for (let i = 0; i <= maxIndex; i++) {
            finalClasses.push(`${c}${_ALPHABET_FULL[i]}`);
          }
        });
      } else {
        finalClasses = baseClasses;
      }
      const targetIds = ['filterClass', 'inpSchedClass'];
      targetIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          const currentVal = el.value;
          let html = '<option value="">Pilih Kelas...</option>';
          finalClasses.forEach(c => {
            html += `<option value="${c}">${c}</option>`;
          });
          el.innerHTML = html;
          if (currentVal) el.value = currentVal;
        }
      });
    }
    function renderHolidaysList(holidays) {
      const tbody = document.getElementById('tbodyHolidays');
      if (!tbody) return;
      tbody.innerHTML = '';
      if (!holidays || holidays.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-400 text-sm italic">Belum ada data libur</td></tr>';
        return;
      }
      let today = new Date();
      let tzOffset = 7 * 60 * 60 * 1000;
      let localToday = new Date(today.getTime() + tzOffset);
      let todayStr = localToday.toISOString().split('T')[0];
      holidays.forEach(h => {
        let isPast = h.date < todayStr;
        let dateStr = formatDateID(h.date);
        let descSafe = escapeHtml(h.desc || h.description || '');
        let safeIdJs = String(h.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let safeDescJs = String(h.desc || h.description || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let tr = document.createElement('tr');
        tr.className = "border-b hover:bg-slate-50 transition-colors";
        let actionsHtml = '';
        if (isPast) {
          actionsHtml = `<span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-1 rounded-md">Terkunci</span>`;
        } else {
          actionsHtml = `
            ${actionBtn('edit', `editHolidayAction('${safeIdJs}', '${h.date}', '${safeDescJs}', '${h.is_holiday}')`, 'Edit Hari Libur')}
            ${actionBtn('delete', `deleteHoliday('${safeIdJs}', this)`, 'Hapus Hari Libur')}
          `;
        }
        tr.innerHTML = `
              <td class="py-3 px-4 text-slate-700 text-sm" data-label="Tanggal"><span class="settings-mobile-value">${escapeHtml(dateStr)}</span></td>
              <td class="py-3 px-4 text-slate-600 text-sm" data-label="Keterangan"><span class="settings-mobile-value">${descSafe}</span></td>
              <td class="py-3 px-4 text-center" data-label="Hari Libur">
                ${h.is_holiday
            ? '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">Ya</span>'
            : '<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">Tidak</span>'}
              </td>
              <td class="py-3 px-4 text-center settings-cell-actions">
                ${actionsHtml}
              </td>`;
        tbody.appendChild(tr);
      });
    }
    function editHolidayAction(id, date, desc, isHoliday) {
      document.getElementById('inpLiburId').value = id;
      document.getElementById('inpLiburDate').value = date;
      document.getElementById('inpLiburDesc').value = desc;
      document.getElementById('chkIsBonus').checked = (isHoliday === 'true' || isHoliday === true);
      if(typeof setLiburMode === 'function') setLiburMode('single');
      document.getElementById('btnAddHoliday').innerText = 'Simpan Edit';
      document.getElementById('btnCancelLibur').classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    function deleteHoliday(id, btnEl) {
      showConfirm('Hapus Libur', 'Hapus data hari libur ini?', () => {
        const token = localStorage.getItem('auth_token');
        var restoreBtn = (typeof _busyButton === 'function') ? _busyButton(btnEl, '') : function () { };
        var restoreRow = (typeof _setRowLoading === 'function') ? _setRowLoading(btnEl) : function () { };
        google.script.run.withSuccessHandler((res) => {
          if (res && res.status === 'success') {
            showToast('Hari libur dihapus.', 'success');
            initSettings();
          } else {
            restoreBtn(); restoreRow();
            showToast((res && res.message) || 'Gagal menghapus.', 'error');
          }
        }).withFailureHandler((err) => {
          restoreBtn(); restoreRow();
          showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
        }).deleteHoliday(token, id);
      });
    }
    function resetLiburForm() {
      document.getElementById('inpLiburId').value = '';
      document.getElementById('inpLiburDate').value = '';
      document.getElementById('inpLiburDesc').value = '';
      document.getElementById('chkIsBonus').checked = false;
      document.getElementById('btnAddHoliday').innerText = 'Simpan';
      document.getElementById('btnCancelLibur').classList.add('hidden');
    }
    /**
     * Batas huruf paralel maksimum per tingkatan sekolah:
     *   SD/MI    → A–D  (4 kelas maks per angkatan)
     *   SMP/MTs  → A–K  (11 kelas maks per angkatan)
     *   SMA/MA   → A–L  (12 kelas maks per angkatan)
     *   SMK/MAK  → A–X  (24 kelas maks per angkatan)
     *
     * Batas maksimal siswa per rombel per tingkatan:
     *   SD/MI    → 28 siswa
     *   SMP/MTs  → 32 siswa
     *   SMA/MA   → 36 siswa
     *   SMK/MAK  → 36 siswa
     *
     * Minimal siswa per rombel (berlaku hanya saat kelas paralel aktif): 15 siswa
     */
    var _PARALLEL_MAX_BY_LEVEL = {
      'SD':  'D',
      'SMP': 'K',
      'SMA': 'L',
      'SMK': 'X'
    };
    var _STD_MAX_BY_LEVEL = {
      'SD':  28,
      'SMP': 32,
      'SMA': 36,
      'SMK': 36
    };
    var _STD_MIN_PARALLEL = 15; // batas minimum siswa per rombel saat paralel aktif
    var _ALPHABET_FULL = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X'];

    /**
     * Memperbarui opsi dropdown selParallelMax sesuai tingkatan sekolah yang dipilih.
     * Dipanggil saat cfgLevel berubah.
     * - Opsi dibatasi sesuai _PARALLEL_MAX_BY_LEVEL.
     * - Nilai terpilih saat ini dipertahankan jika masih dalam range; jika tidak, di-clamp ke max baru.
     */
    function _syncParallelMaxOptions() {
      var levelEl = document.getElementById('cfgLevel');
      var selMax  = document.getElementById('selParallelMax');
      if (!levelEl || !selMax) return;
      var level    = levelEl.value || 'SMP';
      var maxLetter = _PARALLEL_MAX_BY_LEVEL[level] || 'K';
      var maxIdx   = _ALPHABET_FULL.indexOf(maxLetter);
      var prevVal  = selMax.value;
      // Rebuild opsi hanya sampai maxLetter
      var html = '';
      for (var i = 0; i <= maxIdx; i++) {
        html += '<option value="' + _ALPHABET_FULL[i] + '">' + _ALPHABET_FULL[i] + '</option>';
      }
      selMax.innerHTML = html;
      // Pertahankan nilai lama jika masih dalam range; jika tidak, clamp ke max baru
      var prevIdx = _ALPHABET_FULL.indexOf(prevVal);
      selMax.value = (prevIdx >= 0 && prevIdx <= maxIdx) ? prevVal : maxLetter;
    }

    function renderClassInputs() {
      const levelEl     = document.getElementById('cfgLevel');
      const chkParallel = document.getElementById('chkUseParallel');
      const selMax      = document.getElementById('selParallelMax');
      const container   = document.getElementById('containerClassInputs');
      if (!container) return;
      const level       = levelEl ? levelEl.value : (globalConfig.tingkatan || 'SD');
      const useParallel = chkParallel ? chkParallel.checked : (globalConfig.use_parallel === 'true');
      const parallelMax = selMax ? selMax.value : (globalConfig.parallel_max || 'A');
      // Batas max siswa per rombel sesuai tingkatan
      const stdMax      = _STD_MAX_BY_LEVEL[level] || 36;
      if (selMax) {
        selMax.disabled = !useParallel;
        if (!useParallel) {
          selMax.classList.add('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        } else {
          selMax.classList.remove('bg-slate-100', 'text-slate-400', 'cursor-not-allowed');
        }
      }
      let baseClasses = [];
      if (level === 'SD') baseClasses = [1, 2, 3, 4, 5, 6];
      else if (level === 'SMA' || level === 'SMK') baseClasses = [10, 11, 12];
      else baseClasses = [7, 8, 9]; // SMP
      const maxIndex = _ALPHABET_FULL.indexOf(parallelMax);
      let generatedClasses = [];
      if (useParallel) {
        baseClasses.forEach(c => {
          for (let i = 0; i <= maxIndex; i++) {
            generatedClasses.push(`${c}${_ALPHABET_FULL[i]}`);
          }
        });
      } else {
        generatedClasses = baseClasses;
      }
      let html = '';
      generatedClasses.forEach(c => {
        const key = `std_kelas_${c}`;
        // Default 0; jika config sudah punya nilai, pakai nilai itu (dan clamp ke max baru)
        const stored  = globalConfig[key];
        const val     = (stored !== undefined && stored !== null && stored !== '')
                        ? Math.min(Number(stored), stdMax)
                        : 0;
        html += `
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Kelas ${c}</label>
          <input type="number" id="inpStd_${c}" min="0" max="${stdMax}"
            class="w-full px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value="${val}" placeholder="0–${stdMax}">
        </div>`;
      });
      container.innerHTML = html;
    }
    function renderSubjectsList(subjects) {
      const tbody = document.getElementById('tbodySubjects');
      if (!tbody) return;
      if (!subjects || subjects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-400 italic text-sm settings-cell-empty">Belum ada mata pelajaran.</td></tr>';
        return;
      }
      let html = '';
      subjects.forEach(s => {
        var safeId = String(s.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var safeName = String(s.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var dispName = escapeHtml(s.name || '-');
        html += `
        <tr class="border-b hover:bg-slate-50 transition-colors group">
          <td class="px-4 py-3 font-medium text-slate-700" data-label="Mapel"><span class="settings-mobile-value">${dispName}</span></td>
          <td class="px-4 py-3 settings-cell-actions">
            <div class="flex items-center justify-end gap-1.5">
              ${actionBtn('edit', `openSubjectModal('${safeId}', '${safeName}')`, 'Edit Mapel')}
              ${actionBtn('delete', `deleteSubjectAction('${safeId}', this)`, 'Hapus Mapel')}
            </div>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
    }
    function renderAllowancesList(allowances) {
      const tbody = document.getElementById('tbodyAllowances');
      if (!tbody) return;
      if (!allowances || allowances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400 italic text-sm settings-cell-empty">Belum ada data tunjangan.</td></tr>';
        return;
      }
      let html = '';
      allowances.forEach((a, idx) => {
        var safeId = String(a.id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeDuty = String(a.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeUserId = String(a.user_id || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        var safeAmount = Number(a.amount || 0);
        var dispName = escapeHtml(a.name || '-');
        var dispGuru = escapeHtml(a.guru_name || 'Unknown');
        const formattedAmount = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(a.amount);
        html += `<tr class="border-b hover:bg-slate-50 transition-colors">
          <td class="px-4 py-3 text-center text-slate-500 text-sm" data-label="No."><span class="settings-mobile-value">${idx + 1}</span></td>
          <td class="px-4 py-3 font-semibold text-slate-700 text-sm" data-label="Jenis Tunjangan"><span class="settings-mobile-value">${dispName}</span></td>
          <td class="px-4 py-3 text-slate-600 text-sm" data-label="Penerima"><span class="settings-mobile-value">${dispGuru}</span></td>
          <td class="px-4 py-3 text-right font-bold text-emerald-600 text-sm" data-label="Nominal"><span class="settings-mobile-value">${formattedAmount}</span></td>
          <td class="px-4 py-3 text-center settings-cell-actions">
            <div class="flex items-center justify-center gap-1.5">
              ${actionBtn('edit', `editAllowanceAction('${safeId}', '${safeDuty}', '${safeUserId}', ${safeAmount})`, 'Edit Tunjangan')}
              ${actionBtn('delete', `deleteAllowanceAction('${safeId}', this)`, 'Hapus Tunjangan')}
            </div>
          </td>
       </tr>`;
      });
      tbody.innerHTML = html;
    }
    