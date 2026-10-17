let adminDailyAttendanceData = [];

    function initAdminDailyAttendance() {
      const dateInput = document.getElementById('inpAdminDailyAttendanceDate');
      if (dateInput && !dateInput.value) {
        const today = new Date();
        dateInput.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      }
      loadAdminDailyAttendance();
    }
    function loadAdminDailyAttendance() {
      const dateInput = document.getElementById('inpAdminDailyAttendanceDate');
      const label = document.getElementById('adminDailyAttendanceDateLabel');
      const tbody = document.getElementById('tbodyAdminDailyAttendance');
      if (!dateInput || !label || !tbody) return;
      const dateStr = dateInput.value;
      if (!dateStr) return;
      const d = new Date(dateStr + 'T00:00:00');
      label.textContent = d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      let skeletonHtml = '';
      for (let i = 0; i < 5; i++) {
        skeletonHtml += `
          <tr class="border-b border-slate-100 animate-pulse">
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-6 mx-auto"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-32 mb-2"></div><div class="h-3 bg-slate-200 rounded w-20"></div></td>
            <td class="py-4 px-4"><div class="h-6 bg-slate-200 rounded-full w-24 mx-auto"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-20 mx-auto"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-16 mx-auto"></div></td>
            <td class="py-4 px-4"><div class="h-2 bg-slate-200 rounded-full w-full mb-1"></div><div class="h-3 bg-slate-200 rounded w-8 ml-auto"></div></td>
            <td class="py-4 px-4"><div class="h-4 bg-slate-200 rounded w-24 mx-auto"></div></td>
          </tr>
        `;
      }
      tbody.innerHTML = skeletonHtml;
      google.script.run
        .withSuccessHandler(function(res) {
          if (res && res.status === 'success') {
            adminDailyAttendanceData = res.list || [];
            filterAdminDailyAttendance();
          } else {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-red-500 font-medium">${escapeHtml(res && res.message ? res.message : 'Gagal memuat data')}</td></tr>`;
            showToast((res && res.message) || 'Gagal memuat data kehadiran.', 'error');
          }
        })
        .withFailureHandler(function(err) {
          tbody.innerHTML = `<tr><td colspan="8" class="text-center py-6 text-red-500">Koneksi gagal: ${err}</td></tr>`;
          showToast('Koneksi gagal.', 'error');
        })
        .getAdminDailyAttendanceHistory(localStorage.getItem('auth_token'), dateStr);
    }
    function filterAdminDailyAttendance() {
      const searchInput = document.getElementById('inpAdminDailyAttendanceSearch');
      const term = searchInput ? searchInput.value.toLowerCase().trim() : '';
      let filtered = adminDailyAttendanceData;
      if (term) {
        filtered = adminDailyAttendanceData.filter(item => 
          (item.full_name && item.full_name.toLowerCase().includes(term)) ||
          (item.role && item.role.toLowerCase().includes(term))
        );
      }
      renderAdminDailyAttendanceTable(filtered);
    }
    function renderAdminDailyAttendanceTable(list) {
      const tbody = document.getElementById('tbodyAdminDailyAttendance');
      if (!tbody) return;
      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center py-8 text-slate-400 italic">Tidak ada data guru.</td></tr>';
        return;
      }
      let html = '';
      list.forEach((item, index) => {
        let statusBadge = '';
        if (item.status === 'Hadir') {
          statusBadge = '<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Hadir</span>';
        } else if (item.status === 'Sedang Bekerja') {
          statusBadge = '<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Sedang Bekerja</span>';
        } else if (item.status === 'Belum Datang') {
          statusBadge = '<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Belum Datang</span>';
        } else if (item.status === 'Belum Jadwal') {
          statusBadge = '<span class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200"><span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>Belum Jadwal</span>';
        }
        const roleText = escapeHtml(item.role || '');
        const roleHtml = roleText ? `<div class="text-[10px] text-slate-400 mt-0.5">${roleText}</div>` : '';
        const nameHtml = `<div class="font-semibold text-slate-700">${escapeHtml(item.full_name || '-')}</div>${roleHtml}`;
        let schedStr = '-';
        if (item.sched_time_in && item.sched_time_out) {
          schedStr = `${escapeHtml(formatHHmm(item.sched_time_in))} – ${escapeHtml(formatHHmm(item.sched_time_out))}`;
        } else if (item.sched_time_in) {
          schedStr = escapeHtml(formatHHmm(item.sched_time_in));
        }
        let timeStr = '-';
        if (item.time_in && item.time_out) {
          timeStr = `<span class="font-mono">${escapeHtml(formatHHmm(item.time_in))} – ${escapeHtml(formatHHmm(item.time_out))}</span>`;
        } else if (item.time_in) {
          timeStr = `<span class="font-mono text-blue-600">${escapeHtml(formatHHmm(item.time_in))} – ...</span>`;
        }
        let durStr = '-';
        if (item.duration_actual_min > 0) {
          const h = Math.floor(item.duration_actual_min / 60);
          const m = item.duration_actual_min % 60;
          durStr = `${h}j ${m}m`;
        }
        let pctStr = '-';
        if (item.status === 'Hadir' || item.status === 'Sedang Bekerja') {
          pctStr = `<div class="w-full bg-slate-100 rounded-full h-2 mb-1 overflow-hidden"><div class="bg-indigo-500 h-2 rounded-full" style="width: ${item.percentage}%"></div></div><div class="text-[10px] text-slate-500 text-right">${item.percentage}%</div>`;
        }
        html += `
          <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4 text-sm text-slate-500 text-center">${index + 1}</td>
            <td class="py-3 px-4 text-sm">${nameHtml}</td>
            <td class="py-3 px-4 text-center">${statusBadge}</td>
            <td class="py-3 px-4 text-sm text-center text-slate-600 whitespace-nowrap">${schedStr}</td>
            <td class="py-3 px-4 text-sm text-center text-slate-700 whitespace-nowrap">${timeStr}</td>
            <td class="py-3 px-4 text-sm text-center font-medium text-slate-700 whitespace-nowrap">${durStr}</td>
            <td class="py-3 px-4 text-center align-middle" style="min-width: 100px;">${pctStr}</td>
            <td class="py-3 px-4 text-sm text-center font-medium text-slate-700 whitespace-nowrap">${escapeHtml(item.transport_nominal_formatted || 'Rp 0')}</td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    }
    // ============================================================
    // BLOKIR JURNAL — ADMIN PANEL
    // ============================================================
    