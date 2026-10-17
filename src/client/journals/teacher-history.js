let currentGuruJournalPage = 1;
    let currentGuruJournalLimit = 10;
    let guruJournalTotalItems = 0;
    let guruJournalTotalPages = 1;
    let _guruJournalCache = [];
    let _guruJournalSearchTimer = null;
    let _adminJournalSearchTimer = null;
    function _todayISO() { return new Date().toISOString().split('T')[0]; }
    function _addDaysISO(days) {
      const d = new Date(); d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    }
    function _firstOfMonthISO() {
      const d = new Date(); d.setDate(1);
      return d.toISOString().split('T')[0];
    }
    function _renderJournalFilterSummary(targetId, parts) {
      const el = document.getElementById(targetId);
      if (!el) return;
      if (!parts || !parts.length) { el.classList.add('hidden'); el.innerHTML = ''; return; }
      el.classList.remove('hidden');
      const chips = parts.map(p => `<span class="jrn-chip">${escapeHtml(p)}</span>`).join('');
      el.innerHTML = `
      <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
      <strong>Filter aktif:</strong> ${chips}
    `;
    }
    function onGuruJournalSearchInput() {
      if (_guruJournalSearchTimer) clearTimeout(_guruJournalSearchTimer);
      _guruJournalSearchTimer = setTimeout(filterGuruJournalTable, 300);
    }
    function filterGuruJournalTable() {
      currentGuruJournalPage = 1;
      const token = localStorage.getItem('auth_token');
      loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
    }
    function setGuruJournalQuickRange(kind) {
      const fromEl = document.getElementById('jrnGuruFilterDateFrom');
      const toEl = document.getElementById('jrnGuruFilterDateTo');
      if (!fromEl || !toEl) return;
      if (kind === 'month') {
        fromEl.value = _firstOfMonthISO();
        toEl.value = _todayISO();
      } else {
        const days = parseInt(kind, 10) || 7;
        fromEl.value = _addDaysISO(-(days - 1));
        toEl.value = _todayISO();
      }
      document.querySelectorAll('#jrnGuruQuickRange button').forEach(b => b.classList.toggle('active', String(b.dataset.range) === String(kind)));
      filterGuruJournalTable();
    }
    function resetGuruJournalFilter() {
      const fromEl = document.getElementById('jrnGuruFilterDateFrom');
      const toEl = document.getElementById('jrnGuruFilterDateTo');
      const search = document.getElementById('jrnGuruSearch');
      if (fromEl) fromEl.value = '';
      if (toEl) toEl.value = '';
      if (search) search.value = '';
      document.querySelectorAll('#jrnGuruQuickRange button').forEach(b => b.classList.remove('active'));
      filterGuruJournalTable();
    }
    function _renderAttendanceBar(present, absent) {
      const total = (Number(present) || 0) + (Number(absent) || 0);
      if (total === 0) return '<span class="text-slate-300 text-xs">—</span>';
      const pct = Math.round((Number(present) * 100) / total);
      return `
      <div title="${pct}% hadir" style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;min-width:60px;">
        <div class="jrn-attbar" style="width:80px;margin-top:0;">
          <span style="background:#10B981;width:${pct}%;"></span>
          <span style="background:#F43F5E;width:${100 - pct}%;"></span>
        </div>
        <span class="jrn-mono" style="font-size:10.5px;font-weight:700;color:${pct >= 80 ? '#059669' : pct >= 50 ? '#D97706' : '#E11D48'};">${pct}%</span>
      </div>`;
    }
    function loadGuruJournalDataPaginated(token, page, limit) {
      const tbody = document.getElementById('journalTableBody');
      const lblTotal = document.getElementById('lblTotalLogs');
      if (!tbody) return;
      tbody.innerHTML = skeletonTableRows(8, 5);
      const fDateFrom = (document.getElementById('jrnGuruFilterDateFrom')?.value || '').trim();
      const fDateTo = (document.getElementById('jrnGuruFilterDateTo')?.value || '').trim();
      const fSearch = (document.getElementById('jrnGuruSearch')?.value || '').trim();
      google.script.run.withSuccessHandler((res) => {
        if (res && res.status === 'success') {
          const history = res.data || [];
          const pagination = res.pagination || {};
          const stats = res.stats || {};
          currentGuruJournalPage = pagination.current_page || 1;
          guruJournalTotalItems = pagination.total_items || 0;
          guruJournalTotalPages = pagination.total_pages || 1;
          currentGuruJournalLimit = pagination.items_per_page || limit;
          if (lblTotal) lblTotal.innerText = (pagination.total_items || 0).toLocaleString('id-ID');
          setText('jrnStatMonth', stats.total_this_month != null ? stats.total_this_month : '-');
          setText('jrnStatJtm', stats.total_jtm_all != null ? stats.total_jtm_all : '-');
          setText('jrnStatAttRate', stats.att_rate_all != null ? (stats.att_rate_all + '%') : '—');
          renderGuruJournalTable(history);
          renderGuruJournalPagination(pagination);
          const parts = [];
          if (fSearch) parts.push('Cari: "' + fSearch + '"');
          if (fDateFrom) parts.push('Dari: ' + fDateFrom);
          if (fDateTo) parts.push('Sampai: ' + fDateTo);
          _renderJournalFilterSummary('jrnGuruFilterSummary', parts);
        } else {
          tbody.innerHTML = errorTableRows(8, (res && res.message) || 'Gagal memuat data jurnal.', `loadGuruJournalDataPaginated(localStorage.getItem('auth_token'), ${page}, ${limit})`);
        }
      }).withFailureHandler((err) => {
        tbody.innerHTML = errorTableRows(8, 'Koneksi gagal: ' + err, `loadGuruJournalDataPaginated(localStorage.getItem('auth_token'), ${page}, ${limit})`);
      }).getGuruJournalHistoryPaginated(token, page, limit, fDateFrom || null, fDateTo || null, fSearch || null);
    }
    function renderGuruJournalTable(history) {
      _guruJournalCache = history || [];
      const tbody = document.getElementById('journalTableBody');
      if (!tbody) return;
      if (!history || history.length === 0) {
        tbody.innerHTML = `
        <tr><td colspan="9">
          <div class="jrn-empty">
            <div class="jrn-empty-icon">
              <svg width="32" height="32" fill="none" stroke="#6366F1" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p>Belum ada jurnal</p>
            <span>Aktivitas mengajar Anda akan muncul di sini</span>
          </div>
        </td></tr>`;
        setText('jrnStatTotal', guruJournalTotalItems || 0);
        return;
      }
      let html = '';
      history.forEach((h, idx) => {
        const isAuto = h.materi && String(h.materi).indexOf('[LIBUR:') !== -1;
        const dateFormatted = formatDateID(h.date);
        const dateParts = dateFormatted.split(' ');
        const dateShort = dateParts.length >= 2 ? `${dateParts[0]} ${dateParts[1]}` : dateFormatted;
        const dateYear = dateParts[2] || '';
        const matEsc = escapeHtml(h.materi || '-');
        const cls = escapeHtml(h.class_name || '-');
        const subj = escapeHtml(h.subject || '-');
        const time = escapeHtml(h.time || '-');
        html += `
        <tr style="${isAuto ? 'background:#FAFAFF;' : ''}" class="jrn-fadein" data-jrn-idx="${idx}">
          <td class="pl-5">
            <p style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(dateShort)}</p>
            <p style="font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">${escapeHtml(dateYear)}</p>
          </td>
          <td>
            <span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:600;color:#4338CA;background:#EEF2FF;padding:3px 8px;border-radius:6px;border:1px solid #C7D2FE;">${time}</span>
          </td>
          <td>
            <p style="font-weight:700;font-size:13px;color:${isAuto ? '#7C3AED' : '#312E81'};">${cls}</p>
            <p style="font-size:11px;color:${isAuto ? '#A78BFA' : '#6B7280'};margin-top:1px;">${subj}</p>
          </td>
          <td class="jrn-cell-clip" style="max-width:240px;font-size:12.5px;color:${isAuto ? '#7C3AED' : '#374151'};font-style:${isAuto ? 'italic' : 'normal'};" title="${matEsc}">
            ${isAuto ? '🎉 ' : ''}${matEsc}
            ${isAuto ? '<span class="jrn-badge jrn-badge-purple jrn-auto-badge" style="margin-left:6px;">AUTO</span>' : ''}
          </td>
          <td style="text-align:center;">
            <span class="jrn-badge ${isAuto ? 'jrn-badge-purple' : 'jrn-badge-emerald'}">${escapeHtml(String(h.students || 0))}</span>
          </td>
          <td style="text-align:center;">
            <span class="jrn-badge ${isAuto ? 'jrn-badge-purple' : 'jrn-badge-rose'}">${escapeHtml(String(h.students_absent || 0))}</span>
          </td>
          <td style="text-align:center;">
            ${_renderAttendanceBar(h.students || 0, h.students_absent || 0)}
          </td>
          <td style="text-align:center;">
            ${h.input_type === 'H_MINUS_1'
              ? '<span class="jrn-badge jrn-badge-amber">H-1 (80%)</span>'
              : (isAuto ? '' : '<span class="jrn-badge jrn-badge-emerald">Hari H</span>')}
          </td>
          <td class="pr-5" style="text-align:center;">
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
              <button onclick="openViewJournalByCacheIdx('guru', ${idx})" class="jrn-icon-btn jrn-icon-btn-view" title="Lihat Detail">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
              ${!isAuto ? `<button onclick="editGuruJournalAction(${idx})" class="jrn-icon-btn jrn-icon-btn-edit" title="Edit Jurnal">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="deleteJournalAction('${escapeHtml(h.log_id)}')" class="jrn-icon-btn jrn-icon-btn-delete" title="Hapus Jurnal">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>` : ''}
            </div>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
      setText('jrnStatTotal', guruJournalTotalItems || history.length);
      setTimeout(_fixMobileLayouts, 80);
    }
    function openViewJournalByCacheIdx(scope, idx) {
      const cache = scope === 'admin' ? _adminJournalCache : _guruJournalCache;
      const h = cache[idx];
      if (!h) return;
      const data = scope === 'admin' ? {
        log_id: h.log_id,
        date: formatDateID(h.date),
        date_iso: h.date,
        time: formatTimeID(h.time),
        class_name: h.class_name,
        subject: h.subject,
        materi: h.materi,
        students: h.students_present,
        students_present: h.students_present,
        students_absent: h.students_absent,
        notes: h.notes || '',
        clean_notes: h.notes || '-',
        jtm_val: h.jtm_val || 0,
        guru_name: h.guru_name
      } : {
        log_id: h.log_id,
        date: formatDateID(h.date),
        date_iso: h.date,
        time: h.time,
        class_name: h.class_name,
        subject: h.subject,
        materi: h.materi,
        students: h.students,
        students_absent: h.students_absent,
        notes: h.notes || '',
        clean_notes: h.clean_notes || '-',
        jtm_val: h.jtm_val || 0
      };
      _openViewJournalWithObject(data);
    }
    function renderGuruJournalPagination(pagination) {
      _renderPagination({
        pagination: pagination,
        itemsPerPage: currentGuruJournalLimit,
        btnFirstId: 'btnFirstGuruJournal',
        btnPrevId: 'btnPrevGuruJournal',
        btnNextId: 'btnNextGuruJournal',
        btnLastId: 'btnLastGuruJournal',
        pageNumsId: 'guruJournalPageNumbers',
        jumpId: 'inpGuruJournalJump',
        lblStartId: 'txtGuruJournalStart',
        lblEndId: 'txtGuruJournalEnd',
        lblTotalId: 'txtGuruJournalTotal',
        gotoFnName: 'guruJournalGoToPage'
      });
      setTimeout(_fixMobileLayouts, 50);
    }
    function _renderPagination(opts) {
      const p = opts.pagination || {};
      const current = p.current_page || 1;
      const total = p.total_pages || 1;
      const items = p.total_items || 0;
      const ipp = p.items_per_page || opts.itemsPerPage || 10;
      const startItem = items === 0 ? 0 : ((current - 1) * ipp) + 1;
      const endItem = Math.min(current * ipp, items);
      setText(opts.lblStartId, startItem.toLocaleString('id-ID'));
      setText(opts.lblEndId, endItem.toLocaleString('id-ID'));
      setText(opts.lblTotalId, items.toLocaleString('id-ID'));
      const jumpInput = document.getElementById(opts.jumpId);
      if (jumpInput) jumpInput.max = total;
      const btnFirst = document.getElementById(opts.btnFirstId);
      const btnPrev = document.getElementById(opts.btnPrevId);
      const btnNext = document.getElementById(opts.btnNextId);
      const btnLast = document.getElementById(opts.btnLastId);
      if (btnFirst) btnFirst.disabled = current <= 1;
      if (btnPrev) btnPrev.disabled = current <= 1;
      if (btnNext) btnNext.disabled = current >= total;
      if (btnLast) btnLast.disabled = current >= total;
      const pageNumsContainer = document.getElementById(opts.pageNumsId);
      if (!pageNumsContainer) return;
      pageNumsContainer.innerHTML = generatePageNumbers(current, total, opts.gotoFnName);
    }
    function generatePageNumbers(current, total, gotoFnName) {
      let html = '';
      const maxVisible = 5;
      let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
      let endPage = Math.min(total, startPage + maxVisible - 1);
      if (endPage - startPage < maxVisible - 1) {
        startPage = Math.max(1, endPage - maxVisible + 1);
      }
      if (startPage > 1) {
        html += createPageButton(1, current === 1, gotoFnName);
        if (startPage > 2) html += `<span class="px-2 text-slate-400">...</span>`;
      }
      for (let i = startPage; i <= endPage; i++) {
        html += createPageButton(i, i === current, gotoFnName);
      }
      if (endPage < total) {
        if (endPage < total - 1) html += `<span class="px-2 text-slate-400">...</span>`;
        html += createPageButton(total, current === total, gotoFnName);
      }
      return html;
    }
    function createPageButton(page, isActive, gotoFnName) {
      const cls = "jrn-pag-btn" + (isActive ? " active" : "");
      return `<button class="${cls}" onclick="window.${gotoFnName}(${page})">${page}</button>`;
    }
    window.guruJournalGoToPage = function (page) {
      currentGuruJournalPage = page;
      const token = localStorage.getItem('auth_token');
      loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
    };
    function changeGuruJournalPage(direction) {
      const token = localStorage.getItem('auth_token');
      if (direction === 'first') {
        currentGuruJournalPage = 1;
      } else if (direction === 'last') {
        currentGuruJournalPage = guruJournalTotalPages;
      } else {
        const newPage = currentGuruJournalPage + direction;
        if (newPage < 1 || newPage > guruJournalTotalPages) return;
        currentGuruJournalPage = newPage;
      }
      loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
    }
    function changeGuruJournalLimit() {
      const sel = document.getElementById('selGuruJournalLimit');
      if (!sel) return;
      currentGuruJournalLimit = parseInt(sel.value, 10) || 10;
      currentGuruJournalPage = 1;
      const token = localStorage.getItem('auth_token');
      loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
    }
    function jumpToGuruJournalPage() {
      const input = document.getElementById('inpGuruJournalJump');
      if (!input) return;
      const page = parseInt(input.value, 10);
      if (isNaN(page) || page < 1 || page > guruJournalTotalPages) {
        showToast(`Halaman harus antara 1 dan ${guruJournalTotalPages}`, 'error');
        return;
      }
      currentGuruJournalPage = page;
      const token = localStorage.getItem('auth_token');
      loadGuruJournalDataPaginated(token, currentGuruJournalPage, currentGuruJournalLimit);
      input.value = '';
    }
    