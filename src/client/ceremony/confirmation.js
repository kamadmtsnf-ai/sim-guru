function confirmCeremonyAction(userId, name, btnEl) {
      showConfirm(
        'Konfirmasi Pembina Upacara',
        `Apakah Anda yakin ingin mengonfirmasi kehadiran ${name} sebagai Pembina Upacara? Sistem akan otomatis menambahkan +5 JTM.`,
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Mengonfirmasi...');
          const restoreBlock = _setBlockLoading(btnEl, '#cardCeremonyAdmin, #panelCeremonyGuru');
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                showToast("Kehadiran upacara dikonfirmasi");
              } else {
                restoreBtn(); restoreBlock();
                showToast((res && res.message) || 'Gagal konfirmasi upacara', "error");
              }
              initPicket();
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreBlock();
              showToast("Gagal memproses: " + err, "error");
              initPicket();
            })
            .confirmCeremonyLeader(token, userId);
        }
      );
    }
    function revokeCeremonyAction(userId, name, btnEl) {
      showConfirm(
        'Batalkan Konfirmasi Upacara',
        `Apakah Anda yakin ingin membatalkan konfirmasi kehadiran upacara untuk ${name}? JTM upacara akan dihapus.`,
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Membatalkan...');
          const restoreBlock = _setBlockLoading(btnEl, '#cardCeremonyAdmin, #panelCeremonyGuru');
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                showToast("Konfirmasi dibatalkan");
              } else {
                restoreBtn(); restoreBlock();
                showToast((res && res.message) || 'Gagal membatalkan konfirmasi', "error");
              }
              initPicket();
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreBlock();
              showToast("Gagal memproses: " + err, "error");
              initPicket();
            })
            .revokeCeremonyLeader(token, userId);
        }
      );
    }
    function openSubModalCeremony(origId, name) {
      document.getElementById('subModal').classList.remove('hidden');
      document.getElementById('inpSubScheduleId').value = "";
      document.getElementById('inpIsCeremonySub').value = "true";
      document.getElementById('txtSubDetails').innerText = `Pembina Upacara: ${name}`;
    }
    function confirmPicketPresence(userId, name, btnEl) {
      showConfirm(
        'Konfirmasi Kehadiran Piket',
        `Apakah Anda yakin ingin mengonfirmasi kehadiran ${name} sebagai Guru Piket hari ini? Sistem akan otomatis menambahkan +4 JTM.`,
        () => {
          const token = localStorage.getItem('auth_token');
          const restoreBtn = _busyButton(btnEl, 'Mengonfirmasi...');
          const restoreRow = _setRowLoading(btnEl);
          google.script.run
            .withSuccessHandler((res) => {
              if (res && res.status === 'success') {
                showToast(`Kehadiran ${name} berhasil dikonfirmasi`);
              } else {
                restoreBtn(); restoreRow();
                showToast((res && res.message) || 'Gagal konfirmasi piket', "error");
              }
              initPicket();
            })
            .withFailureHandler((err) => {
              restoreBtn(); restoreRow();
              showToast("Gagal memproses: " + err, "error");
              initPicket();
            })
            .confirmPicketSubPresenceBackend(token, userId);
        }
      );
    }
    