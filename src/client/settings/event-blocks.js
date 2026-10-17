var _blokAcaraData = [];

  function initBlokAcara() {
    var token = localStorage.getItem('auth_token');
    var tbody = document.getElementById('tbodyBlokAcara');
    if (tbody) tbody.innerHTML = skeletonTableRows(5, 4);
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.status === 'success') {
          _blokAcaraData = res.data || [];
          renderBlokAcaraTable(_blokAcaraData);
        } else {
          if (tbody) tbody.innerHTML = errorTableRows(5, escapeHtml((res && res.message) || 'Gagal memuat data.'), 'initBlokAcara()');
          showToast((res && res.message) || 'Gagal memuat data blokir acara.', 'error');
        }
      })
      .withFailureHandler(function() {
        if (tbody) tbody.innerHTML = errorTableRows(5, 'Koneksi gagal. Periksa koneksi internet Anda.', 'initBlokAcara()');
        showToast('Koneksi gagal.', 'error');
      })
      .getBlokAcara(token);
  }

  function renderBlokAcaraTable(data) {
    var tbody = document.getElementById('tbodyBlokAcara');
    if (!tbody) return;
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="py-10 text-center settings-cell-empty"><div class="flex flex-col items-center gap-2"><div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto"><svg class="w-6 h-6 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg></div><p class="text-sm font-semibold text-slate-500">Belum ada aturan blokir jurnal acara</p><p class="text-xs text-slate-400">Klik &quot;Tambah Blokir&quot; untuk menambahkan aturan pertama.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = data.map(function(r, idx) {
      var safeId = escapeHtml(r.id);
      var safeTipe = escapeHtml(r.tipeAcara);
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
      var tipeBadge = r.tipeAcara === 'SEMUA'
        ? '<span class="inline-flex items-center bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg">\uD83D\uDD12 SEMUA</span>'
        : ('<span class="inline-flex items-center bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold px-2 py-0.5 rounded-lg capitalize">' + safeTipe + '</span>');
      return '<tr class="border-b hover:bg-slate-50 transition-colors group">'
        + '<td class="px-4 py-3 font-medium text-slate-700" data-label="Tipe Acara"><span class="settings-mobile-value">' + tipeBadge + '</span></td>'
        + '<td class="px-4 py-3 text-slate-600 text-sm tabular-nums whitespace-nowrap" data-label="Periode"><span class="settings-mobile-value">' + safePeriode + '</span></td>'
        + '<td class="px-4 py-3 text-slate-500 text-sm max-w-xs" data-label="Pesan"><span class="settings-mobile-value line-clamp-2" title="' + safePesan + '">' + safePesan + '</span></td>'
        + '<td class="px-4 py-3 text-center" data-label="Status"><span class="settings-mobile-value">' + aktifBadge + '</span></td>'
        + '<td class="px-4 py-3 settings-cell-actions"><div class="flex items-center justify-center gap-1.5">'
        + actionBtn('edit', 'blokAcara_editForm(' + idx + ')', 'Edit')
        + actionBtn('delete', "blokAcara_hapus('" + safeId + "', this)", 'Hapus')
        + '</div></td>'
        + '</tr>';
    }).join('');
  }

  function blokAcara_openForm() {
    document.getElementById('blokAcaraId').value = '';
    document.getElementById('blokAcaraTipe').value = '';
    document.getElementById('blokAcaraTglMulai').value = '';
    document.getElementById('blokAcaraTglSelesai').value = '';
    document.getElementById('blokAcaraPesan').value = '';
    document.getElementById('blokAcaraAktif').checked = true;
    var title = document.getElementById('blokAcaraFormTitle');
    if (title) title.textContent = 'Tambah Blokir Baru';
    var lbl = document.getElementById('lblSimpanBlokAcara');
    if (lbl) lbl.textContent = 'Simpan';
    var panel = document.getElementById('blokAcaraFormPanel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function blokAcara_editForm(idx) {
    var r = _blokAcaraData[idx];
    if (!r) return;
    document.getElementById('blokAcaraId').value = r.id;
    document.getElementById('blokAcaraTipe').value = r.tipeAcara;
    document.getElementById('blokAcaraTglMulai').value = sanitizeDateForInput(r.tanggalMulai);
    document.getElementById('blokAcaraTglSelesai').value = sanitizeDateForInput(r.tanggalSelesai);
    document.getElementById('blokAcaraPesan').value = r.pesan;
    document.getElementById('blokAcaraAktif').checked = r.aktif;
    var title = document.getElementById('blokAcaraFormTitle');
    if (title) title.textContent = 'Edit Blokir Jurnal Acara';
    var lbl = document.getElementById('lblSimpanBlokAcara');
    if (lbl) lbl.textContent = 'Simpan Perubahan';
    var panel = document.getElementById('blokAcaraFormPanel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function blokAcara_batalForm() {
    var panel = document.getElementById('blokAcaraFormPanel');
    if (panel) panel.classList.add('hidden');
  }

  function blokAcara_simpan() {
    var token = localStorage.getItem('auth_token');
    var id = document.getElementById('blokAcaraId').value.trim();
    var tipe = document.getElementById('blokAcaraTipe').value.trim();
    var mulai = document.getElementById('blokAcaraTglMulai').value.trim();
    var selesai = document.getElementById('blokAcaraTglSelesai').value.trim();
    var pesan = document.getElementById('blokAcaraPesan').value.trim();
    var aktif = document.getElementById('blokAcaraAktif').checked;
    if (!tipe) { showToast('Tipe acara wajib dipilih.', 'error'); return; }
    if (!mulai) { showToast('Tanggal mulai wajib diisi.', 'error'); return; }
    if (!selesai) { showToast('Tanggal selesai wajib diisi.', 'error'); return; }
    if (selesai < mulai) { showToast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'error'); return; }
    if (!pesan) { showToast('Pesan untuk guru wajib diisi.', 'error'); return; }
    var btn = document.getElementById('btnSimpanBlokAcara');
    var lbl = document.getElementById('lblSimpanBlokAcara');
    var origLabel = lbl ? lbl.textContent : 'Simpan';
    if (btn) btn.disabled = true;
    if (lbl) lbl.textContent = 'Menyimpan...';
    var payload = { id: id || null, tipeAcara: tipe, tanggalMulai: mulai, tanggalSelesai: selesai, pesan: pesan, aktif: aktif };
    google.script.run
      .withSuccessHandler(function(res) {
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = origLabel;
        if (res && res.status === 'success') {
          showToast(id ? 'Blokir acara diperbarui.' : 'Blokir acara ditambahkan.', 'success');
          blokAcara_batalForm();
          initBlokAcara();
        } else {
          showToast((res && res.message) || 'Gagal menyimpan.', 'error');
        }
      })
      .withFailureHandler(function() {
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = origLabel;
        showToast('Koneksi gagal.', 'error');
      })
      .simpanBlokAcara(token, payload);
  }

  function blokAcara_hapus(id, btnEl) {
    if (!id) return;
    showConfirm('Hapus Blokir Acara', 'Hapus aturan blokir acara ini? Tindakan tidak dapat dibatalkan.', function() {
      var token = localStorage.getItem('auth_token');
      var origHTML = btnEl ? btnEl.innerHTML : '';
      if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '...'; }
      google.script.run
        .withSuccessHandler(function(res) {
          if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
          if (res && res.status === 'success') {
            showToast('Blokir acara dihapus.', 'success');
            initBlokAcara();
          } else {
            showToast((res && res.message) || 'Gagal menghapus.', 'error');
          }
        })
        .withFailureHandler(function() {
          if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
          showToast('Koneksi gagal.', 'error');
        })
        .hapusBlokAcara(token, id);
    }, { type: 'danger' });
  }

  // ============================================================
  // BLOKIR TRANSPORT — ADMIN PANEL
  // ============================================================
  