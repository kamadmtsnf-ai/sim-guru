let currentJournalPage = 1;
    const journalLimit = 10;
    let adminJournalTotalItems = 0;
    let adminJournalTotalPages = 1;
    let _adminJournalCache = [];
    function onAdminFilterInput() {
      if (_adminJournalSearchTimer) clearTimeout(_adminJournalSearchTimer);
      _adminJournalSearchTimer = setTimeout(filterAdminJournalTable, 300);
    }
    function setAdminJournalQuickRange(kind) {
      const fromEl = document.getElementById('jrnFilterDateFrom');
      const toEl = document.getElementById('jrnFilterDateTo');
      if (!fromEl || !toEl) return;
      if (kind === 'today') {
        const t = _todayISO();
        fromEl.value = t;
        toEl.value = t;
      } else if (kind === 'month') {
        fromEl.value = _firstOfMonthISO();
        toEl.value = _todayISO();
      } else {
        const days = parseInt(kind, 10) || 7;
        fromEl.value = _addDaysISO(-(days - 1));
        toEl.value = _todayISO();
      }
      document.querySelectorAll('#jrnAdminQuickRange button').forEach(b => b.classList.toggle('active', String(b.dataset.range) === String(kind)));
      filterAdminJournalTable();
    }
    function loadAdminJournalData(token, page) {
      const tbody = document.getElementById('tbodyAdminJournal');
      if (!tbody) return;
      tbody.innerHTML = skeletonTableRows(8, 5);
      const fDateFrom = (document.getElementById('jrnFilterDateFrom')?.value || '').trim();
      const fDateTo = (document.getElementById('jrnFilterDateTo')?.value || '').trim();
      const fGuru = (document.getElementById('jrnFilterGuru')?.value || '').trim();
      const fClass = (document.getElementById('jrnFilterClass')?.value || '').trim();
      google.script.run.withSuccessHandler((res) => {
        if (res && res.status === 'success') {
          const history = res.data || [];
          const pagination = res.pagination || {};
          const stats = res.stats || {};
          currentJournalPage = pagination.current_page || 1;
          adminJournalTotalItems = pagination.total_items || 0;
          adminJournalTotalPages = pagination.total_pages || 1;
          setText('jrnStatMonth', stats.total_this_month != null ? stats.total_this_month : '-');
          setText('jrnStatJtm', stats.total_jtm_all != null ? stats.total_jtm_all : '-');
          setText('jrnStatAttRate', stats.att_rate_all != null ? (stats.att_rate_all + '%') : '—');
          renderAdminJournalTable(history);
          renderAdminJournalPagination(pagination);
          const parts = [];
          if (fGuru) parts.push('Guru: ' + fGuru);
          if (fClass) parts.push('Kelas: ' + fClass);
          if (fDateFrom) parts.push('Dari: ' + fDateFrom);
          if (fDateTo) parts.push('Sampai: ' + fDateTo);
          _renderJournalFilterSummary('jrnAdminFilterSummary', parts);
        } else {
          tbody.innerHTML = errorTableRows(8, (res && res.message) || 'Gagal memuat data jurnal.', `loadAdminJournalData(localStorage.getItem('auth_token'), ${page})`);
        }
      }).withFailureHandler((err) => {
        tbody.innerHTML = errorTableRows(8, 'Koneksi gagal: ' + err, `loadAdminJournalData(localStorage.getItem('auth_token'), ${page})`);
      }).getAdminJournalHistory(token, page, journalLimit,
        fDateFrom || null, fDateTo || null,
        fGuru || null,
        fClass || null
      );
    }
    function renderAdminJournalTable(history) {
      _adminJournalCache = history || [];
      _renderAdminJournalRows(_adminJournalCache);
      setText('jrnStatTotal', adminJournalTotalItems || (history ? history.length : 0));
    }
    function _renderAdminJournalRows(history) {
      const tbody = document.getElementById('tbodyAdminJournal');
      if (!tbody) return;
      if (!history || history.length === 0) {
        tbody.innerHTML = `
        <tr><td colspan="9">
          <div class="jrn-empty">
            <div class="jrn-empty-icon">
              <svg width="32" height="32" fill="none" stroke="#6366F1" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <p>Tidak ada data jurnal</p>
            <span>Belum ada aktivitas mengajar yang tercatat</span>
          </div>
        </td></tr>`;
        return;
      }
      let html = '';
      history.forEach((h, idx) => {
        const initials = (h.guru_name || '?').split(' ').slice(0, 2).map(n => (n[0] || '?')).join('').toUpperCase();
        const dateFormatted = formatDateID(h.date);
        const dateParts = dateFormatted.split(' ');
        const dateShort = dateParts.length >= 2 ? `${dateParts[0]} ${dateParts[1]}` : dateFormatted;
        const dateYear = dateParts[2] || '';
        const matEsc = escapeHtml(h.materi || '-');
        const cls = escapeHtml(h.class_name || '-');
        const subj = escapeHtml(h.subject || '-');
        const guru = escapeHtml(h.guru_name || 'Unknown');
        const time = escapeHtml(formatTimeID(h.time) || '-');
        html += `
        <tr class="jrn-fadein" data-jrn-idx="${idx}">
          <td class="pl-5">
            <p style="font-weight:700;font-size:13px;color:#1E293B;">${escapeHtml(dateShort)}</p>
            <p style="font-size:11px;color:#94A3B8;font-family:'JetBrains Mono',monospace;">${escapeHtml(dateYear)}</p>
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;color:#4338CA;">${time}</span>
          </td>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#4338CA,#6366F1);color:white;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${escapeHtml(initials)}</div>
              <span style="font-weight:700;font-size:13px;color:#1D4ED8;">${guru}</span>
            </div>
          </td>
          <td>
            <span style="display:inline-block;background:#EEF2FF;color:#3730A3;border:1px solid #C7D2FE;padding:3px 9px;border-radius:7px;font-size:11px;font-weight:800;">${cls}</span>
            <p style="font-size:11px;color:#6B7280;margin-top:3px;">${subj}</p>
          </td>
          <td class="jrn-cell-clip" style="max-width:240px;font-size:12.5px;color:#374151;font-style:italic;" title="${matEsc}">${matEsc}</td>
          <td style="text-align:center;">
            <span class="jrn-badge jrn-badge-emerald">${escapeHtml(String(h.students_present || 0))}</span>
          </td>
          <td style="text-align:center;">
            <span class="jrn-badge jrn-badge-rose">${escapeHtml(String(h.students_absent || 0))}</span>
          </td>
          <td style="text-align:center;">
            ${_renderAttendanceBar(h.students_present || 0, h.students_absent || 0)}
          </td>
          <td style="text-align:center;">
            ${h.input_type === 'H_MINUS_1'
              ? '<span class="jrn-badge jrn-badge-amber">H-1 (80%)</span>'
              : '<span class="jrn-badge jrn-badge-emerald">Hari H</span>'}
          </td>
          <td class="pr-5" style="text-align:center;" data-html2canvas-ignore="true">
            <div style="display:flex;align-items:center;justify-content:center;gap:6px;">
              <button onclick="openViewJournalByCacheIdx('admin', ${idx})" class="jrn-icon-btn jrn-icon-btn-view" title="Lihat Detail">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
              <button onclick="editAdminJournalAction(${idx})" class="jrn-icon-btn jrn-icon-btn-edit" title="Edit Jurnal">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button onclick="deleteJournalAction('${escapeHtml(h.log_id)}')" class="jrn-icon-btn jrn-icon-btn-delete" title="Hapus Jurnal">
                <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
    }
    function editAdminJournalAction(idx) {
      const h = _adminJournalCache[idx];
      if (!h) return;
      openJournalEditModal({
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
        jtm_val: h.jtm_val || 0
      });
    }
    function editGuruJournalAction(idx) {
      const h = _guruJournalCache[idx];
      if (!h) return;
      openJournalEditModal({
        log_id: h.log_id,
        date: formatDateID(h.date),
        date_iso: h.date,
        time: h.time,
        class_name: h.class_name,
        subject: h.subject,
        materi: h.materi,
        students: h.students,
        students_present: h.students,
        students_absent: h.students_absent,
        notes: h.notes || '',
        clean_notes: h.clean_notes || '-',
        jtm_val: h.jtm_val || 0
      });
    }
    function filterAdminJournalTable() {
      currentJournalPage = 1;
      const token = localStorage.getItem('auth_token');
      loadAdminJournalData(token, currentJournalPage);
    }
    function resetAdminJournalFilter() {
      const fGuru = document.getElementById('jrnFilterGuru');
      const fDateFrom = document.getElementById('jrnFilterDateFrom');
      const fDateTo = document.getElementById('jrnFilterDateTo');
      const fClass = document.getElementById('jrnFilterClass');
      if (fGuru) fGuru.value = '';
      if (fDateFrom) fDateFrom.value = '';
      if (fDateTo) fDateTo.value = '';
      if (fClass) fClass.value = '';
      document.querySelectorAll('#jrnAdminQuickRange button').forEach(b => b.classList.remove('active'));
      currentJournalPage = 1;
      const token = localStorage.getItem('auth_token');
      loadAdminJournalData(token, currentJournalPage);
    }
    function renderAdminJournalPagination(pagination) {
      _renderPagination({
        pagination: pagination,
        itemsPerPage: journalLimit,
        btnFirstId: 'btnFirstJournal',
        btnPrevId: 'btnPrevJournal',
        btnNextId: 'btnNextJournal',
        btnLastId: 'btnLastJournal',
        pageNumsId: 'adminJournalPageNumbers',
        jumpId: 'inpAdminJournalJump',
        lblStartId: 'txtAdminJournalStart',
        lblEndId: 'txtAdminJournalEnd',
        lblTotalId: 'txtAdminJournalTotal',
        gotoFnName: 'adminJournalGoToPage'
      });
      setTimeout(_fixMobileLayouts, 50);
    }
    window.adminJournalGoToPage = function (page) {
      currentJournalPage = page;
      const token = localStorage.getItem('auth_token');
      loadAdminJournalData(token, currentJournalPage);
    };
    function changeJournalPage(direction) {
      const token = localStorage.getItem('auth_token');
      if (direction === 'first') {
        currentJournalPage = 1;
      } else if (direction === 'last') {
        currentJournalPage = adminJournalTotalPages;
      } else {
        const newPage = currentJournalPage + direction;
        if (newPage < 1 || newPage > adminJournalTotalPages) return;
        currentJournalPage = newPage;
      }
      loadAdminJournalData(token, currentJournalPage);
    }
    function jumpToAdminJournalPage() {
      const input = document.getElementById('inpAdminJournalJump');
      if (!input) return;
      const page = parseInt(input.value, 10);
      if (isNaN(page) || page < 1 || page > adminJournalTotalPages) {
        showToast(`Halaman harus antara 1 dan ${adminJournalTotalPages}`, 'error');
        return;
      }
      currentJournalPage = page;
      const token = localStorage.getItem('auth_token');
      loadAdminJournalData(token, currentJournalPage);
      input.value = '';
    }
    