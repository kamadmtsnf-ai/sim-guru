function scrollToDashboardSchedule() {
      var target = document.getElementById('panelJadwalMengajarHariIni');
      if (!target) return;
      function _findScrollParent(el) {
        var parent = el.parentElement;
        while (parent && parent !== document.body) {
          var style = window.getComputedStyle(parent);
          var overflow = style.overflowY;
          if (overflow === 'auto' || overflow === 'scroll') return parent;
          parent = parent.parentElement;
        }
        return window;
      }
      var scroller = _findScrollParent(target);
      var offset = 72; // tinggi navbar kira-kira, agar tidak tertutup
      if (scroller === window) {
        var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top: top, behavior: 'smooth' });
      } else {
        var containerTop = scroller.getBoundingClientRect().top;
        var targetTop    = target.getBoundingClientRect().top;
        var scrollTo     = scroller.scrollTop + (targetTop - containerTop) - offset;
        scroller.scrollTo({ top: scrollTo, behavior: 'smooth' });
      }
    }
    function initDashboard() {
      const token = localStorage.getItem('auth_token');
      const role = localStorage.getItem('user_role') || "guru";
      const viewGuru = document.getElementById('viewGuruDashboard');
      const viewAdmin = document.getElementById('viewAdminDashboard');
      const today = new Date();
      const dateStr = formatDateID(today);
      setText('lblTodayDate', dateStr);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      setText('lblMonth', months[today.getMonth()]);
      if (document.getElementById('badgeDate')) setText('badgeDate', dateStr);
      if (String(role).toLowerCase() === 'admin') {
        if (viewAdmin) viewAdmin.classList.remove('hidden');
        setText('lblRoleTitle', 'Administrator');
        setTimeout(() => { renderGreetingCard(); }, 50);
        initAdminDashboard();
      } else {
        if (viewGuru) viewGuru.classList.remove('hidden');
        setTimeout(() => { renderGreetingCard(); }, 50);
        loadGuruDashboardData(token);
        setTimeout(() => { checkExamBannerForDashboard(); }, 200);
      }
      startDashboardLiveTicker();
      setTimeout(() => { if (typeof _fixMobileLayouts === 'function') _fixMobileLayouts(); }, 300);
    }
    let _dashboardTickerId = null;
    function startDashboardLiveTicker() {
      if (_dashboardTickerId) clearInterval(_dashboardTickerId);
      _dashboardTickerId = setInterval(() => {
        const liveClock = document.getElementById('dashLiveClock');
        if (liveClock) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const ss = String(now.getSeconds()).padStart(2, '0');
          liveClock.innerText = `${hh}:${mm}:${ss}`;
        }
        const viewGuru = document.getElementById('viewGuruDashboard');
        const viewAdmin = document.getElementById('viewAdminDashboard');
        const guruVisible = viewGuru && !viewGuru.classList.contains('hidden');
        const adminVisible = viewAdmin && !viewAdmin.classList.contains('hidden');
        if (!guruVisible && !adminVisible) {
          clearInterval(_dashboardTickerId);
          _dashboardTickerId = null;
        }
      }, 1000);
    }
    function refreshDashboard() {
      const btn = document.getElementById('btnRefreshDashboard');
      if (btn) {
        btn.classList.add('rotating');
        setTimeout(() => btn.classList.remove('rotating'), 800);
      }
      showToast('Memperbarui data dashboard...', 'info');
      initDashboard();
    }
    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.innerText = text;
    }
    function initAdminDashboard() {
      const token = localStorage.getItem('auth_token');
      loadAdminDashboardData(token);
      checkAdminAutoJurnalStatus(token);
      loadAdminExtendedStats(token);
      loadAdminDashboardPicket();
      // Aktifkan marquee di elemen statis setelah render (elemen dinamis
      // memanggil sendiri via _initDashboardMarquees setelah diisi)
      setTimeout(_initDashboardMarquees, 400);
    }
    function checkAdminAutoJurnalStatus(token) {
      google.script.run.withSuccessHandler((res) => {
        const panel = document.getElementById('panelAutoJurnalAdmin');
        const btnGenerate = document.getElementById('btnGenerateAutoJurnal');
        const btnCancel = document.getElementById('btnCancelAutoJurnal');
        const txtDate = document.getElementById('txtAdminLiburDate');
        const resultDiv = document.getElementById('resultAutoJurnal');
        const badgeStatus = document.getElementById('badgeAutoJurnalStatus');
        if (!panel) return;
        if (res && res.status === 'success' && res.is_holiday) {
          panel.classList.remove('hidden');
          loadAutoJurnalSchedulerStatus(token);
          const today = new Date();
          txtDate.innerText = formatDateID(today) + ' - ' + (res.holiday_description || 'Hari Libur');
          if (res.has_auto_jurnal) {
            btnGenerate.classList.add('hidden');
            btnCancel.classList.remove('hidden');
            resultDiv.classList.remove('hidden');
            badgeStatus.classList.remove('hidden');
            badgeStatus.innerText = '✅ AKTIF';
            badgeStatus.className = 'text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700';
            showAutoJurnalResult({
              message: 'Auto-jurnal sudah pernah dibuat untuk hari ini',
              already_exists: true,
              generated: res.existing_count || 0,
              can_cancel: true,
              lock_id: res.lock_id,
              generated_at: res.generated_at,
              generated_by: res.generated_by
            });
          } else {
            btnGenerate.disabled = false;
            btnGenerate.innerText = '🚀 Generate Jurnal Otomatis';
            btnGenerate.classList.remove('hidden', 'opacity-50', 'cursor-not-allowed');
            btnCancel.classList.add('hidden');
            resultDiv.classList.add('hidden');
            badgeStatus.classList.add('hidden');
          }
        } else {
          panel.classList.add('hidden');
        }
      }).checkAutoJurnalStatus(token);
    }
    function loadAutoJurnalSchedulerStatus(token) {
      const badge = document.getElementById('badgeAutoJurnalScheduler');
      const badgeLabel = document.getElementById('badgeAutoJurnalSchedulerLabel');
      const btn = document.getElementById('btnToggleAutoJurnalScheduler');
      const btnLabel = document.getElementById('btnToggleAutoJurnalSchedulerLabel');
      const info = document.getElementById('txtAdminSchedulerInfo');
      if (!badge || !btn) return;
      google.script.run.withSuccessHandler((res) => {
        if (!res || res.status !== 'success') {
          badge.classList.add('hidden');
          btn.classList.add('hidden');
          return;
        }
        badge.classList.remove('hidden');
        btn.classList.remove('hidden');
        btn.classList.add('inline-flex');
        if (res.installed) {
          badgeLabel.textContent = 'Otomatis: AKTIF';
          var dotSpan = badge.querySelector('span');
          if (dotSpan) dotSpan.style.background = '#34D399';
          btnLabel.textContent = 'Nonaktifkan Otomatis';
          btn.dataset.installed = '1';
          if (info) info.textContent = 'Trigger otomatis aktif. Akan jalan ~16:00 WIB pada hari libur bonus.';
        } else {
          badgeLabel.textContent = 'Otomatis: NONAKTIF';
          var dotSpan2 = badge.querySelector('span');
          if (dotSpan2) dotSpan2.style.background = '#FCA5A5';
          btnLabel.textContent = 'Aktifkan Otomatis';
          btn.dataset.installed = '0';
          if (info) info.textContent = 'Klik "Aktifkan Otomatis" agar sistem auto-generate ~16:00 WIB di hari libur bonus.';
        }
      }).withFailureHandler(() => {
        badge.classList.add('hidden');
        btn.classList.add('hidden');
      }).getAutoJurnalSchedulerStatus(token);
    }
    function toggleAutoJurnalScheduler() {
      const btn = document.getElementById('btnToggleAutoJurnalScheduler');
      if (!btn) return;
      const isInstalled = btn.dataset.installed === '1';
      const token = localStorage.getItem('auth_token');
      var restore = (typeof _busyButton === 'function') ? _busyButton(btn, 'Memproses...') : function () { };
      if (isInstalled) {
        showConfirm(
          'Nonaktifkan Trigger Otomatis',
          'Sistem tidak akan lagi auto-generate jurnal libur pada 16:00 WIB. Admin tetap bisa generate manual. Lanjutkan?',
          () => {
            google.script.run
              .withSuccessHandler(function (res) {
                restore();
                if (res && res.status === 'success') {
                  showToast('Trigger otomatis dinonaktifkan.', 'success');
                } else {
                  showToast((res && res.message) || 'Gagal menonaktifkan trigger.', 'error');
                }
                loadAutoJurnalSchedulerStatus(token);
              })
              .withFailureHandler(function (err) {
                restore();
                showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
              })
              .uninstallAutoJurnalSchedulerByAdmin(token);
          },
          { type: 'danger' }
        );
      } else {
        showConfirm(
          'Aktifkan Trigger Otomatis',
          'Sistem akan menjalankan auto-jurnal libur secara otomatis pada ~16:00 WIB di hari libur bonus. Admin tetap bisa menjalankan manual kapan saja. Lanjutkan?',
          () => {
            google.script.run
              .withSuccessHandler(function (res) {
                restore();
                if (res && res.status === 'success') {
                  showToast('Trigger otomatis aktif. ' + (res.message || ''), 'success');
                } else {
                  showToast((res && res.message) || 'Gagal memasang trigger.', 'error');
                }
                loadAutoJurnalSchedulerStatus(token);
              })
              .withFailureHandler(function (err) {
                restore();
                showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
              })
              .installAutoJurnalSchedulerByAdmin(token);
          },
          { type: 'info' }
        );
      }
    }
    function generateAutoJurnalAction() {
      const btn = document.getElementById('btnGenerateAutoJurnal');
      const originalText = btn.innerText;
      showConfirm(
        'Generate Auto Jurnal Libur',
        'Sistem akan membuat jurnal otomatis untuk SEMUA guru yang memiliki jadwal hari ini. ' +
        'Jurnal yang sudah ada secara manual tidak akan ditimpa. Lanjutkan?',
        () => {
          btn.disabled = true;
          btn.innerHTML = '<span class="animate-pulse">⏳ Memproses...</span>';
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            btn.disabled = false;
            if (res && res.status === 'success') {
              showToast(`✅ ${res.message}`, 'success');
              showAutoJurnalResult(res);
              document.getElementById('btnGenerateAutoJurnal').classList.add('hidden');
              document.getElementById('btnCancelAutoJurnal').classList.remove('hidden');
              const badgeStatus = document.getElementById('badgeAutoJurnalStatus');
              badgeStatus.classList.remove('hidden');
              badgeStatus.innerText = '✅ AKTIF';
              badgeStatus.className = 'text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700';
              setTimeout(() => initAdminDashboard(), 1000);
              if (typeof refreshGuruDashboardCards === 'function') refreshGuruDashboardCards();
            } else if (res && res.status === 'info') {
              showToast(res.message, 'info');
              btn.innerText = originalText;
            } else {
              showToast('❌ ' + res.message, 'error');
              btn.innerText = originalText;
            }
          }).withFailureHandler((err) => {
            btn.disabled = false;
            btn.innerText = originalText;
            showToast('Gagal: ' + err, 'error');
          }).generateAutoJurnalForHoliday(token);
        },
        { type: 'info' }
      );
    }
    function cancelAutoJurnalAction() {
      const btn = document.getElementById('btnCancelAutoJurnal');
      const originalText = btn.innerHTML;
      showConfirm(
        'Batalkan Generate Jurnal Otomatis',
        '<div class="text-left">' +
        '<p class="mb-2 text-red-600 font-bold">⚠️ PERINGATAN: Tindakan ini tidak dapat dibatalkan!</p>' +
        '<p class="mb-2">Semua jurnal otomatis yang dibuat hari ini akan <strong>DIHAPUS PERMANEN</strong>.</p>' +
        '<ul class="text-sm text-slate-600 list-disc pl-4 space-y-1">' +
        '<li>JTM bonus dari jurnal otomatis akan dikurangi</li>' +
        '<li>Data honorarium akan dihitung ulang</li>' +
        '<li>Guru perlu mengisi jurnal manual jika masuk</li>' +
        '</ul>' +
        '</div>',
        () => {
          btn.disabled = true;
          btn.innerHTML = '<span class="animate-pulse">⏳ Membatalkan...</span>';
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            btn.disabled = false;
            if (res && res.status === 'success') {
              showToast(`✅ ${res.message}`, 'success');
              renderCancelResult(res);
              document.getElementById('btnGenerateAutoJurnal').classList.remove('hidden');
              document.getElementById('btnCancelAutoJurnal').classList.add('hidden');
              const badgeStatus = document.getElementById('badgeAutoJurnalStatus');
              badgeStatus.classList.remove('hidden');
              badgeStatus.innerText = '❌ DIBATALKAN';
              badgeStatus.className = 'text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700';
              setTimeout(() => initAdminDashboard(), 1500);
              if (typeof refreshGuruDashboardCards === 'function') refreshGuruDashboardCards();
            } else {
              showToast('❌ ' + res.message, 'error');
              btn.innerHTML = originalText;
            }
          }).withFailureHandler((err) => {
            btn.disabled = false;
            btn.innerHTML = originalText;
            showToast('❌ Gagal: ' + err, 'error');
          }).cancelAutoJurnalForHoliday(token);
        },
        { type: 'danger' }
      );
    }
    function renderCancelResult(data) {
      const resultDiv = document.getElementById('resultAutoJurnal');
      const contentDiv = document.getElementById('contentResultAutoJurnal');
      if (!resultDiv || !contentDiv) return;
      resultDiv.classList.remove('hidden');
      let html = `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          <p class="text-red-700 font-bold">Jurnal Otomatis Dibatalkan</p>
        </div>
        <p class="text-red-600 text-xs">Dibatalkan pada: ${formatDateID(new Date())} ${formatTimeID(new Date())}</p>
        <p class="text-red-600 text-xs">Oleh: ${localStorage.getItem('user_name') || 'Admin'}</p>
      </div>
    `;
      if (data.deleted_count > 0) {
        html += `
        <div class="bg-white border border-slate-200 rounded-lg p-3 mb-3">
          <p class="font-bold text-slate-700 mb-2">📊 Ringkasan Penghapusan:</p>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-red-50 p-2 rounded">
              <p class="text-2xl font-bold text-red-600">${data.deleted_count}</p>
              <p class="text-xs text-red-500">Jurnal Dihapus</p>
            </div>
            <div class="bg-orange-50 p-2 rounded">
              <p class="text-2xl font-bold text-orange-600">${data.total_jtm_removed}</p>
              <p class="text-xs text-orange-500">JTM Dikurangi</p>
            </div>
            <div class="bg-blue-50 p-2 rounded">
              <p class="text-2xl font-bold text-blue-600">${data.affected_teachers}</p>
              <p class="text-xs text-blue-500">Guru Terdampak</p>
            </div>
          </div>
        </div>
      `;
        if (data.details && data.details.length > 0) {
          html += `
          <div class="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-lg p-2 bg-white">
            <p class="text-xs font-bold text-slate-500 mb-2 sticky top-0 bg-white pb-1 border-b">Detail Jurnal yang Dihapus:</p>
        `;
          data.details.forEach(log => {
            html += `
            <div class="flex justify-between items-center text-xs p-2 bg-red-50 rounded border border-red-100">
              <div>
                <span class="font-bold text-slate-700">${log.teacher_name}</span>
                <span class="text-slate-500"> - ${log.subject} ${log.class_name}</span>
              </div>
              <span class="bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                -${log.jtm_val} JTM
              </span>
            </div>
          `;
          });
          html += '</div>';
        }
      }
      if (data.skipped_count > 0) {
        html += `
        <div class="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p class="text-yellow-700 font-bold text-xs mb-1">⏭️ ${data.skipped_count} jurnal dilewati:</p>
          <p class="text-yellow-600 text-xs">${data.skip_reason}</p>
        </div>
      `;
      }
      contentDiv.innerHTML = html;
    }
    function showAutoJurnalResult(data) {
      const resultDiv = document.getElementById('resultAutoJurnal');
      const contentDiv = document.getElementById('contentResultAutoJurnal');
      if (!resultDiv || !contentDiv) return;
      resultDiv.classList.remove('hidden');
      let html = '';
      if (data.already_exists) {
        html += `<p class="text-amber-600 font-medium mb-2">⚠️ ${data.message}</p>`;
        if (data.generated_at && data.generated_by) {
          html += `
          <div class="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs">
            <p class="text-blue-700"><strong>Dibuat oleh:</strong> ${data.generated_by}</p>
            <p class="text-blue-700"><strong>Waktu:</strong> ${data.generated_at}</p>
          </div>
        `;
        }
      }
      if (data.generated > 0) {
        html += `
        <div class="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
          <p class="text-green-700 font-bold">✅ Berhasil membuat ${data.generated} jurnal otomatis</p>
          <p class="text-green-600 text-xs mt-1">Lock ID: ${data.lock_id || 'N/A'}</p>
        </div>
      `;
        if (data.details && data.details.length > 0) {
          html += '<div class="max-h-60 overflow-y-auto space-y-2">';
          data.details.forEach(log => {
            const user = allTeachersCache.find(t => t.id === log.user_id);
            html += `
            <div class="flex justify-between items-center bg-white p-2 rounded border text-xs">
              <div>
                <span class="font-bold text-slate-700">${user ? user.full_name : log.user_id}</span>
                <span class="text-slate-500"> - ${log.subject} ${log.class_name}</span>
              </div>
              <span class="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                +${log.jtm_val} JTM
              </span>
            </div>
          `;
          });
          html += '</div>';
        }
      }
      if (data.skipped > 0) {
        html += `
        <div class="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p class="text-amber-700 font-bold text-xs">⏭️ ${data.skipped} jadwal dilewati (sudah ada jurnal manual)</p>
        </div>
      `;
      }
      contentDiv.innerHTML = html;
    }
    function confirmPresenceAction(userId, scheduleId, name, btnEl) {
      showConfirm(
        'Konfirmasi Kehadiran',
        `Apakah Anda yakin ingin mengonfirmasi kehadiran ${name} pada jadwal mengajar ini?`,
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Mengonfirmasi...');
          const restoreRow = _setRowLoading(btnEl);
          google.script.run
            .withSuccessHandler((res) => {
              restoreBtn(); restoreRow();
              if (res && res.status === 'success') {
                showToast(`Kehadiran ${name} berhasil dikonfirmasi`);
                if (document.getElementById('viewAdminPicket') && !document.getElementById('viewAdminPicket').classList.contains('hidden')) initPicket();
                else if (document.getElementById('viewTeacherPicket') && !document.getElementById('viewTeacherPicket').classList.contains('hidden')) initPicket();
                else if (typeof initAdminDashboard === 'function') initAdminDashboard();
              } else {
                showToast(res.message, "error");
              }
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreRow();
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .confirmTeacherPresence(token, userId, scheduleId);
        }
      );
    }
    function revokePresenceAction(userId, scheduleId, name, btnEl) {
      showConfirm(
        'Batalkan Kehadiran',
        `Apakah Anda yakin ingin membatalkan konfirmasi kehadiran ${name} pada jadwal mengajar ini?`,
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Membatalkan...');
          const restoreRow = _setRowLoading(btnEl);
          google.script.run
            .withSuccessHandler((res) => {
              restoreBtn(); restoreRow();
              if (res && res.status === 'success') {
                showToast(`Konfirmasi kehadiran ${name} dibatalkan`);
                if (document.getElementById('viewAdminPicket') && !document.getElementById('viewAdminPicket').classList.contains('hidden')) initPicket();
                else if (document.getElementById('viewTeacherPicket') && !document.getElementById('viewTeacherPicket').classList.contains('hidden')) initPicket();
                else if (typeof initAdminDashboard === 'function') initAdminDashboard();
              } else {
                showToast(res.message, "error");
              }
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreRow();
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .revokeTeacherPresence(token, userId, scheduleId);
        }
      );
    }
    function loadAdminDashboardData(token) {
      const tbody = document.getElementById('admScheduleTableBody');
      if (tbody) tbody.innerHTML = skeletonTableRows(5, 4);
      ['admTotalJTM', 'admTotalHonor', 'admTotalTransport'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div class="skeleton h-7 w-16 rounded inline-block"></div>';
      });
      google.script.run.withSuccessHandler((res) => {
        if (res && res.status === 'success') {
          const elJtm = document.getElementById('admTotalJTM');
          const elHonor = document.getElementById('admTotalHonor');
          if (elJtm) animateValue(elJtm, 0, Number(res.total_jtm_school || 0), 800);
          if (elHonor) animateRupiah(elHonor, res.est_honor_school, 900);
          const elTransport = document.getElementById('admTotalTransport');
          const transportCard = document.getElementById('admTransportCard');
          if (elTransport) {
            if (!res.transport_enabled) {
              if (transportCard) transportCard.style.display = 'none';
            } else {
              if (transportCard) transportCard.style.display = '';
              animateRupiah(elTransport, res.transport_total_school_formatted || 'Rp 0', 850);
            }
          }
          if (res.schedules.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="py-8">
               <div class="error-state-container">
                 <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                   <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                 </div>
                 <p class="text-slate-500 font-semibold text-sm">Tidak ada jadwal hari ini</p>
                 <p class="text-slate-400 text-xs mt-1">Hari ini libur atau belum ada data jadwal</p>
               </div>
             </td></tr>`;
          } else {
            let html = '';
            const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
            res.schedules.forEach(s => {
              if (!s || !s.status) return;
              const isSudah = s.status.includes('Sudah');
              const badge = isSudah
                ? `<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>${s.status}</span>`
                : `<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse"></span>${s.status}</span>`;
              let rowHighlight = '';
              if (s.time && s.time.includes('-')) {
                const [tStart, tEnd] = s.time.split('-').map(t => t.trim());
                const toMin = (t) => {
                  const [hh, mm] = t.split(':').map(Number);
                  return (hh || 0) * 60 + (mm || 0);
                };
                const sMin = toMin(tStart);
                const eMin = toMin(tEnd);
                if (nowMin >= sMin && nowMin <= eMin) {
                  rowHighlight = ' style="background:linear-gradient(90deg,#FEF9C3,#FFFBEB);" data-active-row="1"';
                }
              }
              html += `<tr class="border-b hover:bg-slate-50 transition-colors"${rowHighlight}>
                  <td class="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs text-slate-500 whitespace-nowrap">${escapeHtml(s.time)}</td>
                  <td class="px-3 sm:px-6 py-3 sm:py-4 font-semibold text-blue-700 text-xs sm:text-sm" title="${escapeHtml(s.guru_name)}"><span class="db-marquee-wrap"><span class="db-marquee-inner">${escapeHtml(s.guru_name)}</span></span></td>
                  <td class="col-hide-xs px-3 sm:px-6 py-3 sm:py-4 text-xs font-bold text-slate-600"><span class="bg-slate-100 px-2 py-1 rounded-lg">${escapeHtml(s.class_name)}</span></td>
                  <td class="px-3 sm:px-6 py-3 sm:py-4 text-slate-600 text-xs sm:text-sm" title="${escapeHtml(s.subject)}"><span class="db-marquee-wrap"><span class="db-marquee-inner">${escapeHtml(s.subject)}</span></span></td>
                  <td class="px-3 sm:px-6 py-3 sm:py-4 text-center" style="overflow:visible;white-space:normal;">${badge}</td>
                </tr>`;
            });
            tbody.innerHTML = html;
            // Aktifkan marquee setelah browser selesai layout (double-rAF
            // memastikan frame paint pertama sudah selesai sebelum pengukuran)
            requestAnimationFrame(function() {
              requestAnimationFrame(function() {
                _initDashboardMarquees(tbody.closest('.db-panel') || document);
              });
            });
          }
        } else {
          if (tbody) tbody.innerHTML = errorTableRows(5, res.message || 'Gagal memuat jadwal.', 'loadAdminDashboardData(localStorage.getItem(\'auth_token\'))');
        }
      }).withFailureHandler((err) => {
        if (tbody) tbody.innerHTML = errorTableRows(5, 'Koneksi gagal: ' + err, 'loadAdminDashboardData(localStorage.getItem(\'auth_token\'))');
      }).getAdminDashboardData_V2(token);
    }
    function loadGuruDashboardData(token) {
      if (localStorage.getItem('hide_honor_dashboard') === null) {
        localStorage.setItem('hide_honor_dashboard', 'true');
      }
      if (localStorage.getItem('hide_transport_dashboard') === null) {
        localStorage.setItem('hide_transport_dashboard', 'true');
      }
      if (typeof updateHonorVisibilityUI === 'function') {
        updateHonorVisibilityUI();
      }
      if (typeof updateTransportVisibilityUI === 'function') {
        updateTransportVisibilityUI();
      }
      var cachedStats = _readGuruStatsCache();
      if (cachedStats) {
        _applyGuruDashboardStats(cachedStats, false);
      } else {
        ['valJtmTotal', 'valJtmBonus', 'valEstHonor', 'valJtmToday'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '<div class="skeleton h-7 w-16 rounded inline-block"></div>';
        });
      }
      const schedTbody = document.getElementById('scheduleTableBody');
      if (schedTbody) schedTbody.innerHTML = skeletonTableRows(5, 4);
      checkAndDisplayHolidayBonus(token);
      google.script.run.withSuccessHandler((res) => {
        if (res && res.status === 'success') {
          _writeGuruStatsCache(res);
          _applyGuruDashboardStats(res, !cachedStats);
        } else {
          ['valJtmTotal', 'valJtmBonus', 'valJtmToday', 'valGuruTransport'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<span class="text-red-400 text-sm">—</span>';
          });
        }
      }).withFailureHandler((err) => {
        if (cachedStats) return;
        ['valJtmTotal', 'valJtmBonus', 'valJtmToday', 'valGuruTransport'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.innerHTML = '<span class="text-red-400 text-sm">—</span>';
        });
      }).getDashboardStats(token);
      loadGuruTodayProgress(token);
      google.script.run
        .withSuccessHandler(renderScheduleTable)
        .withFailureHandler((err) => {
          const tb = document.getElementById('scheduleTableBody');
          if (tb) tb.innerHTML = errorTableRows(5, 'Gagal memuat jadwal: ' + err, 'loadGuruDashboardData(localStorage.getItem(\'auth_token\'))');
        })
        .getTodaySchedule(token);
      // Aktifkan marquee pada elemen statis (quick-action label, panel title)
      // setelah konten guru selesai dirender ke DOM
      setTimeout(_initDashboardMarquees, 400);
    }
    var _GURU_STATS_CACHE_TTL = 90 * 1000;
    function _guruStatsCacheKey() {
      var uid = String(localStorage.getItem('user_id') || 'me');
      return 'sim_guru_stats:' + uid;
    }
    function _readGuruStatsCache() {
      try {
        var raw = localStorage.getItem(_guruStatsCacheKey());
        if (!raw) return null;
        var obj = JSON.parse(raw);
        if (!obj || !obj._ts || (Date.now() - obj._ts) > _GURU_STATS_CACHE_TTL) return null;
        return obj.data;
      } catch (e) { return null; }
    }
    function _writeGuruStatsCache(data) {
      try {
        localStorage.setItem(_guruStatsCacheKey(), JSON.stringify({ _ts: Date.now(), data: data }));
      } catch (e) { }
    }
    function refreshGuruDashboardCards() {
      try { localStorage.removeItem(_guruStatsCacheKey()); } catch (_) { }
      var token = localStorage.getItem('auth_token');
      if (!token) return;
      var hasCardsOnPage = !!document.getElementById('valJtmTotal');
      if (hasCardsOnPage) {
        ['valJtmTotal', 'valJtmBonus', 'valEstHonor', 'valJtmToday', 'valGuruTransport'].forEach(function (id) {
          var el = document.getElementById(id);
          if (!el) return;
          if (id === 'valEstHonor' && localStorage.getItem('hide_honor_dashboard') === 'true') return;
          if (id === 'valGuruTransport' && localStorage.getItem('hide_transport_dashboard') === 'true') return;
          el.innerHTML = '<div class="skeleton h-7 w-16 rounded inline-block"></div>';
        });
      }
      if (typeof checkAndDisplayHolidayBonus === 'function') {
        try { checkAndDisplayHolidayBonus(token); } catch (_) { }
      }
      google.script.run
        .withSuccessHandler(function (res) {
          if (res && res.status === 'success') {
            _writeGuruStatsCache(res);
            if (hasCardsOnPage && typeof _applyGuruDashboardStats === 'function') {
              _applyGuruDashboardStats(res, true);
            }
          }
        })
        .withFailureHandler(function () {
        })
        .getDashboardStats(token);
      setTimeout(() => {
        if (typeof checkExamBannerForDashboard === 'function') {
          checkExamBannerForDashboard();
        }
      }, 300);
    }
    function _applyGuruDashboardStats(res, animate) {
      const elJtm = document.getElementById('valJtmTotal');
      const elBonus = document.getElementById('valJtmBonus');
      const elToday = document.getElementById('valJtmToday');
      var totalJtm = Number(res.total_jtm || 0);
      var bonusJtm = Number(res.bonus_jtm || 0);
      var todayJtm = Number(res.jtm_hari_ini || 0);
      if (animate) {
        if (elJtm) animateValue(elJtm, 0, totalJtm, 800);
        if (elBonus) animateValue(elBonus, 0, bonusJtm, 800);
        if (elToday) animateValue(elToday, 0, todayJtm, 700);
      } else {
        if (elJtm) elJtm.textContent = totalJtm;
        if (elBonus) elBonus.textContent = bonusJtm;
        if (elToday) elToday.textContent = todayJtm;
      }
      if (res.breakdown) {
        const detailDiv = document.getElementById('detailBonusJtm');
        const autoSpan = document.getElementById('valAutoLiburJtm');
        const estSpan = document.getElementById('valEstLiburJtm');
        if (detailDiv && (res.breakdown.auto_libur_jtm > 0 || res.breakdown.estimated_remaining > 0)) {
          detailDiv.classList.remove('hidden');
          if (autoSpan) autoSpan.textContent = res.breakdown.auto_libur_jtm;
          if (estSpan) estSpan.textContent = res.breakdown.estimated_remaining;
        } else if (detailDiv) {
          detailDiv.classList.add('hidden');
        }
        const eventJtmDiv = document.getElementById('detailEventJtm');
        const eventJtmSpan = document.getElementById('valEventJtm');
        const eventJtmVal = Number(res.breakdown.event_jtm || 0);
        if (eventJtmDiv) {
          if (eventJtmVal > 0) {
            eventJtmDiv.classList.remove('hidden');
            if (eventJtmSpan) eventJtmSpan.textContent = eventJtmVal;
          } else {
            eventJtmDiv.classList.add('hidden');
          }
        }
      }
      const elTransport = document.getElementById('valGuruTransport');
      const elTransportSub = document.getElementById('valGuruTransportSub');
      const transportCard = document.getElementById('guruTransportCard');
      if (elTransport) {
        if (!res.transport_enabled) {
          if (transportCard) transportCard.style.display = 'none';
        } else {
          if (transportCard) transportCard.style.display = '';
          const transportVal = Number(res.transport_monthly || 0);
          const transportFmt = res.transport_monthly_formatted || 'Rp 0';
          elTransport.setAttribute('data-value', transportFmt);
          updateTransportVisibilityUI();
          const isHiddenTransport = localStorage.getItem('hide_transport_dashboard') === 'true';
          if (!isHiddenTransport && animate) {
            animateRupiah(elTransport, transportFmt, 800);
          }
          if (elTransportSub) {
            elTransportSub.textContent = transportVal > 0 ? 'Tgl 1 s/d hari ini' : 'Belum ada data absensi';
          }
        }
      }
      const elHonor = document.getElementById('valEstHonor');
      if (elHonor) {
        elHonor.setAttribute('data-value', res.est_honor_formatted || '');
        updateHonorVisibilityUI();
        const isHidden = localStorage.getItem('hide_honor_dashboard') === 'true';
        if (!isHidden) {
          if (animate) {
            animateRupiah(elHonor, res.est_honor_formatted, 900);
          } else {
            elHonor.textContent = res.est_honor_formatted || '';
          }
        }
      }
    }
    function checkAndDisplayHolidayBonus(token) {
      google.script.run.withSuccessHandler((res) => {
        const banner = document.getElementById('bannerAutoJurnalLibur');
        const txtInfo = document.getElementById('txtLiburInfo');
        const valBonus = document.getElementById('valBonusJtmLibur');
        if (!banner || !txtInfo || !valBonus) return;
        const oldDetail = banner.querySelector('[data-libur-detail]');
        if (oldDetail) oldDetail.remove();
        if (res && res.status === 'success' && res.is_holiday) {
          banner.classList.remove('hidden');
          const today = new Date();
          const dateStr = formatDateID(today);
          txtInfo.innerText = `${dateStr} — ${res.my_schedule_count || 0} jadwal terhitung sebagai bonus libur`;
          animateValue(valBonus, 0, Number(res.my_bonus_jtm || 0), 900);
          if (res.has_auto_jurnal && res.my_auto_logs && res.my_auto_logs.length > 0) {
            const detail = document.createElement('div');
            detail.setAttribute('data-libur-detail', '1');
            detail.className = 'mt-3 bg-white/10 rounded-lg p-3 text-xs backdrop-blur-sm border border-white/10';
            detail.innerHTML = `
            <p class="font-bold mb-1.5 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
              Jurnal Otomatis Sudah Dibuat
            </p>
            <ul class="space-y-1 text-purple-100">
              ${res.my_auto_logs.map(log => {
              const parts = String(log.materi || '').split(' - ');
              const label = parts.length > 1 ? parts.slice(1).join(' - ') : (log.materi || 'Materi');
              return `<li class="flex items-center justify-between gap-2"><span>• ${escapeHtml(label)}</span><span class="font-mono font-bold">+${log.jtm_val} JTM</span></li>`;
            }).join('')}
            </ul>
          `;
            const inner = banner.querySelector('.relative.z-10');
            if (inner) inner.appendChild(detail);
          }
        } else {
          banner.classList.add('hidden');
        }
      }).withFailureHandler(() => {
        const banner = document.getElementById('bannerAutoJurnalLibur');
        if (banner) banner.classList.add('hidden');
      }).checkAutoJurnalStatus(token);
    }
    function animateValue(element, start, end, duration) {
      if (!element) return;
      const safeEnd = Number(end) || 0;
      const safeStart = Number(start) || 0;
      if (safeEnd === safeStart) {
        element.innerHTML = String(safeEnd);
        return;
      }
      let startTimestamp = null;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const linear = Math.min((timestamp - startTimestamp) / duration, 1);
        const progress = ease(linear);
        element.innerHTML = Math.floor(progress * (safeEnd - safeStart) + safeStart);
        if (linear < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.innerHTML = String(safeEnd);
        }
      };
      window.requestAnimationFrame(step);
    }
    function animateRupiah(element, endText, duration) {
      if (!element) return;
      duration = duration || 800;
      const numStr = String(endText || '').replace(/[^\d-]/g, '');
      const endVal = parseInt(numStr, 10) || 0;
      if (endVal === 0) {
        element.innerText = endText || 'Rp 0';
        return;
      }
      let startTimestamp = null;
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const linear = Math.min((timestamp - startTimestamp) / duration, 1);
        const progress = ease(linear);
        const v = Math.floor(progress * endVal);
        element.innerText = 'Rp ' + v.toLocaleString('id-ID');
        if (linear < 1) {
          window.requestAnimationFrame(step);
        } else {
          element.innerText = endText;
        }
      };
      window.requestAnimationFrame(step);
    }
    function renderScheduleTable(schedules) {
      const tbody = document.getElementById('scheduleTableBody');
      if (!tbody) return;
      if (!schedules || schedules.length === 0) {
        tbody.innerHTML = `
        <tr><td colspan="5" class="py-2">
          <div class="error-state-container">
            <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <p class="text-slate-500 font-semibold text-sm">Tidak ada jadwal hari ini</p>
            <p class="text-slate-400 text-xs mt-1">Nikmati waktu luang Anda 😊</p>
          </div>
        </td></tr>`;
        return;
      }
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      const toMin = (t) => {
        const parts = String(t || '00:00').split(':').map(Number);
        return (parts[0] || 0) * 60 + (parts[1] || 0);
      };
      const _attrEsc = (str) => String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, "\\'")
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      let html = '';
      // Jadwal hari ini saja; item H-1 (is_h_minus_1_eligible) dirender di loop khusus berikutnya
      const todaySchedules = schedules.filter(s => !s.is_h_minus_1_eligible);
      todaySchedules.forEach((s, idx) => {
        const tStart = formatTimeID(s.time_start);
        const tEnd = formatTimeID(s.time_end);
        const sMin = toMin(tStart);
        const eMin = toMin(tEnd);
        const isActive = nowMin >= sMin && nowMin <= eMin;
        const isUpcoming = nowMin < sMin && idx === todaySchedules.findIndex(x => toMin(formatTimeID(x.time_start)) > nowMin);
        const rowStyle = isActive
          ? ' style="background:linear-gradient(90deg,#FEFCE8,#FFFBEB);box-shadow:inset 3px 0 0 #F59E0B;"'
          : (isUpcoming ? ' style="background:linear-gradient(90deg,#EFF6FF,#F0F9FF);box-shadow:inset 3px 0 0 #3B82F6;"' : '');
        const liveBadge = isActive
          ? '<span class="inline-flex items-center gap-1 ml-1.5 text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider"><span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block"></span>Live</span>'
          : (isUpcoming ? '<span class="inline-flex items-center gap-1 ml-1.5 text-[9px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Berikutnya</span>' : '');
        const safeSubject = _attrEsc(s.subject);
        const safeClass = _attrEsc(s.class_name);
        const safeId = _attrEsc(s.id);
        let btnHtml = s.has_log
          ? `<button disabled class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed opacity-80">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            Sudah Diisi
          </button>`
          : `<button onclick="checkJournalAccess(${s.attendance_confirmed ? 1 : 0}, '${safeId}', '${safeSubject}', '${safeClass}', '${tStart}-${tEnd}', '${tEnd}', '${s.jtm_val}')"
              class="inline-flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Isi Jurnal
          </button>`;
        html += `<tr class="border-b hover:bg-slate-50 transition-colors"${rowStyle}>
        <td class="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm text-slate-600 whitespace-nowrap">${tStart} - ${tEnd}${liveBadge}</td>
        <td class="col-hide-xs px-3 sm:px-6 py-3 sm:py-4"><span class="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg text-xs font-bold">${escapeHtml(s.class_name)}</span></td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-slate-700 text-xs sm:text-sm" title="${escapeHtml(s.subject)}"><span class="db-marquee-wrap"><span class="db-marquee-inner">${escapeHtml(s.subject)}</span></span></td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-center font-bold text-blue-600 text-xs sm:text-sm" style="overflow:visible;white-space:normal;">${escapeHtml(String(s.jtm_val))}</td>
        <td class="px-3 sm:px-6 py-3 sm:py-4 text-center" style="overflow:visible;white-space:normal;">${btnHtml}</td>
      </tr>`;
      });
        // H-MINUS-1: Render item jadwal H-1 yang belum diisi
        schedules.filter(s => s.is_h_minus_1_eligible).forEach((s, hidx) => {
          const safeId = _attrEsc(s.id);
          const safeSubject = _attrEsc(s.subject);
          const safeClass = _attrEsc(s.class_name);
          const h1JtmVal = s.h1_eligible_jtm !== undefined ? s.h1_eligible_jtm : s.jtm_val;
          const h1DateStr = s.h1_target_date || '';
          const h1Confirmed = !!s.attendance_confirmed;
          const h1Replaced  = !!s.h1_is_replaced;
          let h1BtnHtml;
          if (h1Replaced) {
            // Jadwal kemarin digantikan — tidak bisa isi jurnal
            h1BtnHtml = `<button disabled class="inline-flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-not-allowed opacity-80" title="Jadwal kemarin digantikan guru lain">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
              Digantikan
            </button>`;
          } else if (!h1Confirmed) {
            // Kehadiran kemarin belum dikonfirmasi — blokir dengan pesan
            h1BtnHtml = `<button onclick="showToast('Kehadiran Anda pada jadwal kemarin belum dikonfirmasi oleh Admin atau Guru Piket. Hubungi Admin terlebih dahulu.','error',6000)"
                class="inline-flex items-center gap-1.5 bg-red-50 text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all" title="Kehadiran kemarin belum dikonfirmasi">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Belum Dikonfirmasi
            </button>`;
          } else {
            h1BtnHtml = `<button onclick="openH1JournalModal('${safeId}', '${safeSubject}', '${safeClass}', '${s.time_start}-${s.time_end}', '${h1DateStr}', '${h1JtmVal}')"
                class="inline-flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all shadow-sm hover:shadow-md">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Isi Jurnal H-1
            </button>`;
          }
          html += `<tr class="border-b hover:bg-amber-50 transition-colors" style="background:linear-gradient(90deg,#FFFBEB,#FEF3C7);box-shadow:inset 3px 0 0 #F59E0B;">
          <td class="px-3 sm:px-6 py-3 sm:py-4 font-mono text-xs sm:text-sm text-amber-700 whitespace-nowrap">${escapeHtml(s.time_start)} - ${escapeHtml(s.time_end)}<span class="inline-flex items-center gap-1 ml-1.5 text-[9px] font-extrabold bg-amber-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">H-1</span></td>
          <td class="col-hide-xs px-3 sm:px-6 py-3 sm:py-4"><span class="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold">${escapeHtml(s.class_name)}</span></td>
          <td class="px-3 sm:px-6 py-3 sm:py-4 text-amber-700 text-xs sm:text-sm" title="${escapeHtml(s.subject)}"><span class="db-marquee-wrap"><span class="db-marquee-inner">${escapeHtml(s.subject)}</span></span></td>
          <td class="px-3 sm:px-6 py-3 sm:py-4 text-center text-xs sm:text-sm" style="overflow:visible;white-space:normal;">
            <span class="font-bold text-amber-600">${escapeHtml(String(h1JtmVal))}</span>
            <span class="block text-[10px] text-amber-400 font-medium">JTM (80%)</span>
          </td>
          <td class="px-3 sm:px-6 py-3 sm:py-4 text-center" style="overflow:visible;white-space:normal;">${h1BtnHtml}</td>
        </tr>`;
        });
      tbody.innerHTML = html;
      // Aktifkan marquee setelah browser selesai layout (double-rAF)
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          _initDashboardMarquees(tbody.closest('.db-panel') || document);
        });
      });
    }  
    