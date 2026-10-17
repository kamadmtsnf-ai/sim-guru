let currentSlipData = null;
    function showHonorSlip(periode, userId) {
      const modal = document.getElementById('slipModal');
      const slipContent = document.getElementById('slipContent');
      const exportBtn = document.getElementById('btnExportSlipPDF');
      const modalTitle = document.getElementById('slipModalTitle');
      const modalSubtitle = document.getElementById('slipModalSubtitle');
      if (!modal) return;
      currentSlipData = null;
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      if (modalTitle) modalTitle.textContent = 'Memuat Slip...';
      if (modalSubtitle) modalSubtitle.textContent = 'Periode: ' + (periode || '-');
      if (slipContent) {
        slipContent.innerHTML =
          '<div class="flex flex-col items-center justify-center gap-3 py-16">' +
          '<div class="animate-spin rounded-full h-10 w-10 border-2 border-blue-100 border-t-blue-600"></div>' +
          '<span class="text-slate-500 font-medium text-sm">Memuat slip honorarium...</span>' +
          '<span class="text-slate-400 text-xs">Menyiapkan data dari arsip</span>' +
          '</div>';
      }
      if (exportBtn) {
        exportBtn.classList.add('hidden');
        exportBtn.classList.remove('inline-flex');
      }
      const token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler((data) => {
          if (data && data.status === 'success') {
            currentSlipData = data;
            if (modalTitle) modalTitle.textContent = 'Slip Honorarium — ' + (data.guru_nama || '');
            if (modalSubtitle) modalSubtitle.textContent = 'Periode: ' + (data.periode || '-');
            renderSlipContent(data);
            if (exportBtn) {
              exportBtn.classList.remove('hidden');
              exportBtn.classList.add('inline-flex');
            }
          } else {
            if (modalTitle) modalTitle.textContent = 'Slip Honorarium';
            if (modalSubtitle) modalSubtitle.textContent = '';
            const msg = (data && data.message) ? data.message : 'Gagal memuat slip.';
            slipContent.innerHTML = `<div class="text-center py-12 px-4">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0L3.16 16.25A2 2 0 005 19z"/></svg>
            </div>
            <p class="font-bold text-slate-800 text-lg mb-1">Data Tidak Ditemukan</p>
            <p class="text-sm text-slate-500 max-w-sm mx-auto">${escapeHtml(msg)}</p>
            <p class="text-xs text-slate-400 mt-3">Periode: <strong>${escapeHtml(periode)}</strong></p>
          </div>`;
          }
        })
        .withFailureHandler((err) => {
          if (modalTitle) modalTitle.textContent = 'Slip Honorarium';
          if (modalSubtitle) modalSubtitle.textContent = '';
          slipContent.innerHTML = `<div class="text-center py-12 px-4">
          <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
            <svg class="w-8 h-8 text-rose-500" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-12.728 12.728M5.636 5.636l12.728 12.728"/></svg>
          </div>
          <p class="font-bold text-slate-800 text-lg mb-1">Koneksi Gagal</p>
          <p class="text-sm text-slate-500 break-words max-w-sm mx-auto">${escapeHtml(String(err))}</p>
        </div>`;
        })
        .getHonorariumSlipByHistory(token, periode, userId);
    }
    function renderSlipContent(data) {
      const slipContent = document.getElementById('slipContent');
      if (!slipContent) return;
      data = data || {};
      const allowanceRows = (data.allowance_list || []).map(a => `
      <tr class="hover:bg-blue-50/30 transition-colors">
        <td class="py-3 px-4 text-left font-medium text-slate-700">${escapeHtml(a.desc || '-')}</td>
        <td class="py-3 px-4 text-center text-slate-500">${escapeHtml(String(a.qty || ''))}</td>
        <td class="py-3 px-4 text-right text-slate-500">${escapeHtml(a.rate || '-')}</td>
        <td class="py-3 px-4 text-right font-bold text-slate-800">${escapeHtml(a.amount || 'Rp 0')}</td>
      </tr>
    `).join('');
      const trxId = String(data.trx_id || '-');
      const isFinal = trxId && trxId.indexOf('ESTIMASI') === -1 && trxId !== '-';
      slipContent.innerHTML = `
      <div id="printAreaSlipModal"
           class="bg-white border border-slate-200 rounded-xl p-4 sm:p-8 shadow-sm relative overflow-hidden w-full">
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] z-0 transform -rotate-45 ${isFinal ? 'hidden' : ''}">
          <span class="text-[60px] sm:text-[150px] font-black text-slate-900 uppercase">ESTIMASI</span>
        </div>
        <div class="relative z-10">
          <div class="border-b-2 border-slate-800 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div class="w-full">
              <h2 class="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-wide">SLIP HONORARIUM</h2>
              <p class="text-sm font-bold text-slate-600 mt-1 truncate">${escapeHtml(data.school_name || '-')}</p>
            </div>
            <div class="text-left sm:text-right w-full sm:w-auto flex-shrink-0">
              <h3 class="text-lg sm:text-xl font-bold text-slate-800">${escapeHtml(data.periode || '-')}</h3>
              ${isFinal
          ? '<p class="text-xs font-bold text-emerald-700 mt-1 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Siap Dibayarkan</p>'
          : '<p class="text-xs font-bold text-amber-700 mt-1 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>Estimasi</p>'}
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-8 text-sm">
            <div>
              <p class="text-slate-500 mb-1 text-xs uppercase font-bold tracking-wider">Penerima</p>
              <p class="font-bold text-lg text-slate-800 break-words">${escapeHtml(data.guru_nama || '-')}</p>
              <p class="text-slate-500 mt-2 mb-1 text-xs">NIP / NPK</p>
              <p class="font-mono text-slate-700 break-all">${escapeHtml(data.guru_nip || '-')}</p>
            </div>
            <div class="text-left sm:text-right">
              <p class="text-slate-500 mb-1 text-xs uppercase font-bold tracking-wider">Tanggal Cetak</p>
              <p class="font-bold text-slate-800">${escapeHtml(data.tgl_cetak || '-')}</p>
              <p class="text-slate-500 mt-2 mb-1 text-xs">ID Transaksi</p>
              <p class="font-mono text-xs text-slate-400 break-all">${escapeHtml(trxId)}</p>
            </div>
          </div>
          <div class="overflow-x-auto rounded-lg border border-slate-200 mb-8">
            <table class="w-full text-sm min-w-[500px]">
              <thead class="bg-slate-50 text-slate-600 uppercase text-xs font-bold border-b border-slate-200">
                <tr>
                  <th class="py-3 px-4 text-left">Keterangan</th>
                  <th class="py-3 px-4 text-center">Qty / JTM</th>
                  <th class="py-3 px-4 text-right">Tarif</th>
                  <th class="py-3 px-4 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody class="text-slate-700 divide-y divide-slate-100">
                <tr class="hover:bg-blue-50/30 transition-colors">
                  <td class="py-3 px-4 text-left font-medium text-slate-700">JTM Mengajar &amp; Tugas</td>
                  <td class="py-3 px-4 text-center text-slate-500">${escapeHtml(String(data.qty_real || 0))}</td>
                  <td class="py-3 px-4 text-right text-slate-500">${escapeHtml(data.tarif || '-')}</td>
                  <td class="py-3 px-4 text-right font-bold text-slate-800">${escapeHtml(data.total_real || 'Rp 0')}</td>
                </tr>
                <tr class="hover:bg-emerald-50/30 transition-colors">
                  <td class="py-3 px-4 text-left font-medium text-slate-700">JTM Kehadiran Acara</td>
                  <td class="py-3 px-4 text-center text-slate-500">${Number(data.jtm_event || 0)}</td>
                  <td class="py-3 px-4 text-right text-slate-500">${escapeHtml(data.tarif || '-')}</td>
                  <td class="py-3 px-4 text-right font-bold text-slate-800">${escapeHtml(data.jtm_event_amount || 'Rp 0')}</td>
                </tr>
                ${allowanceRows}
              </tbody>
            </table>
          </div>
          <div class="flex justify-end mb-12">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6 py-4 rounded-xl border border-blue-200 text-right w-full sm:min-w-[280px] sm:w-auto shadow-sm">
              <p class="text-xs text-blue-600 mb-1 font-bold uppercase tracking-wider">Total Diterima</p>
              <h3 class="text-2xl sm:text-3xl font-extrabold text-blue-700 tracking-tight">${escapeHtml(data.grand_total || 'Rp 0')}</h3>
            </div>
          </div>
          <div class="flex flex-col sm:flex-row justify-between items-end text-center mt-8 text-sm text-slate-600 gap-12 sm:gap-0">
            <div class="w-full sm:w-48 text-left sm:text-center">
              <p class="mb-16 text-xs text-slate-500">Penerima,</p>
              <p class="font-bold border-b border-slate-300 pb-1 text-slate-800 block w-full">${escapeHtml(data.guru_nama || '-')}</p>
            </div>
            <div class="w-full sm:w-48 text-left sm:text-center">
              <p class="mb-1 text-xs text-slate-500">Mengetahui,</p>
              <p class="mb-16 text-xs font-bold text-slate-700">Kepala ${escapeHtml(data.school_name || '-')}</p>
              <p class="font-bold border-b border-slate-300 pb-1 text-slate-800 uppercase block w-full">${escapeHtml(data.kepala_sekolah || '-')}</p>
            </div>
          </div>
          <div class="mt-8 pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span>Dicetak dari SiM-Guru oleh ${escapeHtml(data.printed_by || '-')}</span>
          </div>
        </div>
      </div>
    `;
    }
    function closeSlipModal() {
      const modal = document.getElementById('slipModal');
      if (modal) modal.classList.add('hidden');
      if (typeof _maybeReleaseBodyLock === 'function') {
        _maybeReleaseBodyLock();
      } else {
        document.body.classList.remove('overflow-hidden');
      }
      const exportBtn = document.getElementById('btnExportSlipPDF');
      if (exportBtn) {
        exportBtn.classList.add('hidden');
        exportBtn.classList.remove('inline-flex');
        exportBtn.disabled = false;
      }
      const modalSubtitle = document.getElementById('slipModalSubtitle');
      if (modalSubtitle) modalSubtitle.textContent = '';
      const slipContent = document.getElementById('slipContent');
      if (slipContent) {
        slipContent.innerHTML =
          '<div class="flex items-center justify-center gap-3 py-12">' +
          '<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>' +
          '<span class="text-slate-500 font-medium">Memuat slip honorarium...</span>' +
          '</div>';
      }
      currentSlipData = null;
    }
    function exportSlipToPDF() {
      if (!currentSlipData) return showToast('Data slip tidak tersedia.', 'error');
      const element = document.getElementById('printAreaSlipModal');
      if (!element) return showToast('Elemen slip tidak ditemukan. Pastikan slip sudah dimuat.', 'error');
      const rawName = (currentSlipData.guru_nama || 'Guru').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
      const rawPeriode = (currentSlipData.periode || 'Periode').replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
      const filename = 'Slip_Honor_' + rawName + '_' + rawPeriode + '.pdf';
      const btn = document.getElementById('btnExportSlipPDF');
      const originalHTML = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class=\"w-4 h-4 animate-spin\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"10\" stroke-width=\"4\" class=\"opacity-25\"/><path d=\"M4 12a8 8 0 018-8\" stroke-width=\"4\" class=\"opacity-75\"/></svg> Memproses...';
      }
      showToast('Menyiapkan PDF berkualitas tinggi...', 'info');
      var savedStyles = [];
      var el = element.parentElement;
      while (el && el !== document.body) {
        var cs = window.getComputedStyle(el);
        var ovf = cs.overflow + cs.overflowY + cs.overflowX;
        var hasClip = ovf.indexOf('hidden') !== -1 || ovf.indexOf('auto') !== -1 || ovf.indexOf('scroll') !== -1;
        var hasMaxH = el.style.maxHeight && el.style.maxHeight !== 'none' && el.style.maxHeight !== '';
        if (hasClip || hasMaxH) {
          savedStyles.push({
            el: el,
            overflow: el.style.overflow,
            overflowY: el.style.overflowY,
            overflowX: el.style.overflowX,
            maxHeight: el.style.maxHeight
          });
          el.style.overflow = 'visible';
          el.style.overflowY = 'visible';
          el.style.overflowX = 'visible';
          el.style.maxHeight = 'none';
        }
        el = el.parentElement;
      }
      function restoreStyles() {
        savedStyles.forEach(function (s) {
          s.el.style.overflow = s.overflow;
          s.el.style.overflowY = s.overflowY;
          s.el.style.overflowX = s.overflowX;
          s.el.style.maxHeight = s.maxHeight;
        });
      }
      var opt = {
        margin: [12, 10, 12, 10],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          logging: false,
          scrollY: -window.scrollY,
          scrollX: -window.scrollX,
          windowWidth: document.documentElement.scrollWidth,
          windowHeight: document.documentElement.scrollHeight
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(function () {
          restoreStyles();
          showToast('PDF berhasil diunduh!', 'success');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }
        })
        .catch(function (err) {
          restoreStyles();
          showToast('Gagal membuat PDF: ' + String(err), 'error');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalHTML;
          }
        });
    }
    