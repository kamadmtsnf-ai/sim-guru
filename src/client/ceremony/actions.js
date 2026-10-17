function renderUpcomingCeremonies(data) {
      cachedUpcomingCeremonies = data || [];
      const tbody = document.getElementById('tbodyUpcomingCeremonies');
      if (!tbody) return;
      if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-slate-400 italic text-xs">Belum ada jadwal mendatang.</td></tr>';
        return;
      }
      let html = '';
      data.forEach(c => {
        const dateStr = formatDateID(c.date);
        const dispDate = escapeHtml(dateStr);
        const dispName = escapeHtml(c.name || '-');
        const safeId = _jsStr(c.id);
        html += `<tr class="border-b hover:bg-slate-50 transition-colors">
              <td class="px-4 py-2.5 font-medium text-slate-700 text-sm">${dispDate}</td>
              <td class="px-4 py-2.5 text-sm text-slate-600">${dispName}</td>
              <td class="px-4 py-2.5 text-center">
                  ${actionBtn('delete', `deleteCeremonyAction('${safeId}', this)`, 'Hapus Jadwal Upacara')}
              </td>
          </tr>`;
      });
      tbody.innerHTML = html;
    }
    function deleteCeremonyAction(id, btnEl) {
      showConfirm(
        'Hapus Jadwal Upacara',
        'Apakah Anda yakin ingin menghapus jadwal upacara ini?',
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Menghapus...');
          const restoreRow = _setRowLoading(btnEl);
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                showToast('Jadwal upacara dihapus.', 'success');
                initPicket();
              } else {
                restoreBtn(); restoreRow();
                showToast((res && res.message) || 'Gagal menghapus jadwal.', 'error');
              }
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreRow();
              showToast('Koneksi gagal: ' + err, 'error');
            })
            .deleteCeremonySchedule(token, id);
        }
      );
    }
    function checkCeremonyDate(input) {
      const msgEl = document.getElementById('msgCeremonyDate');
      const btn = document.getElementById('btnSaveCeremony');
      if (!input.value) {
        if (btn) btn.disabled = true;
        if (msgEl) { msgEl.textContent = 'Upacara hanya dijadwalkan pada hari Senin.'; msgEl.className = 'text-[11px] text-slate-400 mt-1'; }
        return;
      }
      const d = new Date(input.value + 'T00:00:00');
      const day = d.getDay();
      if (day !== 1) {
        if (btn) btn.disabled = true;
        if (msgEl) {
          msgEl.textContent = '⛔ Bukan hari Senin! Silakan pilih tanggal hari Senin.';
          msgEl.className = 'text-[11px] text-red-600 font-semibold mt-1';
        }
      } else {
        if (btn) btn.disabled = false;
        if (msgEl) {
          msgEl.textContent = '✓ Hari Senin — valid untuk jadwal upacara.';
          msgEl.className = 'text-[11px] text-emerald-600 font-semibold mt-1';
        }
      }
    }
    function saveCeremonyAction() {
      const dateEl = document.getElementById('inpCeremonyDate');
      const dateVal = dateEl ? dateEl.value : '';
      const userId = document.getElementById('inpCeremonyTeacher').value;
      if (!dateVal || !userId) return showToast('Lengkapi tanggal dan guru.', 'error');
      const d = new Date(dateVal + 'T00:00:00');
      if (d.getDay() !== 1) {
        showToast('Jadwal upacara hanya boleh pada hari Senin.', 'error');
        return;
      }
      if (cachedUpcomingCeremonies && cachedUpcomingCeremonies.some(c => String(c.date) === String(dateVal))) {
        showToast('Tanggal ' + formatDateID(dateVal) + ' sudah ada dalam jadwal upacara.', 'error');
        return;
      }
      const btn = document.getElementById('btnSaveCeremony');
      if (!btn) return;
      if (btn.dataset.saving === 'true') return showToast('Sedang menyimpan, mohon tunggu...', 'info');
      btn.dataset.saving = 'true';
      const restore = _busyButton(btn, 'Menyimpan...');
      const finalize = () => {
        btn.dataset.saving = 'false';
        restore();
      };
      const token = localStorage.getItem('auth_token');
      google.script.run
        .withSuccessHandler((res) => {
          finalize();
          if (res && res.status === 'success') {
            showToast('Jadwal upacara disimpan.', 'success');
            if (dateEl) dateEl.value = '';
            initPicket();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan jadwal.', 'error');
          }
        })
        .withFailureHandler((err) => {
          finalize();
          showToast('Koneksi gagal: ' + err, 'error');
        })
        .saveCeremonySchedule(token, dateVal, userId);
    }
    