function loadActiveSubstitutesForPicketTeacher() {
      const token = localStorage.getItem('auth_token');
      const card = document.getElementById('cardActiveSubstitutePicket');
      const listEl = document.getElementById('listActiveSubstitutePicket');
      if (!card || !listEl) return;
      card.classList.remove('hidden');
      listEl.innerHTML = '<div class="text-center text-slate-400 text-sm py-6 italic">Memuat data...</div>';
      google.script.run.withSuccessHandler((res) => {
        card.classList.remove('hidden');
        if (res.status !== 'success' || !res.data || res.data.length === 0) {
          listEl.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 text-center">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-500">Tidak ada guru pengganti aktif</p>
            <p class="text-xs text-slate-400 mt-1">Semua guru mengajar sesuai jadwal hari ini</p>
          </div>`;
          return;
        }
        let html = '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">';
        res.data.forEach(sub => {
          const initSub = (sub.substitute_name || '?').charAt(0).toUpperCase();
          const initOrig = (sub.original_name || '?').charAt(0).toUpperCase();
          const safeSubName = (sub.substitute_name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          const safeSubUid = String(sub.substitute_user_id || '');
          const safeSchedId = String(sub.schedule_id || '');
          const isConfirmed = !!sub.is_confirmed;
          const statusBadge = isConfirmed
            ? '<span class="inline-flex items-center gap-1 text-emerald-700 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"><span class="w-1 h-1 rounded-full bg-emerald-500 inline-block"></span>Hadir</span>'
            : '<span class="inline-flex items-center gap-1 text-slate-400 text-[10px] font-medium bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200"><span class="w-1 h-1 rounded-full bg-slate-300 inline-block"></span>Belum Hadir</span>';
          const isBlocked = window.picketNeedsConfirmation === true;
          const blockedAttr = isBlocked ? 'disabled title="Tunggu konfirmasi kehadiran Anda terlebih dahulu"' : '';
          const hadirHover = isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-200 hover:text-emerald-800 transition-all';
          const batalHover = isBlocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-100 hover:text-red-700 transition-all';
          const hadirBtn = isConfirmed ? '' :
            `<button onclick="confirmSubstituteAction('${safeSubUid}', '${safeSchedId}', '${safeSubName}', this)" ${blockedAttr}
            class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-200 ${hadirHover}">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Hadir
          </button>`;
          html += `
          <div class="flex items-start gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-200 hover:shadow-sm transition-shadow">
            <div class="flex -space-x-2 flex-shrink-0 mt-0.5">
              <div class="w-9 h-9 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600 z-0"
                   title="${escapeHtml(sub.original_name || '')} (digantikan)">${initOrig}</div>
              <div class="w-9 h-9 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center text-xs font-bold text-indigo-700 z-10"
                   title="${escapeHtml(sub.substitute_name || '')} (pengganti)">${initSub}</div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-slate-800 truncate">${escapeHtml(sub.substitute_name || '-')}</p>
              <p class="text-[11px] text-slate-500 truncate">
                Gantikan: <span class="font-medium text-slate-600">${escapeHtml(sub.original_name || '-')}</span>
              </p>
              <p class="text-[11px] font-mono text-indigo-600 mt-0.5">${sub.time || '-'} · ${escapeHtml(sub.subject || '')} Kelas ${escapeHtml(sub.class_name || '')}</p>
              <div class="flex items-center gap-2 mt-1.5">${statusBadge}</div>
              <div class="flex items-center gap-2 mt-2">
                ${hadirBtn}
                <button onclick="revokeSubstituteAction('${safeSchedId}', '${safeSubName}', this)" ${blockedAttr}
                  class="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-red-200 ${batalHover}">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Batal
                </button>
              </div>
            </div>
          </div>`;
        });
        html += '</div>';
        listEl.innerHTML = html;
      }).withFailureHandler((err) => {
        console.warn('loadActiveSubstitutesForPicketTeacher error:', err);
        card.classList.remove('hidden');
        listEl.innerHTML = `
        <div class="flex flex-col items-center justify-center py-6 text-center">
          <p class="text-sm font-semibold text-red-500">Gagal memuat data</p>
          <p class="text-xs text-slate-400 mt-1">${err}</p>
          <button onclick="loadActiveSubstitutesForPicketTeacher()"
            class="mt-3 text-xs bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition">
            Coba Lagi
          </button>
        </div>`;
      }).getTodaySubstitutes(token);
    }
    function switchAdminPicketTab(n) {
      n = parseInt(n, 10);
      if (!n || n < 1 || n > 3) n = 1;
      document.querySelectorAll('.admin-picket-panel').forEach(function (panel) {
        panel.classList.add('hidden');
      });
      document.querySelectorAll('.admin-picket-tab-btn').forEach(function (btn) {
        btn.setAttribute('data-active', 'false');
      });
      var activePanel = document.getElementById('adminPicketPanel' + n);
      if (activePanel) activePanel.classList.remove('hidden');
      var activeBtn = document.getElementById('adminPicketTabBtn' + n);
      if (activeBtn) activeBtn.setAttribute('data-active', 'true');
      var root = document.getElementById('page-picket-root');
      if (root) root.setAttribute('data-active-tab', String(n));
      try { sessionStorage.setItem('pkt:activeTab', String(n)); } catch (e) { }
    }
    function _restoreAdminPicketTab() {
      var stored = null;
      try { stored = sessionStorage.getItem('pkt:activeTab'); } catch (e) { }
      var root = document.getElementById('page-picket-root');
      var fromAttr = root ? root.getAttribute('data-active-tab') : null;
      var n = parseInt(stored || fromAttr || '1', 10);
      if (!n || n < 1 || n > 3) n = 1;
      switchAdminPicketTab(n);
    }
    