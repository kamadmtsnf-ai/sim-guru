var _blokTransportData = [];

  function initBlokTransport() {
    var token = localStorage.getItem('auth_token');
    var tbody = document.getElementById('tbodyBlokTransport');
    if (tbody) tbody.innerHTML = skeletonTableRows(4, 5);
    google.script.run
      .withSuccessHandler(function(res) {
        if (res && res.status === 'success') {
          _blokTransportData = res.data || [];
          renderBlokTransportTable(_blokTransportData);
        } else {
          if (tbody) tbody.innerHTML = errorTableRows(4, escapeHtml((res && res.message) || 'Gagal memuat data.'), 'initBlokTransport()');
          showToast((res && res.message) || 'Gagal memuat data blokir transport.', 'error');
        }
      })
      .withFailureHandler(function() {
        if (tbody) tbody.innerHTML = errorTableRows(4, 'Koneksi gagal. Periksa koneksi internet Anda.', 'initBlokTransport()');
        showToast('Koneksi gagal.', 'error');
      })
      .getBlokTransport(token);
  }

  function renderBlokTransportTable(data) {
    var tbody = document.getElementById('tbodyBlokTransport');
    if (!tbody) return;
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="py-10 text-center settings-cell-empty"><div class="flex flex-col items-center gap-2"><div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto"><svg class="w-6 h-6 text-rose-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM3 6h13l4 6v5H3V6z"/></svg></div><p class="text-sm font-semibold text-slate-500">Belum ada aturan blokir transportasi.</p><p class="text-xs text-slate-400">Klik Tambah Blokir untuk menambah aturan baru.</p></div></td></tr>';
      return;
    }
    tbody.innerHTML = data.map(function(r, idx) {
      var safeId = escapeHtml(r.id);
      var tglMulaiStr = String(r.tanggalMulai || '').trim();
      var tglSelesaiStr = String(r.tanggalSelesai || '').trim();
      var safePeriode = escapeHtml(
        tglMulaiStr === tglSelesaiStr
          ? fmtTglBlok(r.tanggalMulai)
          : fmtTglBlok(r.tanggalMulai) + ' \u2013 ' + fmtTglBlok(r.tanggalSelesai)
      );
      var safeKeterangan = escapeHtml(r.keterangan || '-');
      var aktifBadge = r.aktif
        ? '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-full">Aktif</span>'
        : '<span class="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium px-2.5 py-1 rounded-full">Nonaktif</span>';
      return '<tr class="border-b hover:bg-slate-50 transition-colors group">'
        + '<td class="px-4 py-3 text-slate-600 text-sm tabular-nums whitespace-nowrap" data-label="Periode"><span class="settings-mobile-value">' + safePeriode + '</span></td>'
        + '<td class="px-4 py-3 text-slate-500 text-sm max-w-xs" data-label="Keterangan"><span class="settings-mobile-value line-clamp-2" title="' + safeKeterangan + '">' + safeKeterangan + '</span></td>'
        + '<td class="px-4 py-3 text-center" data-label="Status"><span class="settings-mobile-value">' + aktifBadge + '</span></td>'
        + '<td class="px-4 py-3 settings-cell-actions"><div class="flex items-center justify-center gap-1.5">'
        + actionBtn('edit', 'blokTransport_editForm(' + idx + ')', 'Edit')
        + actionBtn('delete', "blokTransport_hapus('" + safeId + "', this)", 'Hapus')
        + '</div></td>'
        + '</tr>';
    }).join('');
  }

  function blokTransport_openForm() {
    document.getElementById('blokTransportId').value = '';
    document.getElementById('blokTransportTglMulai').value = '';
    document.getElementById('blokTransportTglSelesai').value = '';
    document.getElementById('blokTransportKeterangan').value = '';
    document.getElementById('blokTransportAktif').checked = true;
    var title = document.getElementById('blokTransportFormTitle');
    if (title) title.textContent = 'Tambah Blokir Baru';
    var lbl = document.getElementById('lblSimpanBlokTransport');
    if (lbl) lbl.textContent = 'Simpan';
    var panel = document.getElementById('blokTransportFormPanel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function blokTransport_editForm(idx) {
    var r = _blokTransportData[idx];
    if (!r) return;
    document.getElementById('blokTransportId').value = r.id;
    document.getElementById('blokTransportTglMulai').value = sanitizeDateForInput(r.tanggalMulai);
    document.getElementById('blokTransportTglSelesai').value = sanitizeDateForInput(r.tanggalSelesai);
    document.getElementById('blokTransportKeterangan').value = r.keterangan || '';
    document.getElementById('blokTransportAktif').checked = r.aktif;
    var title = document.getElementById('blokTransportFormTitle');
    if (title) title.textContent = 'Edit Blokir Transport';
    var lbl = document.getElementById('lblSimpanBlokTransport');
    if (lbl) lbl.textContent = 'Simpan Perubahan';
    var panel = document.getElementById('blokTransportFormPanel');
    if (panel) {
      panel.classList.remove('hidden');
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function blokTransport_batalForm() {
    var panel = document.getElementById('blokTransportFormPanel');
    if (panel) panel.classList.add('hidden');
  }

  function blokTransport_simpan() {
    var token = localStorage.getItem('auth_token');
    var id = document.getElementById('blokTransportId').value.trim();
    var mulai = document.getElementById('blokTransportTglMulai').value.trim();
    var selesai = document.getElementById('blokTransportTglSelesai').value.trim();
    var keterangan = document.getElementById('blokTransportKeterangan').value.trim();
    var aktif = document.getElementById('blokTransportAktif').checked;
    if (!mulai) { showToast('Tanggal mulai wajib diisi.', 'error'); return; }
    if (!selesai) { showToast('Tanggal selesai wajib diisi.', 'error'); return; }
    if (selesai < mulai) { showToast('Tanggal selesai tidak boleh sebelum tanggal mulai.', 'error'); return; }
    if (!keterangan) { showToast('Keterangan wajib diisi.', 'error'); return; }
    var btn = document.getElementById('btnSimpanBlokTransport');
    var lbl = document.getElementById('lblSimpanBlokTransport');
    var origLabel = lbl ? lbl.textContent : 'Simpan';
    var iconEl = document.getElementById('iconSimpanBlokTransport');
    var spinnerEl = document.getElementById('spinnerSimpanBlokTransport');
    if (btn) btn.disabled = true;
    if (lbl) lbl.textContent = 'Menyimpan...';
    if (iconEl) iconEl.classList.add('hidden');
    if (spinnerEl) spinnerEl.classList.remove('hidden');
    var payload = { id: id || null, tanggalMulai: mulai, tanggalSelesai: selesai, keterangan: keterangan, aktif: aktif };
    google.script.run
      .withSuccessHandler(function(res) {
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = origLabel;
        if (iconEl) iconEl.classList.remove('hidden');
        if (spinnerEl) spinnerEl.classList.add('hidden');
        if (res && res.status === 'success') {
          showToast(id ? 'Blokir transport diperbarui.' : 'Blokir transport ditambahkan.', 'success');
          blokTransport_batalForm();
          initBlokTransport();
        } else {
          showToast((res && res.message) || 'Gagal menyimpan.', 'error');
        }
      })
      .withFailureHandler(function() {
        if (btn) btn.disabled = false;
        if (lbl) lbl.textContent = origLabel;
        if (iconEl) iconEl.classList.remove('hidden');
        if (spinnerEl) spinnerEl.classList.add('hidden');
        showToast('Koneksi gagal.', 'error');
      })
      .simpanBlokTransport(token, payload);
  }

  function blokTransport_hapus(id, btnEl) {
    if (!id) return;
    showConfirm('Hapus Blokir Transport', 'Hapus aturan blokir transportasi ini? Tindakan tidak dapat dibatalkan.', function() {
      var token = localStorage.getItem('auth_token');
      var origHTML = btnEl ? btnEl.innerHTML : '';
      if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '...'; }
      google.script.run
        .withSuccessHandler(function(res) {
          if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
          if (res && res.status === 'success') {
            showToast('Blokir transport dihapus.', 'success');
            initBlokTransport();
          } else {
            showToast((res && res.message) || 'Gagal menghapus.', 'error');
          }
        })
        .withFailureHandler(function() {
          if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = origHTML; }
          showToast('Koneksi gagal.', 'error');
        })
        .hapusBlokTransport(token, id);
    }, { type: 'danger' });
  }
