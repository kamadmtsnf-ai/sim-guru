function loadGuruTodayProgress(token) {
      const container = document.getElementById('guruJurnalProgressContainer');
      const badge = document.getElementById('guruJurnalBadge');
      if (!container) return;
      google.script.run.withSuccessHandler((res) => {
        if (res.status !== 'success') {
          container.innerHTML = '<p class="text-slate-400 text-sm italic py-4 text-center">Tidak ada jadwal mengajar hari ini.</p>';
          if (badge) {
            badge.innerText = 'Tidak ada jadwal';
            badge.style.cssText = 'background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;';
          }
          return;
        }
        const { items, done, total, pct } = res;
        if (total === 0 && (!items || items.length === 0)) {
          container.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 text-slate-400">
            <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <p class="text-sm font-semibold text-slate-500">Tidak ada jadwal mengajar hari ini</p>
            <p class="text-xs text-slate-400 mt-1">Selamat berlibur! 🌴</p>
          </div>`;
          if (badge) {
            badge.innerText = 'Tidak ada jadwal';
            badge.style.cssText = 'background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;';
          }
          return;
        }
        if (badge) {
          if (total === 0) {
            badge.innerText = 'Semua digantikan';
            badge.style.cssText = 'background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;';
          } else {
            badge.innerText = done + '/' + total + ' selesai';
            badge.style.cssText = done === total
              ? 'background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;'
              : 'background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;';
          }
        }
        let html = '';
        if (total > 0) {
          html += `
          <div class="mb-4">
            <div class="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>${done} dari ${total} jurnal terisi</span>
              <span class="font-bold ${pct === 100 ? 'text-emerald-600' : 'text-blue-600'}">${pct}%</span>
            </div>
            <div class="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full transition-all duration-700 ${pct === 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}" style="width:${pct}%"></div>
            </div>
          </div>`;
        }
        html += '<div class="space-y-2">';
        items.forEach(s => {
          if (s.is_replaced) {
            const subName = s.substitute_name || 'Guru Pengganti';
            html += `
            <div class="flex items-center gap-3 p-2.5 rounded-xl border bg-slate-50 border-slate-200 opacity-70">
              <div class="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center flex-shrink-0">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-500 truncate">${escapeHtml(s.subject)} — Kelas ${escapeHtml(s.class_name)}</p>
                <p class="text-[10px] text-slate-400">${s.time_start} · ${s.jtm_val} JTM · Oleh: <span class="font-semibold text-slate-500">${escapeHtml(subName)}</span></p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 flex-shrink-0 whitespace-nowrap">Digantikan</span>
            </div>`;
          } else if (s.is_substitute) {
            const origName = s.original_teacher || 'Guru Asli';
            html += `
            <div data-sched-id="${escapeHtml(String(s.schedule_id))}" class="flex items-center gap-3 p-2.5 rounded-xl border ${s.has_journal ? 'bg-emerald-50 border-emerald-200' : 'bg-indigo-50 border-indigo-200'}">
              <div class="w-7 h-7 rounded-full ${s.has_journal ? 'bg-emerald-200 text-emerald-700' : 'bg-indigo-200 text-indigo-600'} flex items-center justify-center text-xs font-bold flex-shrink-0">
                ${s.has_journal ? '✓' : s.time_start}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-xs font-bold text-slate-700 truncate">${escapeHtml(s.subject)} — Kelas ${escapeHtml(s.class_name)}</p>
                  <span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex-shrink-0 whitespace-nowrap">★ Pengganti</span>
                </div>
                <p class="text-[10px] text-slate-400">${s.time_start} · ${s.jtm_val} JTM · Gantikan: <span class="font-semibold text-slate-500">${escapeHtml(origName)}</span></p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${s.has_journal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} flex-shrink-0">
                ${s.has_journal ? 'Selesai' : 'Belum'}
              </span>
            </div>`;
          } else if (s.is_h_minus_1) {
            const h1Jtm = s.h1_jtm_display !== undefined ? s.h1_jtm_display : s.jtm_val;
            const h1Confirmed = !!s.h1_attendance_confirmed;
            const h1Replaced  = !!s.h1_is_replaced;
            // Tentukan label status dan ikon avatar
            let h1StatusBadge, h1Avatar, h1SubText;
            if (h1Replaced) {
              h1StatusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 flex-shrink-0 whitespace-nowrap">Digantikan</span>';
              h1Avatar = '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>';
              h1SubText = `${s.time_start} · <span class="font-semibold">${escapeHtml(String(h1Jtm))} JTM (80%)</span> · Kemarin · <span class="text-slate-400">Jadwal digantikan</span>`;
            } else if (!h1Confirmed) {
              h1StatusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex-shrink-0 whitespace-nowrap">Blokir</span>';
              h1Avatar = '⚠️';
              h1SubText = `${s.time_start} · <span class="font-semibold">${escapeHtml(String(h1Jtm))} JTM (80%)</span> · <span class="text-red-500 font-semibold">Kehadiran belum dikonfirmasi</span>`;
            } else {
              h1StatusBadge = '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0 whitespace-nowrap">Belum</span>';
              h1Avatar = '⚡';
              h1SubText = `${s.time_start} · <span class="font-semibold">${escapeHtml(String(h1Jtm))} JTM (80%)</span> · Kemarin`;
            }
            html += `
            <div data-sched-id="${escapeHtml(String(s.schedule_id))}" class="flex items-center gap-3 p-2.5 rounded-xl border ${h1Replaced ? 'bg-slate-50 border-slate-200 opacity-70' : (h1Confirmed ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200')}">
              <div class="w-7 h-7 rounded-full ${h1Replaced ? 'bg-slate-200 text-slate-400' : (h1Confirmed ? 'bg-amber-200 text-amber-700' : 'bg-red-100 text-red-500')} flex items-center justify-center text-xs font-bold flex-shrink-0">
                ${h1Avatar}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <p class="text-xs font-bold ${h1Replaced ? 'text-slate-500' : (h1Confirmed ? 'text-amber-800' : 'text-red-700')} truncate">${escapeHtml(s.subject)} — Kelas ${escapeHtml(s.class_name)}</p>
                  <span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 flex-shrink-0 whitespace-nowrap">H-1</span>
                </div>
                <p class="text-[10px] ${h1Confirmed && !h1Replaced ? 'text-amber-600' : 'text-slate-400'}">${h1SubText}</p>
              </div>
              <button onclick="loadGuruTodayProgress(localStorage.getItem('auth_token'))" style="display:none"></button>
              ${h1StatusBadge}
            </div>`;
          } else {
            html += `
            <div data-sched-id="${escapeHtml(String(s.schedule_id))}" class="flex items-center gap-3 p-2.5 rounded-xl border ${s.has_journal ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}">
              <div class="w-7 h-7 rounded-full ${s.has_journal ? 'bg-emerald-200 text-emerald-700' : 'bg-slate-200 text-slate-500'} flex items-center justify-center text-xs font-bold flex-shrink-0">
                ${s.has_journal ? '✓' : s.time_start}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-bold text-slate-700 truncate">${escapeHtml(s.subject)} — Kelas ${escapeHtml(s.class_name)}</p>
                <p class="text-[10px] text-slate-400">${s.time_start} · ${s.jtm_val} JTM</p>
              </div>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${s.has_journal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} flex-shrink-0">
                ${s.has_journal ? 'Selesai' : 'Belum'}
              </span>
            </div>`;
          }
        });
        html += '</div>';
        container.innerHTML = html;
        // Aktifkan marquee setelah browser selesai layout (double-rAF)
        requestAnimationFrame(function() {
          requestAnimationFrame(function() {
            _initDashboardMarquees(container);
          });
        });
      }).withFailureHandler((err) => {
        console.warn('loadGuruTodayProgress error:', err);
        if (container) container.innerHTML = '<p class="text-slate-400 text-sm italic py-4 text-center">Gagal memuat data.</p>';
      }).getGuruTodayScheduleProgress(token);
    }
    /**
     * Update tampilan satu item jadwal di kartu "Status Jurnal Hari Ini"
     * menjadi status "Selesai" tanpa me-reload seluruh kartu.
     * Dipanggil setelah submitJournal berhasil.
     *
     * @param {string} scheduleId - ID jadwal yang baru saja diisi jurnalnya
     */
    function _markScheduleItemDone(scheduleId) {
      if (!scheduleId) return;
      const container = document.getElementById('guruJurnalProgressContainer');
      if (!container) return;
      const item = container.querySelector('[data-sched-id="' + CSS.escape(String(scheduleId)) + '"]');
      if (!item) return;
      item.classList.remove('bg-slate-50', 'border-slate-200', 'bg-indigo-50', 'border-indigo-200');
      item.classList.add('bg-emerald-50', 'border-emerald-200');
      const avatar = item.querySelector('div.w-7');
      if (avatar) {
        avatar.classList.remove(
          'bg-slate-200', 'text-slate-500',
          'bg-indigo-200', 'text-indigo-600'
        );
        avatar.classList.add('bg-emerald-200', 'text-emerald-700');
        avatar.textContent = '✓';
      }
      const badge = item.querySelector('span.flex-shrink-0:last-child');
      if (badge) {
        badge.classList.remove('bg-amber-100', 'text-amber-700');
        badge.classList.add('bg-emerald-100', 'text-emerald-700');
        badge.textContent = 'Selesai';
      }
      const allItems = container.querySelectorAll('[data-sched-id]');
      const doneItems = container.querySelectorAll(
        '[data-sched-id] span.bg-emerald-100.text-emerald-700:last-child,' +
        '[data-sched-id] span.text-emerald-700.flex-shrink-0'
      );
      let total = 0, done = 0;
      allItems.forEach(function (el) {
        const statusBadge = el.querySelector('span.flex-shrink-0:last-child');
        if (!statusBadge) return;
        const txt = statusBadge.textContent.trim();
        if (txt === 'Digantikan') return;
        total++;
        if (txt === 'Selesai') done++;
      });
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const counterEl = container.querySelector('.flex.justify-between.text-xs span:first-child');
      if (counterEl) counterEl.textContent = done + ' dari ' + total + ' jurnal terisi';
      const pctEl = container.querySelector('.flex.justify-between.text-xs span:last-child');
      if (pctEl) {
        pctEl.textContent = pct + '%';
        pctEl.className = 'font-bold ' + (pct === 100 ? 'text-emerald-600' : 'text-blue-600');
      }
      const barEl = container.querySelector('.bg-slate-100 > div');
      if (barEl) {
        barEl.style.width = pct + '%';
        barEl.className = 'h-2.5 rounded-full transition-all duration-700 ' +
          (pct === 100
            ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
            : 'bg-gradient-to-r from-blue-400 to-blue-600');
      }
      const badgeEl = document.getElementById('guruJurnalBadge');
      if (badgeEl) {
        badgeEl.innerText = done + '/' + total + ' selesai';
        badgeEl.style.cssText = done === total
          ? 'background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;'
          : 'background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;';
      }
    }
    