function exportJournalPDF() {
      var btn = document.querySelector('.jrn-action-btn-primary');
      var originalHTML = btn ? btn.innerHTML : '';
      var element = document.getElementById('printAreaJournal');
      if (!element) return showToast('Elemen jurnal tidak ditemukan.', 'error');
      var dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
      var filename = 'Laporan_Jurnal_Mengajar_' + dateStr + '.pdf';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
          '<circle cx="12" cy="12" r="10" stroke-width="4" style="opacity:.25"/>' +
          '<path d="M4 12a8 8 0 018-8" stroke-width="4" style="opacity:.75"/></svg> Memproses...';
      }
      showToast('Menyiapkan PDF jurnal...', 'info');
      var headerEl = document.getElementById('headerJournalPrint');
      var headerMetaEl = document.getElementById('headerJournalPrintMeta');
      var paginationEl = document.getElementById('adminJournalFooter');
      var actionCells = element.querySelectorAll('[data-html2canvas-ignore="true"]');
      var summaryEl = document.getElementById('jrnAdminFilterSummary');
      if (headerEl) headerEl.classList.remove('hidden');
      if (headerMetaEl) {
        const role = localStorage.getItem('user_name') || '';
        const meta = [];
        meta.push('Dicetak: ' + new Date().toLocaleString('id-ID'));
        if (role) meta.push('Oleh: ' + role);
        headerMetaEl.innerText = meta.join('  ·  ');
      }
      if (paginationEl) paginationEl.style.display = 'none';
      actionCells.forEach(function (cell) { cell.style.display = 'none'; });
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
      var tableScroll = element.querySelector('.overflow-x-auto');
      if (tableScroll) {
        savedStyles.push({
          el: tableScroll,
          overflow: tableScroll.style.overflow,
          overflowY: tableScroll.style.overflowY,
          overflowX: tableScroll.style.overflowX,
          maxHeight: tableScroll.style.maxHeight
        });
        tableScroll.style.overflow = 'visible';
        tableScroll.style.overflowY = 'visible';
        tableScroll.style.overflowX = 'visible';
        tableScroll.style.maxHeight = 'none';
      }
      function _restore() {
        savedStyles.forEach(function (s) {
          s.el.style.overflow = s.overflow;
          s.el.style.overflowY = s.overflowY;
          s.el.style.overflowX = s.overflowX;
          s.el.style.maxHeight = s.maxHeight;
        });
        if (headerEl) headerEl.classList.add('hidden');
        if (paginationEl) paginationEl.style.display = '';
        actionCells.forEach(function (cell) { cell.style.display = ''; });
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = originalHTML;
        }
      }
      var opt = {
        margin: [8, 8, 8, 8],
        filename: filename,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: 2,
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
          orientation: 'landscape'
        }
      };
      html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(function () {
          _restore();
          showToast('PDF jurnal berhasil diunduh!', 'success');
        })
        .catch(function (err) {
          _restore();
          showToast('Gagal membuat PDF: ' + err, 'error');
        });
    }
    