var _blokJurnalSubjects = [];
    var _blokJurnalData = [];

    function initBlokJurnal() {
      var token = localStorage.getItem('auth_token');
      var tbody = document.getElementById('tbodyBlokJurnal');
      if (tbody) tbody.innerHTML = skeletonTableRows(5, 4);
      // Chain getBlokJurnal setelah getSettingsMasterData selesai agar
      // _blokJurnalSubjects sudah terisi saat tabel dirender dan tombol Edit diklik.
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.status === 'success') {
            _blokJurnalSubjects = (res.subjects || []).map(function(s) { return s.name; });
            _populateBlokJurnalMapelDropdown();
          }
          google.script.run
            .withSuccessHandler(function(res2) {
              if (res2 && res2.status === 'success') {
                _blokJurnalData = res2.data || [];
                renderBlokJurnalTable(_blokJurnalData);
              } else {
                if (tbody) tbody.innerHTML = errorTableRows(5, escapeHtml((res2 && res2.message) || 'Gagal memuat data.'), 'initBlokJurnal()');
                showToast((res2 && res2.message) || 'Gagal memuat data blokir jurnal.', 'error');
              }
            })
            .withFailureHandler(function() {
              if (tbody) tbody.innerHTML = errorTableRows(5, 'Koneksi gagal. Periksa koneksi internet Anda.', 'initBlokJurnal()');
              showToast('Koneksi gagal.', 'error');
            })
            .getBlokJurnal(token);
        })
        .withFailureHandler(function() {
          // getSettingsMasterData gagal — tetap coba muat tabel blokir
          google.script.run
            .withSuccessHandler(function(res2) {
              if (res2 && res2.status === 'success') {
                _blokJurnalData = res2.data || [];
                renderBlokJurnalTable(_blokJurnalData);
              } else {
                if (tbody) tbody.innerHTML = errorTableRows(5, escapeHtml((res2 && res2.message) || 'Gagal memuat data.'), 'initBlokJurnal()');
                showToast((res2 && res2.message) || 'Gagal memuat data blokir jurnal.', 'error');
              }
            })
            .withFailureHandler(function() {
              if (tbody) tbody.innerHTML = errorTableRows(5, 'Koneksi gagal. Periksa koneksi internet Anda.', 'initBlokJurnal()');
              showToast('Koneksi gagal.', 'error');
            })
            .getBlokJurnal(token);
        })
        .getSettingsMasterData(token);
    }

    function _populateBlokJurnalMapelDropdown() {
      var sel = document.getElementById('blokJurnalMapel');
      if (!sel) return;
      while (sel.options.length > 2) sel.remove(2);
      _blokJurnalSubjects.forEach(function(name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        sel.appendChild(opt);
      });
    }

    function renderBlokJurnalTable(data) {
      var tbody = document.getElementById('tbodyBlokJurnal');
      if (!tbody) return;
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-10 text-center settings-cell-empty"><div class="flex flex-col items-center gap-2"><div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto"><svg class="w-6 h-6 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg></div><p class="text-sm font-semibold text-slate-500">Belum ada aturan blokir jurnal</p><p class="text-xs text-slate-400">Klik &quot;Tambah Blokir&quot; untuk menambahkan aturan pertama.</p></div></td></tr>';
        return;
      }
      tbody.innerHTML = data.map(function(r, idx) {
        var safeId = escapeHtml(r.id);
        var safeMapel = escapeHtml(r.mataPelajaran);
        var tglMulaiStr = String(r.tanggalMulai || '').trim();
        var tglSelesaiStr = String(r.tanggalSelesai || '').trim();
        var safePeriode = escapeHtml(
          tglMulaiStr === tglSelesaiStr
            ? fmtTglBlok(r.tanggalMulai)
            : fmtTglBlok(r.tanggalMulai) + ' – ' + fmtTglBlok(r.tanggalSelesai)
        );
        var safePesan = escapeHtml(r.pesan);
        var aktifBadge = r.aktif
          ? '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">Aktif</span>'
          : '<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">Nonaktif</span>';
        var mapelBadge = r.mataPelajaran === 'SEMUA'
          ? '<span class="inline-flex items-center bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg">\uD83D\uDD12 SEMUA</span>'
          : safeMapel;
        return '<tr class="border-b hover:bg-slate-50 transition-colors group">'
          + '<td class="px-4 py-3 font-medium text-slate-700" data-label="Mata Pelajaran"><span class="settings-mobile-value">' + mapelBadge + '</span></td>'
          + '<td class="px-4 py-3 text-slate-600 text-sm tabular-nums whitespace-nowrap" data-label="Periode"><span class="settings-mobile-value">' + safePeriode + '</span></td>'
          + '<td class="px-4 py-3 text-slate-500 text-sm max-w-xs" data-label="Pesan"><span class="settings-mobile-value line-clamp-2" title="' + safePesan + '">' + safePesan + '</span></td>'
          + '<td class="px-4 py-3 text-center" data-label="Status"><span class="settings-mobile-value">' + aktifBadge + '</span></td>'
          + '<td class="px-4 py-3 settings-cell-actions"><div class="flex items-center justify-center gap-1.5">'
          + actionBtn('edit', 'blokJurnal_editForm(' + idx + ')', 'Edit')
          + actionBtn('delete', "blokJurnal_hapus('" + safeId + "', this)", 'Hapus')
          + '</div></td>'
          + '</tr>';
      }).join('');
    }

    function blokJurnal_openForm() {
      document.getElementById('blokJurnalId').value = '';
      document.getElementById('blokJurnalMapel').value = '';
      document.getElementById('blokJurnalTglMulai').value = '';
      document.getElementById('blokJurnalTglSelesai').value = '';
      document.getElementById('blokJurnalPesan').value = '';
      document.getElementById('blokJurnalAktif').checked = true;
      _populateBlokJurnalMapelDropdown();
      var title = document.getElementById('blokJurnalFormTitle');
      if (title) title.textContent = 'Tambah Blokir Baru';
      var lbl = document.getElementById('lblSimpanBlokJurnal');
      if (lbl) lbl.textContent = 'Simpan';
      var panel = document.getElementById('blokJurnalFormPanel');
      if (panel) {
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function blokJurnal_editForm(idx) {
      var r = _blokJurnalData[idx];
      if (!r) return;
      _populateBlokJurnalMapelDropdown();
      document.getElementById('blokJurnalId').value = r.id;
      document.getElementById('blokJurnalMapel').value = r.mataPelajaran;
      document.getElementById('blokJurnalTglMulai').value = sanitizeDateForInput(r.tanggalMulai);
      document.getElementById('blokJurnalTglSelesai').value = sanitizeDateForInput(r.tanggalSelesai);
      document.getElementById('blokJurnalPesan').value = r.pesan;
      document.getElementById('blokJurnalAktif').checked = r.aktif;
      var title = document.getElementById('blokJurnalFormTitle');
      if (title) title.textContent = 'Edit Blokir Jurnal';
      var lbl = document.getElementById('lblSimpanBlokJurnal');
      if (lbl) lbl.textContent = 'Simpan Perubahan';
      var panel = document.getElementById('blokJurnalFormPanel');
      if (panel) {
        panel.classList.remove('hidden');
        panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function blokJurnal_batalForm() {
      var panel = document.getElementById('blokJurnalFormPanel');
      if (panel) panel.classList.add('hidden');
    }

    function blokJurnal_simpan() {
      var token = localStorage.getItem('auth_token');
      var id = document.getElementById('blokJurnalId').value.trim();
      var mapel = document.getElementById('blokJurnalMapel').value.trim();
      var mulai = document.getElementById('blokJurnalTglMulai').value.trim();
      var selesai = document.getElementById('blokJurnalTglSelesai').value.trim();
      var pesan = document.getElementById('blokJurnalPesan').value.trim();
      var aktif = document.getElementById('blokJurnalAktif').checked;
      if (!mapel) { showToast('Mata pelajaran wajib dipilih.', 'error'); return; }
      if (!mulai) { showToast('Tanggal mulai wajib diisi.', 'error'); return; }
      if (!selesai) { showToast('Tanggal selesai wajib diisi.', 'error'); return; }
      if (selesai < mulai) { showToast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'error'); return; }
      if (!pesan) { showToast('Pesan untuk guru wajib diisi.', 'error'); return; }
      var btn = document.getElementById('btnSimpanBlokJurnal');
      var lbl = document.getElementById('lblSimpanBlokJurnal');
      var origLabel = lbl ? lbl.textContent : 'Simpan';
      if (btn) btn.disabled = true;
      if (lbl) lbl.textContent = 'Menyimpan...';
      var payload = { id: id || null, mataPelajaran: mapel, tanggalMulai: mulai, tanggalSelesai: selesai, pesan: pesan, aktif: aktif };
      google.script.run
        .withSuccessHandler(function(res) {
          if (btn) btn.disabled = false;
          if (lbl) lbl.textContent = origLabel;
          if (res && res.status === 'success') {
            showToast(id ? 'Blokir jurnal diperbarui.' : 'Blokir jurnal ditambahkan.', 'success');
            blokJurnal_batalForm();
            initBlokJurnal();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan.', 'error');
          }
        })
        .withFailureHandler(function() {
          if (btn) btn.disabled = false;
          if (lbl) lbl.textContent = origLabel;
          showToast('Koneksi gagal.', 'error');
        })
        .simpanBlokJurnal(token, payload);
    }

    function blokJurnal_hapus(id, btnEl) {
      if (!id) return;
      showConfirm('Hapus Blokir Jurnal', 'Hapus aturan blokir ini? Tindakan tidak dapat dibatalkan.', function() {
        var token = localStorage.getItem('auth_token');
        var origHTML = btnEl ? btnEl.innerHTML : '';
        if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '...'; }
        google.script.run
          .withSuccessHandler(function(res) {
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
            if (res && res.status === 'success') {
              showToast('Blokir jurnal dihapus.', 'success');
              initBlokJurnal();
            } else {
              showToast((res && res.message) || 'Gagal menghapus.', 'error');
            }
          })
          .withFailureHandler(function() {
            if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
            showToast('Koneksi gagal.', 'error');
          })
          .hapusBlokJurnal(token, id);
      }, { type: 'danger' });
    }
  // ============================================================
  // BLOKIR ACARA — ADMIN PANEL
  // ============================================================
  