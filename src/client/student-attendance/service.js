var _saPageData = null;
    function initStudentAttendance() {
      _saPageData = null;
      var grid = document.getElementById('saClassGrid');
      if (grid) {
        grid.innerHTML = '<div class="animate-pulse bg-white rounded-2xl h-28 border border-slate-100 shadow-sm"></div>'.repeat(4);
      }
      var token = localStorage.getItem('auth_token');
      if (!token) return;
      google.script.run
        .withSuccessHandler(function(res) {
          if (!res || res.status !== 'success') {
            if (grid) grid.innerHTML = '<div class="col-span-2 text-center py-12 text-slate-400 text-sm">Gagal memuat data. ' + escapeHtml((res && res.message) || '') + '</div>';
            return;
          }
          if (!res.is_admin && !res.is_picket_today && !res.is_panitia_today) {
            showToast('Akses Ditolak: Halaman ini hanya untuk guru piket, guru piket pengganti, atau panitia ujian yang kehadirannya sudah dikonfirmasi admin hari ini.', 'error');
            handleNav('Page_Dashboard');
            return;
          }
          _saPageData = res;
          _renderStudentAttendanceClasses(res);
          var classes = res.classes || [];
          var submitted = classes.filter(function(c) { return c.has_data; }).length;
          var total    = classes.length;
          var banner   = document.getElementById('saBannerInfo');
          if (banner) banner.style.display = (total > 0 && submitted >= total) ? 'none' : '';
        })
        .withFailureHandler(function(err) {
          if (grid) grid.innerHTML = '<div class="col-span-2 text-center py-12 text-slate-400 text-sm">Koneksi gagal: ' + escapeHtml(String(err)) + '</div>';
        })
        .getStudentAttendancePageData(token);
    }
    function _renderStudentAttendanceClasses(data) {
      var grid = document.getElementById('saClassGrid');
      if (!grid) return;
      var classes = data.classes || [];
      if (classes.length === 0) {
        grid.innerHTML = '<div class="col-span-2 text-center py-12 text-slate-400 italic text-sm">Tidak ada kelas ditemukan untuk semester aktif.</div>';
        _updateSaProgress(0, 0);
        return;
      }
      var submitted = classes.filter(function(c) { return c.has_data; }).length;
      _updateSaProgress(submitted, classes.length);
      var html = '';
      classes.forEach(function(c) {
        var cn = escapeHtml(c.class_name || '');
        var safeCn = String(c.class_name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        var hasData = !!c.has_data;
        var stdSiswa = (c.std_siswa !== null && c.std_siswa !== undefined) ? c.std_siswa : null;
        var statusBadge = hasData
          ? '<span class="inline-flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold"><span class="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block"></span>Sudah Diisi</span>'
          : '<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block"></span>Belum Diisi</span>';
        var summaryHtml = '';
        if (hasData) {
          var totalFilled = (c.hadir||0) + (c.sakit||0) + (c.izin||0) + (c.alpa||0);
          var totalMatchStd = stdSiswa !== null && totalFilled === stdSiswa;
          var totalColor = stdSiswa !== null ? (totalMatchStd ? 'text-emerald-700' : 'text-red-600') : 'text-slate-700';
          summaryHtml = '<div class="mt-2 grid grid-cols-4 gap-1 text-center">' +
            '<div class="bg-emerald-50 rounded-lg py-1"><div class="text-[10px] text-emerald-600 font-semibold">Hadir</div><div class="font-mono font-bold text-emerald-700 text-sm">' + (c.hadir||0) + '</div></div>' +
            '<div class="bg-amber-50 rounded-lg py-1"><div class="text-[10px] text-amber-600 font-semibold">Sakit</div><div class="font-mono font-bold text-amber-700 text-sm">' + (c.sakit||0) + '</div></div>' +
            '<div class="bg-blue-50 rounded-lg py-1"><div class="text-[10px] text-blue-600 font-semibold">Izin</div><div class="font-mono font-bold text-blue-700 text-sm">' + (c.izin||0) + '</div></div>' +
            '<div class="bg-red-50 rounded-lg py-1"><div class="text-[10px] text-red-600 font-semibold">Alpa</div><div class="font-mono font-bold text-red-700 text-sm">' + (c.alpa||0) + '</div></div>' +
            '</div>' +
            '<div class="mt-1.5 flex items-center justify-between px-0.5">' +
            '<span class="text-[11px] text-slate-400">Total: <span class="font-mono font-bold ' + totalColor + '">' + totalFilled + '</span></span>' +
            (stdSiswa !== null ? '<span class="text-[11px] text-slate-400">Standar: <span class="font-mono font-semibold text-slate-600">' + stdSiswa + '</span>' + (totalMatchStd ? ' <span class="text-emerald-600">\u2713</span>' : ' <span class="text-red-500">\u2717</span>') + '</span>' : '') +
            '</div>';
        }
        var btnLabel = hasData ? 'Edit' : 'Input';
        var btnClass = hasData
          ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
          : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm';
        var existingDataJson = hasData ? JSON.stringify({hadir:c.hadir,sakit:c.sakit,izin:c.izin,alpa:c.alpa}).replace(/"/g,'&quot;') : 'null';
        var stdArg = stdSiswa !== null ? String(stdSiswa) : 'null';
        html +=
          '<div class="bg-white rounded-2xl border ' + (hasData ? 'border-teal-200' : 'border-slate-200') + ' shadow-sm p-4">' +
          '<div class="flex items-center justify-between mb-2">' +
          '<div class="flex items-center gap-2">' +
          '<div class="w-8 h-8 rounded-lg ' + (hasData ? 'bg-teal-100' : 'bg-slate-100') + ' flex items-center justify-center">' +
          '<span class="font-bold text-xs ' + (hasData ? 'text-teal-700' : 'text-slate-500') + '">' + cn + '</span>' +
          '</div>' +
          '<div>' +
          '<p class="font-bold text-slate-800 text-sm">' + cn + '</p>' +
          '<div class="flex items-center gap-1.5 mt-0.5">' + statusBadge +
          (stdSiswa !== null ? '<span class="text-[10px] text-slate-400 font-medium">Std: ' + stdSiswa + '</span>' : '') +
          '</div>' +
          '</div>' +
          '</div>' +
          '<button onclick="openStudentAttendanceModal(\'' + safeCn + '\',' + existingDataJson + ',' + stdArg + ')" class="text-xs font-semibold px-3 py-1.5 rounded-lg transition ' + btnClass + '">' + btnLabel + '</button>' +
          '</div>' +
          summaryHtml +
          '</div>';
      });
      grid.innerHTML = html;
    }
    function _updateSaProgress(submitted, total) {
      var label = document.getElementById('saProgressLabel');
      var bar   = document.getElementById('saProgressBar');
      var sub   = document.getElementById('saProgressSub');
      if (label) label.innerText = submitted + ' / ' + total;
      if (bar)   bar.style.width = (total > 0 ? Math.round(submitted/total*100) : 0) + '%';
      if (sub) {
        if (total === 0) { sub.innerText = 'Tidak ada kelas hari ini.'; }
        else if (submitted === 0) { sub.innerText = 'Belum ada kelas yang diisi. Selesaikan rekap semua kelas terlebih dahulu.'; }
        else if (submitted < total) { sub.innerText = submitted + ' kelas sudah diisi, ' + (total - submitted) + ' kelas belum. Isi semua kelas untuk membuka akses konfirmasi pengawas ujian.'; }
        else { sub.innerText = 'Semua kelas sudah diisi.'; }
      }
    }
    function openStudentAttendanceModal(className, existingData, stdSiswa) {
      var modal = document.getElementById('studentAttendanceModal');
      if (!modal) {
        showToast('Modal tidak ditemukan. Coba muat ulang halaman.', 'error');
        return;
      }
      var inp   = document.getElementById('saInpClassName');
      var inpStd = document.getElementById('saInpStdSiswa');
      var title = document.getElementById('saModalTitle');
      var inpHadir = document.getElementById('saInpHadir');
      var inpSakit = document.getElementById('saInpSakit');
      var inpIzin  = document.getElementById('saInpIzin');
      var inpAlpa  = document.getElementById('saInpAlpa');
      if (inp)    inp.value    = className || '';
      if (inpStd) inpStd.value = (stdSiswa !== null && stdSiswa !== undefined && !isNaN(stdSiswa)) ? String(stdSiswa) : '';
      if (title)  title.innerText = 'Input Absensi \u2014 ' + (className || '');
      if (inpHadir) inpHadir.value = existingData && existingData.hadir !== undefined ? existingData.hadir : 0;
      if (inpSakit) inpSakit.value = existingData && existingData.sakit !== undefined ? existingData.sakit : 0;
      if (inpIzin)  inpIzin.value  = existingData && existingData.izin  !== undefined ? existingData.izin  : 0;
      if (inpAlpa)  inpAlpa.value  = existingData && existingData.alpa  !== undefined ? existingData.alpa  : 0;
      updateSaTotal();
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }
    function closeStudentAttendanceModal() {
      var modal = document.getElementById('studentAttendanceModal');
      if (modal) modal.classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') _maybeReleaseBodyLock();
      else document.body.classList.remove('overflow-hidden');
    }
    function adjustSaInput(id, delta) {
      var el = document.getElementById(id);
      if (!el) return;
      var v = Math.max(0, Math.min(999, (parseInt(el.value || '0', 10) || 0) + delta));
      el.value = v;
      updateSaTotal();
    }
    function updateSaTotal() {
      var h = parseInt((document.getElementById('saInpHadir') || {}).value || '0', 10) || 0;
      var s = parseInt((document.getElementById('saInpSakit') || {}).value || '0', 10) || 0;
      var i = parseInt((document.getElementById('saInpIzin')  || {}).value || '0', 10) || 0;
      var a = parseInt((document.getElementById('saInpAlpa')  || {}).value || '0', 10) || 0;
      var total = h + s + i + a;

      var totEl    = document.getElementById('saTotalCount');
      var display  = document.getElementById('saTotalDisplay');
      var badge    = document.getElementById('saTotalStdBadge');
      var hint     = document.getElementById('saTotalHint');
      var btn      = document.getElementById('btnSaveStudentAttendance');
      var stdInp   = document.getElementById('saInpStdSiswa');
      var stdVal   = stdInp && stdInp.value !== '' ? parseInt(stdInp.value, 10) : null;

      if (totEl) totEl.innerText = total;

      var isValid = true;
      if (stdVal !== null && !isNaN(stdVal)) {
        var diff = total - stdVal;
        if (diff === 0) {
          // Tepat sesuai standar — hijau
          if (display) { display.style.background = '#F0FDF4'; display.style.borderColor = '#86EFAC'; }
          if (totEl)   totEl.style.color = '#15803D';
          if (badge) {
            badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
            badge.innerText = '= ' + stdVal + ' \u2713';
            badge.classList.remove('hidden');
          }
          if (hint) { hint.innerText = 'Sesuai standar kelas (' + stdVal + ' siswa)'; hint.style.color = '#15803D'; hint.classList.remove('hidden'); }
          isValid = true;
        } else if (diff > 0) {
          // Melebihi standar — merah
          if (display) { display.style.background = '#FFF1F2'; display.style.borderColor = '#FCA5A5'; }
          if (totEl)   totEl.style.color = '#DC2626';
          if (badge) {
            badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700';
            badge.innerText = 'Standar: ' + stdVal;
            badge.classList.remove('hidden');
          }
          if (hint) { hint.innerText = 'Melebihi standar ' + diff + ' siswa (standar: ' + stdVal + ')'; hint.style.color = '#DC2626'; hint.classList.remove('hidden'); }
          isValid = false;
        } else {
          // Kurang dari standar — oranye
          if (display) { display.style.background = '#FFFBEB'; display.style.borderColor = '#FCD34D'; }
          if (totEl)   totEl.style.color = '#B45309';
          if (badge) {
            badge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700';
            badge.innerText = 'Standar: ' + stdVal;
            badge.classList.remove('hidden');
          }
          if (hint) { hint.innerText = 'Kurang ' + Math.abs(diff) + ' siswa dari standar (' + stdVal + ')'; hint.style.color = '#B45309'; hint.classList.remove('hidden'); }
          isValid = false;
        }
      } else {
        // Tidak ada standar — tampilan netral
        if (display) { display.style.background = ''; display.style.borderColor = ''; }
        if (totEl)   totEl.style.color = '';
        if (badge)   { badge.classList.add('hidden'); }
        if (hint)    { hint.classList.add('hidden'); }
        isValid = total > 0;
      }

      if (btn) {
        btn.disabled = !isValid;
      }
    }
    function submitStudentAttendance() {
      var className = (document.getElementById('saInpClassName') || {}).value || '';
      if (!className) return showToast('Nama kelas tidak valid.', 'error');
      var hadir = parseInt((document.getElementById('saInpHadir') || {}).value || '0', 10) || 0;
      var sakit = parseInt((document.getElementById('saInpSakit') || {}).value || '0', 10) || 0;
      var izin  = parseInt((document.getElementById('saInpIzin')  || {}).value || '0', 10) || 0;
      var alpa  = parseInt((document.getElementById('saInpAlpa')  || {}).value || '0', 10) || 0;
      if ((hadir + sakit + izin + alpa) === 0) {
        return showToast('Total siswa tidak boleh nol. Harap isi setidaknya satu nilai.', 'error');
      }
      var btn = document.getElementById('btnSaveStudentAttendance');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }
      var token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.status === 'success') {
            closeStudentAttendanceModal();
            showToast('Rekap absensi kelas ' + className + ' berhasil disimpan.', 'success');
            initStudentAttendance();
          } else {
            if (btn) btn.innerText = 'Simpan';
            showToast((res && res.message) || 'Gagal menyimpan rekap.', 'error');
            updateSaTotal(); // restore disabled state sesuai validasi standar
          }
        })
        .withFailureHandler(function(err) {
          if (btn) btn.innerText = 'Simpan';
          showToast('Koneksi gagal: ' + err, 'error');
          updateSaTotal(); // restore disabled state sesuai validasi standar
        })
        .saveStudentAttendance(token, { class_name: className, hadir: hadir, sakit: sakit, izin: izin, alpa: alpa });
    }
    // =============================================
    // STUDENT ATTENDANCE HISTORY PAGE (Riwayat Absensi Siswa)
    // =============================================
    function initStudentAttendanceHistory() {
      var now = new Date();
      var monthSel = document.getElementById('saHistMonthFilter');
      var yearSel  = document.getElementById('saHistYearFilter');
      if (monthSel) monthSel.value = String(now.getMonth() + 1);
      if (yearSel) {
        yearSel.innerHTML = '';
        var curYear = now.getFullYear();
        for (var y = curYear; y >= curYear - 3; y--) {
          var opt = document.createElement('option');
          opt.value = y;
          opt.textContent = y;
          if (y === curYear) opt.selected = true;
          yearSel.appendChild(opt);
        }
      }
      loadStudentAttendanceHistory();
    }
    function loadStudentAttendanceHistory() {
      var monthSel = document.getElementById('saHistMonthFilter');
      var yearSel  = document.getElementById('saHistYearFilter');
      var tbody    = document.getElementById('saHistTableBody');
      if (!tbody) return;
      var month = monthSel ? parseInt(monthSel.value) : (new Date().getMonth() + 1);
      var year  = yearSel  ? parseInt(yearSel.value)  : new Date().getFullYear();
      var skeletonRow = '<tr class="border-b border-slate-100 animate-pulse">' +
        Array(10).fill('<td class="py-3 px-4"><div class="h-4 bg-slate-200 rounded"></div></td>').join('') +
        '</tr>';
      tbody.innerHTML = skeletonRow.repeat(5);
      var token = localStorage.getItem('auth_token');
      var btn = document.getElementById('btnLoadSaHist');
      if (btn) { btn.disabled = true; btn.innerText = 'Memuat...'; }
      google.script.run
        .withSuccessHandler(function(res) {
          if (btn) { btn.disabled = false; btn.innerText = 'Tampilkan'; }
          if (!res || res.status !== 'success') {
            tbody.innerHTML = '<tr><td colspan="10" class="py-12 text-center text-red-500 text-sm">' +
              escapeHtml((res && res.message) || 'Gagal memuat data.') + '</td></tr>';
            return;
          }
          renderStudentAttendanceHistoryTable(res);
        })
        .withFailureHandler(function(err) {
          if (btn) { btn.disabled = false; btn.innerText = 'Tampilkan'; }
          tbody.innerHTML = '<tr><td colspan="10" class="py-12 text-center text-red-500 text-sm">Koneksi gagal: ' +
            escapeHtml(String(err)) + '</td></tr>';
        })
        .getStudentAttendanceHistory(token, { month: month, year: year });
    }
    function renderStudentAttendanceHistoryTable(res) {
      var tbody = document.getElementById('saHistTableBody');
      var colDiisiOleh = document.getElementById('saHistColDiisiOleh');
      if (!tbody) return;
      var isAdmin = !!(res && res.is_admin);
      var records = (res && res.records) || [];
      var colCount = isAdmin ? 10 : 9;
      if (colDiisiOleh) colDiisiOleh.style.display = isAdmin ? '' : 'none';
      if (!records.length) {
        tbody.innerHTML = '<tr><td colspan="' + colCount + '" class="py-16 text-center text-slate-400 italic text-sm">Tidak ada data absensi untuk periode ini.</td></tr>';
        return;
      }
      var html = '';
      var monthsShort = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      records.forEach(function(r, idx) {
        var total = (r.hadir||0) + (r.sakit||0) + (r.izin||0) + (r.alpa||0);
        var dateDisp = r.date || '-';
        try {
          var dObj = new Date(r.date + 'T00:00:00');
          if (!isNaN(dObj.getTime())) {
            dateDisp = dObj.getDate() + ' ' + monthsShort[dObj.getMonth()] + ' ' + dObj.getFullYear();
          }
        } catch(_e) {}
        var diisiOlehCell = isAdmin
          ? '<td class="py-3 px-4 text-sm text-slate-600">' + escapeHtml(r.submitted_by_name || '-') + '</td>'
          : '';
        html += '<tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">' +
          '<td class="py-3 px-4 text-sm text-slate-400 text-center">' + (idx + 1) + '</td>' +
          '<td class="py-3 px-4 text-sm font-medium text-slate-700 whitespace-nowrap">' + escapeHtml(dateDisp) + '</td>' +
          '<td class="py-3 px-4"><span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">' + escapeHtml(r.class_name || '-') + '</span></td>' +
          '<td class="py-3 px-4 text-center"><span class="font-mono font-bold text-emerald-700">' + (r.hadir||0) + '</span></td>' +
          '<td class="py-3 px-4 text-center"><span class="font-mono font-bold text-amber-600">' + (r.sakit||0) + '</span></td>' +
          '<td class="py-3 px-4 text-center"><span class="font-mono font-bold text-blue-600">' + (r.izin||0) + '</span></td>' +
          '<td class="py-3 px-4 text-center"><span class="font-mono font-bold text-red-600">' + (r.alpa||0) + '</span></td>' +
          '<td class="py-3 px-4 text-center"><span class="font-mono font-semibold text-slate-700">' + total + '</span></td>' +
          diisiOlehCell +
          '<td class="py-3 px-4 text-sm text-slate-500 whitespace-nowrap font-mono">' + escapeHtml((r.submitted_at || '').substring(0, 5) || '-') + '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }
    