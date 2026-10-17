function loadAdminExtendedStats(token) {
      google.script.run.withSuccessHandler((res) => {
        if (res.status !== 'success') return;
        const elJtmToday = document.getElementById('admTotalJTMToday');
        if (elJtmToday) animateValue(elJtmToday, 0, Number(res.total_jtm_today || 0), 700);
        const pJurnal = document.getElementById('admPanelJurnal');
        const pNormalGrid = document.getElementById('admPanelNormalGrid');
        const pBap = document.getElementById('admPanelExamBap');
        if (res.is_exam_period) {
          if (pJurnal) pJurnal.style.display = 'none';
          if (pNormalGrid) pNormalGrid.style.display = 'none';
          if (pBap) pBap.style.display = 'block';
          const tJurnal = document.getElementById('admJurnalCardTitle');
          const tJurnalSub = document.getElementById('admJurnalCardSub');
          if (tJurnal) tJurnal.innerText = 'BAP Hari Ini';
          if (tJurnalSub) tJurnalSub.innerText = 'Pengawas sudah isi BAP';
          const bapDone = res.exam_bap_done || 0;
          const bapTotal = res.exam_bap_total || 0;
          const pct = bapTotal > 0 ? Math.round((bapDone / bapTotal) * 100) : 0;
          const elPct = document.getElementById('admBapProgressPct');
          const elBar = document.getElementById('admBapProgressBarFull');
          const elBadge = document.getElementById('admBapProgressBadge');
          const listEl = document.getElementById('admBapBelumList');
          if (elBar) setTimeout(() => { elBar.style.width = pct + '%'; }, 100);
          if (elPct) {
            let curPct = 0;
            const stepPct = () => {
              if (curPct >= pct) { elPct.innerText = pct + '%'; return; }
              curPct = Math.min(curPct + 2, pct);
              elPct.innerText = curPct + '%';
              requestAnimationFrame(stepPct);
            };
            stepPct();
          }
          if (elBadge) {
            elBadge.innerText = bapDone + ' dari ' + bapTotal + ' ruang ujian';
            elBadge.style.cssText = pct === 100 && bapTotal > 0
              ? 'background:#F0FDF4;color:#16A34A;border:1px solid #BBF7D0;'
              : 'background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;';
          }
          if (listEl) {
            const notDone = (res.exam_bap_list || []).filter(b => !b.has_bap);
            if (notDone.length === 0 && bapTotal > 0) {
              listEl.innerHTML = `
                <div class="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 animate-fade-in">
                  <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-emerald-800">Semua BAP Pengawas Ujian sudah diisi! 🎉</p>
                    <p class="text-xs text-emerald-600">Terima kasih atas kedisiplinannya.</p>
                  </div>
                </div>`;
            } else if (bapTotal === 0) {
              listEl.innerHTML = '<p class="text-sm text-slate-500 italic py-2">Tidak ada jadwal pengawas ujian hari ini.</p>';
            } else {
              let html = `<p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Belum Mengisi BAP (${notDone.length} ruang):</p>`;
              html += '<div class="space-y-2">';
              notDone.forEach((t, idx) => {
                const initials = (t.name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                const isSubstitute = !!t.is_substitute;
                const bgColor = 'bg-rose-50 border-rose-100';
                const avatarColor = 'bg-rose-200 text-rose-700';
                html += `
                <div class="flex items-center gap-3 p-2.5 ${bgColor} rounded-xl border animate-fade-in" style="animation-delay:${idx * 40}ms;">
                  <div class="w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs flex-shrink-0">${initials}</div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center flex-wrap gap-0.5">
                      <p class="text-sm font-bold text-slate-700 truncate">${escapeHtml(t.name || '')}</p>
                      ${isSubstitute ? '<span class="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1 border border-indigo-200">Pengganti</span>' : ''}
                    </div>
                    <p class="text-[10px] text-slate-500 truncate">${escapeHtml(t.room || '')} | ${escapeHtml(t.session || '')}</p>
                  </div>
                  <span class="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0">
                    <span class="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>Belum
                  </span>
                </div>`;
              });
              html += '</div>';
              listEl.innerHTML = html;
            }
          }
        } else {
          if (pJurnal) pJurnal.style.display = 'block';
          if (pNormalGrid) pNormalGrid.style.display = 'grid';
          if (pBap) pBap.style.display = 'none';
          const tJurnal = document.getElementById('admJurnalCardTitle');
          const tJurnalSub = document.getElementById('admJurnalCardSub');
          if (tJurnal) tJurnal.innerText = 'Jurnal Hari Ini';
          if (tJurnalSub) tJurnalSub.innerText = 'Guru sudah isi jurnal';
        }
        const elHadir = document.getElementById('admHadirCount');
        const elHadirTotal = document.getElementById('admHadirTotal');
        const elSubs = document.getElementById('admSubstitutesToday');
        if (elHadir) animateValue(elHadir, 0, Number(res.hadir_count || 0), 600);
        if (elHadirTotal) elHadirTotal.innerHTML = res.hadir_total;
        if (elSubs) elSubs.innerText = res.substitutes_today;
        const elReset = document.getElementById('admResetReqCount');
        if (elReset) {
          animateValue(elReset, 0, Number(res.pending_resets || 0), 500);
          elReset.style.color = res.pending_resets > 0 ? '#E11D48' : '#94A3B8';
        }
        const elDone = document.getElementById('admJurnalDone');
        const elTotal = document.getElementById('admJurnalTotal');
        const elBar = document.getElementById('admJurnalProgressBar');
        const elBarFull = document.getElementById('admJurnalProgressBarFull');
        const elPct = document.getElementById('admJurnalProgressPct');
        const elBadge = document.getElementById('admJurnalProgressBadge');
        const pct = res.journal_total > 0 ? Math.round((res.journal_done / res.journal_total) * 100) : 0;
        if (elDone) animateValue(elDone, 0, Number(res.journal_done || 0), 700);
        if (elTotal) elTotal.innerHTML = res.journal_total;
        if (elBar) setTimeout(() => { elBar.style.width = pct + '%'; }, 100);
        if (elBarFull) setTimeout(() => { elBarFull.style.width = pct + '%'; }, 100);
        if (elPct) {
          let curPct = 0;
          const stepPct = () => {
            if (curPct >= pct) { elPct.innerText = pct + '%'; return; }
            curPct = Math.min(curPct + 2, pct);
            elPct.innerText = curPct + '%';
            requestAnimationFrame(stepPct);
          };
          stepPct();
        }
        if (elBadge) {
          const badgeTarget = res.is_exam_period ? 'ruang ujian' : 'guru';
          elBadge.innerText = res.journal_done + ' dari ' + res.journal_total + ' ' + badgeTarget;
          elBadge.className = 'db-badge';
          elBadge.style.cssText = pct === 100
            ? 'background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;'
            : 'background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;';
        }
        const listEl = document.getElementById('admJurnalBelumList');
        if (!listEl) return;
        if (!res.teachers_not_done || res.teachers_not_done.length === 0) {
          listEl.innerHTML = `
          <div class="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 animate-fade-in">
            <div class="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </div>
            <div>
              <p class="text-sm font-bold text-emerald-800">Semua guru sudah mengisi jurnal! 🎉</p>
              <p class="text-xs text-emerald-600">Tidak ada yang tertinggal hari ini</p>
            </div>
          </div>`;
          return;
        }
        let html = `<p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Belum Mengisi Jurnal (${res.teachers_not_done.length} guru):</p>`;
        html += '<div class="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">';
        res.teachers_not_done.forEach((t, idx) => {
          const initials = (t.name || '?').split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
          const isSubstitute = !!t.is_substitute;
          const bgColor = isSubstitute ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100';
          const avatarColor = isSubstitute ? 'bg-indigo-200 text-indigo-700' : 'bg-rose-200 text-rose-700';
          const subBadge = isSubstitute
            ? `<span class="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold ml-1 border border-indigo-200 whitespace-nowrap">★ Pengganti</span>`
            : '';
          html += `
          <div class="flex items-center gap-3 p-2.5 ${bgColor} rounded-xl border animate-fade-in" style="animation-delay:${idx * 40}ms;">
            <div class="w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs flex-shrink-0">${initials}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center flex-wrap gap-0.5">
                <p class="text-sm font-bold text-slate-700 truncate">${escapeHtml(t.name || '')}</p>
                ${subBadge}
              </div>
              <p class="text-[10px] text-slate-500 truncate">${(t.subjects_remaining || []).map(s => escapeHtml(s)).join(', ')}</p>
            </div>
            <span class="inline-flex items-center gap-1 ${isSubstitute ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'} px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0">
              <span class="w-1.5 h-1.5 rounded-full ${isSubstitute ? 'bg-indigo-500' : 'bg-rose-500'} inline-block"></span>Belum
            </span>
          </div>`;
        });
        html += '</div>';
        listEl.innerHTML = html;
      }).withFailureHandler((err) => {
        console.warn('loadAdminExtendedStats error:', err);
      }).getAdminDashboardExtendedStats(token);
    }

    // ================================================================
    // PANEL PIKET DASHBOARD ADMIN
    // State: cache data piket + state modal
    // ================================================================
    