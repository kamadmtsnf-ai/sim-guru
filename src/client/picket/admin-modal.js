var _apmCache = null;           // cache hasil getAdminDashboardPicketStatus
    var _apmContext = null;         // context piket yang sedang dibuka di modal
    var _apmInFlight = false;       // mencegah double-submit

    /**
     * Mendeteksi semua .db-marquee-wrap di halaman, lalu menambahkan
     * class `is-overflow` hanya jika teks benar-benar melebihi container
     * (scrollWidth > clientWidth). Animasi marquee aktif lewat CSS hanya
     * di layar < 480px saat class is-overflow ada.
     */
    function _initDashboardMarquees(root) {
      var scope = root || document;
      var wraps = scope.querySelectorAll('.db-marquee-wrap');
      wraps.forEach(function(wrap) {
        var inner = wrap.querySelector('.db-marquee-inner');
        if (!inner) return;
        // Skip elemen yang tidak visible — clientWidth/scrollWidth tidak bisa diukur
        // saat parent punya display:none (panel hidden)
        if (wrap.offsetParent === null && wrap.clientWidth === 0) return;
        // Reset dulu agar re-check akurat
        wrap.classList.remove('is-overflow');
        inner.style.animation = 'none';
        // Paksa reflow pada INNER (bukan wrap) agar browser flush animasi CSS
        void inner.offsetWidth;
        inner.style.animation = '';
        // Cek apakah teks melebar melebihi wrapper
        if (inner.scrollWidth > wrap.clientWidth + 2) {
          wrap.classList.add('is-overflow');
        }
      });
    }
    // Re-check marquee setiap kali ukuran window berubah (rotasi layar, resize desktop)
    (function() {
      var _marqueeResizeTimer = null;
      window.addEventListener('resize', function() {
        clearTimeout(_marqueeResizeTimer);
        _marqueeResizeTimer = setTimeout(function() {
          if (typeof _initDashboardMarquees === 'function') _initDashboardMarquees();
        }, 150);
      });
    })();

    /**
     * Memuat data piket hari ini dan merender panel di dashboard admin.
     */
    function loadAdminDashboardPicket() {
      const token = localStorage.getItem('auth_token');
      const body  = document.getElementById('admPiketPanelBody');
      const badge = document.getElementById('admPiketBadge');
      if (!body) return;

      body.innerHTML = `
        <div class="space-y-3">
          <div class="skeleton h-20 rounded-xl w-full"></div>
          <div class="skeleton h-20 rounded-xl w-full"></div>
        </div>`;
      if (badge) {
        badge.innerText = 'Memuat...';
        badge.style.cssText = 'background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;';
      }

      google.script.run
        .withSuccessHandler(function(res) {
          _apmCache = res;
          _apmRenderPanel(res);
        })
        .withFailureHandler(function(err) {
          if (body) body.innerHTML = `<p class="text-sm text-red-500 py-4 text-center">Gagal memuat data piket: ${escapeHtml(String(err))}</p>`;
        })
        .getAdminDashboardPicketStatus(token);
    }

    /**
     * Merender daftar kartu piket di dalam panel dashboard.
     */
    function _apmRenderPanel(res) {
      const body  = document.getElementById('admPiketPanelBody');
      const badge = document.getElementById('admPiketBadge');
      if (!body) return;

      if (!res || res.status !== 'success') {
        body.innerHTML = `<p class="text-sm text-slate-400 italic py-4 text-center">Tidak ada jadwal piket yang ditemukan.</p>`;
        if (badge) { badge.innerText = 'Tidak ada piket'; badge.style.cssText = 'background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;'; }
        return;
      }

      const items = res.picket_items || [];
      if (items.length === 0) {
        body.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 text-slate-400">
            <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-3">
              <svg class="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-500">Tidak ada guru piket hari ini</p>
            <p class="text-xs text-slate-400 mt-1">Jadwal piket belum diatur untuk hari ini</p>
          </div>`;
        if (badge) { badge.innerText = 'Tidak ada piket'; badge.style.cssText = 'background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;'; }
        return;
      }

      const confirmedCount = items.filter(function(i) {
        return i.is_confirmed || (i.substitute && i.substitute.is_confirmed);
      }).length;
      const allDone = confirmedCount === items.length;

      if (badge) {
        badge.innerText = confirmedCount + '/' + items.length + ' terkonfirmasi';
        badge.style.cssText = allDone
          ? 'background:#ECFDF5;color:#047857;border:1px solid #A7F3D0;'
          : 'background:#FEF3C7;color:#92400E;border:1px solid #FCD34D;';
      }

      let html = '<div class="space-y-3">';
      items.forEach(function(item, idx) {
        html += _apmBuildCard(item, idx);
      });
      html += '</div>';
      body.innerHTML = html;
      // Aktifkan marquee pada nama guru yang baru dirender (double-rAF
      // memastikan browser selesai layout sebelum scrollWidth diukur)
      requestAnimationFrame(function() {
        requestAnimationFrame(function() { _initDashboardMarquees(body); });
      });
    }
    
    function _apmBuildCard(item, idx) {
      const sub = item.substitute;
      const hasSubst = !!sub;

      // Tentukan state kartu
      const isConfirmed = hasSubst ? sub.is_confirmed : item.is_confirmed;
      const cardClass = hasSubst
        ? 'has-substitute'
        : (isConfirmed ? 'is-confirmed' : 'is-unconfirmed');
      const accentColor = hasSubst ? '#6366F1' : (isConfirmed ? '#10B981' : '#F59E0B');

      // Status konfirmasi
      const confirmBadgeHtml = isConfirmed
        ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Sudah Hadir</span>`
        : `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>Belum Konfirmasi</span>`;

      // Jam masuk/pulang
      const activeTimeIn  = hasSubst ? (sub.time_in  || null) : (item.time_in  || null);
      const activeTimeOut = hasSubst ? (sub.time_out || null) : (item.time_out || null);
      const timeHtml = (activeTimeIn || activeTimeOut)
        ? `<div class="flex items-center gap-2 flex-wrap mt-2">
            ${activeTimeIn  ? `<span class="db-piket-time-badge" style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;">▶ Masuk: ${escapeHtml(activeTimeIn)}</span>` : ''}
            ${activeTimeOut ? `<span class="db-piket-time-badge" style="background:#FFF1F2;color:#9F1239;border:1px solid #FECDD3;">⏹ Pulang: ${escapeHtml(activeTimeOut)}</span>` : ''}
           </div>`
        : `<div class="mt-2"><span class="db-piket-time-badge" style="background:#F1F5F9;color:#64748B;border:1px solid #E2E8F0;">Jam belum diinput</span></div>`;

      // Nama yang aktif
      const activeName    = hasSubst ? sub.name  : item.name;
      const activeInitial = (activeName || '?').charAt(0).toUpperCase();

      // Badge pengganti
      const substBadge = hasSubst
        ? `<span class="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 ml-1 whitespace-nowrap">
             <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>Pengganti
           </span>`
        : '';

      const origHint = hasSubst
        ? `<p class="text-[10px] text-slate-400 mt-0.5">Menggantikan: <span class="font-semibold text-slate-600">${escapeHtml(item.name)}</span></p>`
        : '';

      return `
        <div class="db-piket-card ${cardClass} animate-fade-in" style="animation-delay:${idx * 50}ms;" data-piket-idx="${idx}">
          <div class="db-piket-card-accent" style="background:${accentColor};"></div>
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm flex-shrink-0 border-2"
              style="background:${hasSubst ? '#EEF2FF' : (isConfirmed ? '#ECFDF5' : '#FEF3C7')};
                     color:${hasSubst ? '#4F46E5' : (isConfirmed ? '#065F46' : '#92400E')};
                     border-color:${hasSubst ? '#C7D2FE' : (isConfirmed ? '#A7F3D0' : '#FCD34D')};">
              ${escapeHtml(activeInitial)}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 min-w-0">
                <p class="text-sm font-bold text-slate-800 truncate flex-1 min-w-0"><span class="db-marquee-wrap"><span class="db-marquee-inner">${escapeHtml(activeName)}</span></span></p>
                <span class="flex-shrink-0">${substBadge}</span>
              </div>
              ${origHint}
              <div class="flex flex-wrap items-center gap-1.5 mt-1">
                ${confirmBadgeHtml}
              </div>
              ${timeHtml}
            </div>
            <button
              onclick="openAdminPicketModal(${idx})"
              class="db-piket-action-btn flex-shrink-0"
              style="background:${accentColor};color:white;border-color:transparent;"
              title="Kelola piket ini">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Kelola
            </button>
          </div>
        </div>`;
    }

    /**
     * Membuka modal manajemen piket untuk item tertentu (berdasarkan index di cache).
     */
    function openAdminPicketModal(idx) {
      if (!_apmCache || !_apmCache.picket_items) return;
      const item = _apmCache.picket_items[idx];
      if (!item) return;

      // Reset state — pastikan tidak ada state sisa dari pembukaan sebelumnya
      _apmInFlight = false;
      _apmContext  = { item: item, idx: idx };

      const modal = document.getElementById('adminPicketModal');
      if (!modal) return;

      // Bersihkan note dinamis terlebih dahulu sebelum populasi ulang
      const staleNote = document.getElementById('apmSubstDisabledNote');
      if (staleNote) staleNote.remove();

      const sub      = item.substitute;
      const hasSubst = !!sub;

      // --- Header ---
      const title    = document.getElementById('apmModalTitle');
      const subtitle = document.getElementById('apmModalSubtitle');
      const nameShort = (item.name || '').split(' ').slice(0, 2).join(' ') || '—';
      if (title)    title.innerText    = 'Kelola Piket: ' + nameShort;
      if (subtitle) subtitle.innerText = hasSubst ? 'Piket asli + pengganti aktif' : 'Guru piket hari ini';

      // --- Info guru aktif ---
      const avatar    = document.getElementById('apmGuruAvatar');
      const nameEl    = document.getElementById('apmGuruName');
      const roleBadge = document.getElementById('apmRoleBadge');
      const confBadge = document.getElementById('apmConfirmBadge');
      const confDot   = document.getElementById('apmConfirmDot');
      const confText  = document.getElementById('apmConfirmText');

      const activeIsConfirmed = hasSubst ? sub.is_confirmed : item.is_confirmed;
      const displayName       = hasSubst ? sub.name : item.name;
      const initial           = (displayName || '?').charAt(0).toUpperCase();

      if (avatar) {
        avatar.innerText = initial;
        avatar.style.cssText = hasSubst
          ? 'background:#EEF2FF;color:#4F46E5;border-color:#C7D2FE;'
          : (activeIsConfirmed
              ? 'background:#ECFDF5;color:#065F46;border-color:#A7F3D0;'
              : 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;');
      }
      if (nameEl) nameEl.innerText = displayName || '—';

      if (roleBadge) {
        const dot  = '<span class="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style="background:' + (hasSubst ? '#6366F1' : '#F59E0B') + '"></span>';
        const text = '<span>' + (hasSubst ? 'Guru Piket Pengganti' : 'Guru Piket') + '</span>';
        roleBadge.innerHTML = dot + text;
        roleBadge.style.cssText = hasSubst
          ? 'background:#EEF2FF;color:#4338CA;border-color:#C7D2FE;'
          : 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;';
      }

      if (confDot && confText && confBadge) {
        confDot.style.background  = activeIsConfirmed ? '#10B981' : '#F59E0B';
        confText.innerText        = activeIsConfirmed ? 'Sudah Dikonfirmasi' : 'Belum Dikonfirmasi';
        confBadge.style.cssText   = activeIsConfirmed
          ? 'background:#ECFDF5;color:#065F46;border-color:#A7F3D0;'
          : 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;';
      }

      // --- Section ① Konfirmasi — toggle tombol via class, bukan style ---
      const btnKonfirmasi      = document.getElementById('apmBtnKonfirmasi');
      const btnBatalKonfirmasi = document.getElementById('apmBtnBatalKonfirmasi');
      if (btnKonfirmasi)      btnKonfirmasi.disabled      = false;
      if (btnBatalKonfirmasi) btnBatalKonfirmasi.disabled  = false;
      // Reset label tombol (sehingga tidak tersisa teks "Mengonfirmasi..." dari sesi sebelumnya)
      if (btnKonfirmasi) {
        btnKonfirmasi.innerHTML =
          '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>Konfirmasi Hadir</span>';
      }
      if (btnBatalKonfirmasi) {
        btnBatalKonfirmasi.innerHTML =
          '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg><span>Batalkan Konfirmasi</span>';
      }
      if (btnKonfirmasi && btnBatalKonfirmasi) {
        if (activeIsConfirmed) {
          btnKonfirmasi.classList.add('hidden');
          btnBatalKonfirmasi.classList.remove('hidden');
          btnBatalKonfirmasi.classList.add('flex');
        } else {
          btnKonfirmasi.classList.remove('hidden');
          btnBatalKonfirmasi.classList.add('hidden');
          btnBatalKonfirmasi.classList.remove('flex');
        }
      }

      // --- Section ② Pengganti ---
      const substInfo = document.getElementById('apmSubstInfo');
      const substForm = document.getElementById('apmSubstForm');
      const substName = document.getElementById('apmSubstName');
      const substAvat = document.getElementById('apmSubstAvatar');
      const substConf = document.getElementById('apmSubstConfirmBadge');
      const substSel  = document.getElementById('apmSubstSelect');

      if (hasSubst) {
        if (substInfo) substInfo.classList.remove('hidden');
        if (substForm) substForm.classList.add('hidden');
        if (substName) substName.innerText = sub.name || '—';
        if (substAvat) substAvat.innerText = (sub.name || '?').charAt(0).toUpperCase();
        if (substConf) {
          if (sub.is_confirmed) {
            substConf.innerText    = '✅ Sudah Konfirmasi';
            substConf.style.cssText = 'background:#ECFDF5;color:#065F46;border-color:#A7F3D0;';
          } else {
            substConf.innerText    = '⏳ Belum Konfirmasi';
            substConf.style.cssText = 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;';
          }
        }
      } else {
        if (substInfo) substInfo.classList.add('hidden');
        if (substForm) substForm.classList.remove('hidden');

        // Isi dropdown guru (dari cache), kecualikan guru piket asli
        if (substSel && _apmCache.teacher_list) {
          let opts = '<option value="">— Pilih Guru Pengganti —</option>';
          _apmCache.teacher_list.forEach(function(t) {
            if (String(t.id) !== String(item.user_id)) {
              opts += '<option value="' + escapeHtml(String(t.id)) + '">' + escapeHtml(t.name) + '</option>';
            }
          });
          substSel.innerHTML = opts;
        }

        // Disable form jika guru asli sudah hadir
        const btnTunjuk = document.getElementById('apmBtnTunjukPengganti');
        if (btnTunjuk) {
          // Reset label tunjuk terlebih dahulu
          btnTunjuk.querySelector('span') && (btnTunjuk.querySelector('span').innerText = 'Tunjuk Sebagai Pengganti');
        }
        if (item.is_confirmed) {
          if (substSel) { substSel.disabled = true; substSel.style.opacity = '0.5'; substSel.style.cursor = 'not-allowed'; }
          if (btnTunjuk) { btnTunjuk.disabled = true; btnTunjuk.classList.add('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
          // Sisipkan catatan (hanya jika belum ada)
          if (!document.getElementById('apmSubstDisabledNote') && btnTunjuk && btnTunjuk.parentNode) {
            const note = document.createElement('p');
            note.id        = 'apmSubstDisabledNote';
            note.className = 'flex items-start gap-1.5 text-[11px] text-emerald-700 font-semibold mt-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2';
            note.innerHTML = '<svg class="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>Guru piket sudah hadir &amp; dikonfirmasi — pengganti tidak diperlukan.';
            btnTunjuk.parentNode.insertBefore(note, btnTunjuk.nextSibling);
          }
        } else {
          if (substSel) { substSel.disabled = false; substSel.style.opacity = ''; substSel.style.cursor = ''; }
          if (btnTunjuk) { btnTunjuk.disabled = false; btnTunjuk.classList.remove('opacity-50', 'cursor-not-allowed', 'pointer-events-none'); }
        }
      }

      // --- Section ③ Jam ---
      const jamOrigSection  = document.getElementById('apmJamOrigSection');
      const jamSubstSection = document.getElementById('apmJamSubstSection');
      const jamOrigLabel    = document.getElementById('apmJamOrigLabel');
      const jamSubstLabel   = document.getElementById('apmJamSubstLabel');
      const tInOrig         = document.getElementById('apmTimeInOrig');
      const tOutOrig        = document.getElementById('apmTimeOutOrig');
      const tInSubst        = document.getElementById('apmTimeInSubst');
      const tOutSubst       = document.getElementById('apmTimeOutSubst');
      // Reset tombol simpan
      ['apmBtnSaveTimeOrig', 'apmBtnSaveTimeSubst'].forEach(function(id) {
        const b = document.getElementById(id);
        if (b) { b.disabled = false; if (b.querySelector('span')) b.querySelector('span').innerText = id === 'apmBtnSaveTimeOrig' ? 'Simpan Jam Piket Asli' : 'Simpan Jam Pengganti'; }
      });

      if (jamOrigLabel) jamOrigLabel.innerText = item.name || 'Guru Piket Asli';
      if (tInOrig)  tInOrig.value  = item.time_in  || '';
      if (tOutOrig) tOutOrig.value = item.time_out || '';

      if (hasSubst) {
        if (jamOrigSection)  jamOrigSection.classList.add('hidden');
        if (jamSubstSection) jamSubstSection.classList.remove('hidden');
        if (jamSubstLabel)   jamSubstLabel.innerText = sub.name || 'Guru Piket Pengganti';
        if (tInSubst)  tInSubst.value  = sub.time_in  || '';
        if (tOutSubst) tOutSubst.value = sub.time_out || '';
      } else {
        if (jamOrigSection)  jamOrigSection.classList.remove('hidden');
        if (jamSubstSection) jamSubstSection.classList.add('hidden');
      }

      // Tampilkan modal — gunakan class overflow-hidden agar konsisten dengan sistem lain
      modal.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    }

    function closeAdminPicketModal() {
      const modal = document.getElementById('adminPicketModal');
      if (modal) modal.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
      // Bersihkan note dinamis agar tidak tersisa saat modal dibuka ulang
      const staleNote = document.getElementById('apmSubstDisabledNote');
      if (staleNote) staleNote.remove();
      _apmContext  = null;
      _apmInFlight = false;
    }

    // Konfirmasi kehadiran piket
    function apmDoKonfirmasi() {
      if (_apmInFlight) return;
      if (!_apmContext) return;
      const item     = _apmContext.item;
      const sub      = item.substitute;
      const hasSubst = !!sub;
      const userId   = hasSubst ? sub.user_id : item.user_id;
      const name     = hasSubst ? sub.name    : item.name;
      const token    = localStorage.getItem('auth_token');

      _apmInFlight = true;
      const btn = document.getElementById('apmBtnKonfirmasi');
      const _svgCheck = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
      const _svgSpin  = '<svg class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>';
      if (btn) { btn.disabled = true; btn.innerHTML = _svgSpin + '<span>Mengonfirmasi...</span>'; }

      google.script.run
        .withSuccessHandler(function(res) {
          _apmInFlight = false;
          if (res && res.status === 'success') {
            showToast('Kehadiran ' + escapeHtml(name) + ' berhasil dikonfirmasi.', 'success');
            closeAdminPicketModal();
            loadAdminDashboardPicket();
          } else {
            if (btn) { btn.disabled = false; btn.innerHTML = _svgCheck + '<span>Konfirmasi Hadir</span>'; }
            showToast((res && res.message) || 'Gagal mengonfirmasi kehadiran.', 'error');
          }
        })
        .withFailureHandler(function(err) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgCheck + '<span>Konfirmasi Hadir</span>'; }
          showToast('Koneksi gagal. Periksa koneksi internet Anda.', 'error');
        })
        .confirmPicketSubPresenceBackend(token, userId);
    }

    // Batalkan konfirmasi piket
    function apmDoRevokeKonfirmasi() {
      if (_apmInFlight) return;
      if (!_apmContext) return;
      const item     = _apmContext.item;
      const sub      = item.substitute;
      const hasSubst = !!sub;
      const userId   = hasSubst ? sub.user_id : item.user_id;
      const name     = hasSubst ? sub.name    : item.name;
      const token    = localStorage.getItem('auth_token');

      showConfirm(
        'Batalkan Konfirmasi Piket',
        'Apakah Anda yakin ingin <strong>membatalkan konfirmasi kehadiran</strong> ' + escapeHtml(name) + '? JTM piket akan dihapus dari sistem honorarium.',
        function() {
          _apmInFlight = true;
          const btn = document.getElementById('apmBtnBatalKonfirmasi');
          const _svgX    = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>';
          const _svgSpin = '<svg class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>';
          if (btn) { btn.disabled = true; btn.innerHTML = _svgSpin + '<span>Membatalkan...</span>'; }
          google.script.run
            .withSuccessHandler(function(res) {
              _apmInFlight = false;
              if (res && res.status === 'success') {
                showToast('Konfirmasi kehadiran ' + escapeHtml(name) + ' dibatalkan.', 'warning');
                closeAdminPicketModal();
                loadAdminDashboardPicket();
              } else {
                if (btn) { btn.disabled = false; btn.innerHTML = _svgX + '<span>Batalkan Konfirmasi</span>'; }
                showToast((res && res.message) || 'Gagal membatalkan konfirmasi.', 'error');
              }
            })
            .withFailureHandler(function(err) {
              _apmInFlight = false;
              if (btn) { btn.disabled = false; btn.innerHTML = _svgX + '<span>Batalkan Konfirmasi</span>'; }
              showToast('Koneksi gagal. Periksa koneksi internet Anda.', 'error');
            })
            .revokePicketDaily(token, userId);
        },
        { type: 'danger' }
      );
    }

    // Tunjuk guru pengganti piket
    function apmDoTunjukPengganti() {
      if (_apmInFlight) return;
      if (!_apmContext) return;
      const item  = _apmContext.item;
      const sel   = document.getElementById('apmSubstSelect');
      const token = localStorage.getItem('auth_token');
      if (!sel || !sel.value) {
        showToast('Pilih guru pengganti terlebih dahulu.', 'warning');
        if (sel) {
          sel.focus();
          sel.style.borderColor = '#F59E0B';
          sel.style.boxShadow   = '0 0 0 3px rgba(245,158,11,0.15)';
          setTimeout(function() { sel.style.borderColor = ''; sel.style.boxShadow = ''; }, 2000);
        }
        return;
      }
      const substId   = sel.value;
      const substName = sel.options[sel.selectedIndex].text;

      _apmInFlight = true;
      const btn = document.getElementById('apmBtnTunjukPengganti');
      const _svgAdd  = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>';
      const _svgSpin = '<svg class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>';
      if (btn) { btn.disabled = true; btn.innerHTML = _svgSpin + '<span>Menunjuk...</span>'; }

      google.script.run
        .withSuccessHandler(function(res) {
          _apmInFlight = false;
          if (btn) btn.disabled = false;
          if (res && res.status === 'success') {
            showToast(escapeHtml(substName) + ' berhasil ditunjuk sebagai piket pengganti.', 'success');
            if (_apmContext && _apmContext.item) {
              _apmContext.item.substitute = {
                user_id:      substId,
                name:         substName,
                is_confirmed: false,
                time_in:      null,
                time_out:     null,
                att_id:       null,
              };
            }
            _apmRefreshModalAfterSubstitute();
            loadAdminDashboardPicket();
          } else if (res && res.collision) {
            if (btn) btn.innerHTML = _svgAdd + '<span>Tunjuk Sebagai Pengganti</span>';
            showToast((res.message || 'Sudah ada guru pengganti.') + ' Batalkan dulu lewat halaman Piket.', 'warning', 6000);
          } else {
            if (btn) btn.innerHTML = _svgAdd + '<span>Tunjuk Sebagai Pengganti</span>';
            showToast((res && res.message) || 'Gagal menunjuk pengganti.', 'error');
          }
        })
        .withFailureHandler(function(err) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgAdd + '<span>Tunjuk Sebagai Pengganti</span>'; }
          showToast('Koneksi gagal. Periksa koneksi internet Anda.', 'error');
        })
        .substitutePicketDaily(token, item.user_id, substId);
    }

    /**
     * Memperbarui tampilan modal manajemen piket secara in-place setelah
     * guru pengganti berhasil ditunjuk, tanpa menutup modal.
     * Menggunakan data dari _apmContext.item.substitute yang sudah diperbarui.
     */
    function _apmRefreshModalAfterSubstitute() {
      if (!_apmContext || !_apmContext.item) return;
      const item = _apmContext.item;
      const sub  = item.substitute;
      if (!sub) return;

      // --- Perbarui header subtitle ---
      const subtitle = document.getElementById('apmModalSubtitle');
      if (subtitle) subtitle.innerText = 'Piket asli + pengganti aktif';

      // --- Perbarui info guru aktif (pengganti yang baru ditunjuk) ---
      const avatar    = document.getElementById('apmGuruAvatar');
      const nameEl    = document.getElementById('apmGuruName');
      const roleBadge = document.getElementById('apmRoleBadge');
      const confDot   = document.getElementById('apmConfirmDot');
      const confText  = document.getElementById('apmConfirmText');
      const confBadge = document.getElementById('apmConfirmBadge');

      const initial = (sub.name || '?').charAt(0).toUpperCase();
      if (avatar) {
        avatar.innerText       = initial;
        avatar.style.cssText   = 'background:#EEF2FF;color:#4F46E5;border-color:#C7D2FE;';
      }
      if (nameEl) nameEl.innerText = sub.name || '—';
      if (roleBadge) {
        roleBadge.innerHTML    = '<span class="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style="background:#6366F1"></span><span>Guru Piket Pengganti</span>';
        roleBadge.style.cssText = 'background:#EEF2FF;color:#4338CA;border-color:#C7D2FE;';
      }
      if (confDot)   confDot.style.background = '#F59E0B';
      if (confText)  confText.innerText        = 'Belum Dikonfirmasi';
      if (confBadge) confBadge.style.cssText   = 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;';

      // --- Perbarui Section ① Konfirmasi: tampilkan tombol konfirmasi ---
      const btnKonfirmasi      = document.getElementById('apmBtnKonfirmasi');
      const btnBatalKonfirmasi = document.getElementById('apmBtnBatalKonfirmasi');
      if (btnKonfirmasi) {
        btnKonfirmasi.disabled  = false;
        btnKonfirmasi.innerHTML = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg><span>Konfirmasi Hadir</span>';
        btnKonfirmasi.classList.remove('hidden');
      }
      if (btnBatalKonfirmasi) {
        btnBatalKonfirmasi.classList.add('hidden');
        btnBatalKonfirmasi.classList.remove('flex');
      }

      // --- Perbarui Section ② Pengganti: ganti form ke info pengganti ---
      const substInfo = document.getElementById('apmSubstInfo');
      const substForm = document.getElementById('apmSubstForm');
      const substName = document.getElementById('apmSubstName');
      const substAvat = document.getElementById('apmSubstAvatar');
      const substConf = document.getElementById('apmSubstConfirmBadge');
      const staleNote = document.getElementById('apmSubstDisabledNote');
      if (staleNote) staleNote.remove();

      if (substInfo) substInfo.classList.remove('hidden');
      if (substForm) substForm.classList.add('hidden');
      if (substName) substName.innerText = sub.name || '—';
      if (substAvat) substAvat.innerText = initial;
      if (substConf) {
        substConf.innerText    = '⏳ Belum Konfirmasi';
        substConf.style.cssText = 'background:#FEF3C7;color:#92400E;border-color:#FCD34D;';
      }

      // --- Perbarui Section ③ Jam: tampilkan input jam pengganti (kosong) ---
      const jamOrigSection  = document.getElementById('apmJamOrigSection');
      const jamSubstSection = document.getElementById('apmJamSubstSection');
      const jamSubstLabel   = document.getElementById('apmJamSubstLabel');
      const tInSubst        = document.getElementById('apmTimeInSubst');
      const tOutSubst       = document.getElementById('apmTimeOutSubst');
      const btnSaveSubst    = document.getElementById('apmBtnSaveTimeSubst');

      if (jamOrigSection)  jamOrigSection.classList.add('hidden');
      if (jamSubstLabel)   jamSubstLabel.innerText = sub.name || 'Guru Piket Pengganti';
      if (tInSubst)        tInSubst.value  = '';
      if (tOutSubst)       tOutSubst.value = '';
      if (btnSaveSubst) {
        btnSaveSubst.disabled  = false;
        if (btnSaveSubst.querySelector('span')) btnSaveSubst.querySelector('span').innerText = 'Simpan Jam Pengganti';
      }
      if (jamSubstSection) {
        jamSubstSection.classList.remove('hidden');
        // Scroll ke section jam agar admin langsung melihat input
        setTimeout(function() {
          jamSubstSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
      }
    }

    // Simpan jam piket asli
    function apmDoSaveTimeOrig() {
      if (_apmInFlight) return;
      if (!_apmContext) return;
      const item    = _apmContext.item;
      const timeIn  = (document.getElementById('apmTimeInOrig')  || {}).value || '';
      const timeOut = (document.getElementById('apmTimeOutOrig') || {}).value || '';
      const token   = localStorage.getItem('auth_token');

      if (!timeIn && !timeOut) { showToast('Isi minimal satu jam (masuk atau pulang).', 'warning'); return; }
      if (timeIn && timeOut && timeIn >= timeOut) { showToast('Jam Masuk harus lebih awal dari Jam Pulang.', 'error'); return; }

      _apmInFlight = true;
      const btn     = document.getElementById('apmBtnSaveTimeOrig');
      const _svgSave = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>';
      const _svgSpin = '<svg class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>';
      if (btn) { btn.disabled = true; btn.innerHTML = _svgSpin + '<span>Menyimpan...</span>'; }

      google.script.run
        .withSuccessHandler(function(res) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgSave + '<span>Simpan Jam Piket Asli</span>'; }
          if (res && res.status === 'success') {
            showToast('Jam piket ' + escapeHtml(item.name) + ' berhasil disimpan.', 'success');
            if (res.att_id && _apmContext) _apmContext.item.att_id = res.att_id;
            loadAdminDashboardPicket();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan jam.', 'error');
          }
        })
        .withFailureHandler(function(err) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgSave + '<span>Simpan Jam Piket Asli</span>'; }
          showToast('Koneksi gagal. Periksa koneksi internet Anda.', 'error');
        })
        .adminInputPicketTime(token, {
          user_id:  item.user_id,
          time_in:  timeIn,
          time_out: timeOut,
          att_id:   item.att_id || '',
        });
    }

    // Simpan jam piket pengganti
    function apmDoSaveTimeSubst() {
      if (_apmInFlight) return;
      if (!_apmContext) return;
      const item    = _apmContext.item;
      const sub     = item.substitute;
      if (!sub) { showToast('Tidak ada pengganti pada piket ini.', 'warning'); return; }
      const timeIn  = (document.getElementById('apmTimeInSubst')  || {}).value || '';
      const timeOut = (document.getElementById('apmTimeOutSubst') || {}).value || '';
      const token   = localStorage.getItem('auth_token');

      if (!timeIn && !timeOut) { showToast('Isi minimal satu jam (masuk atau pulang).', 'warning'); return; }
      if (timeIn && timeOut && timeIn >= timeOut) { showToast('Jam Masuk harus lebih awal dari Jam Pulang.', 'error'); return; }

      _apmInFlight = true;
      const btn     = document.getElementById('apmBtnSaveTimeSubst');
      const _svgSave = '<svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>';
      const _svgSpin = '<svg class="w-4 h-4 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>';
      if (btn) { btn.disabled = true; btn.innerHTML = _svgSpin + '<span>Menyimpan...</span>'; }

      google.script.run
        .withSuccessHandler(function(res) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgSave + '<span>Simpan Jam Pengganti</span>'; }
          if (res && res.status === 'success') {
            showToast('Jam pengganti ' + escapeHtml(sub.name) + ' berhasil disimpan.', 'success');
            if (res.att_id && _apmContext && _apmContext.item && _apmContext.item.substitute) {
              _apmContext.item.substitute.att_id = res.att_id;
            }
            loadAdminDashboardPicket();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan jam.', 'error');
          }
        })
        .withFailureHandler(function(err) {
          _apmInFlight = false;
          if (btn) { btn.disabled = false; btn.innerHTML = _svgSave + '<span>Simpan Jam Pengganti</span>'; }
          showToast('Koneksi gagal. Periksa koneksi internet Anda.', 'error');
        })
        .adminInputPicketTime(token, {
          user_id:  sub.user_id,
          time_in:  timeIn,
          time_out: timeOut,
          att_id:   sub.att_id || '',
        });
    }

    // Tutup modal piket saat klik backdrop
    document.addEventListener('click', function(e) {
      const modal = document.getElementById('adminPicketModal');
      if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        closeAdminPicketModal();
      }
    });
    // END PANEL PIKET DASHBOARD ADMIN

    