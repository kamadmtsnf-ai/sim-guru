function loadActiveSubstitutes() {
      var token = localStorage.getItem('auth_token');
      var tbody = document.getElementById('tbodyActiveSubstitutes');
      if (!tbody) {
        console.error('Element tbodyActiveSubstitutes tidak ditemukan');
        return;
      }
      tbody.innerHTML =
        '<tr>' +
        '<td colspan="5" class="text-center py-8">' +
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#94a3b8;">' +
        '<div style="animation:spin 1s linear infinite;border-radius:50%;height:2rem;width:2rem;border-bottom:2px solid #2563eb;margin-bottom:0.75rem;"></div>' +
        '<span style="font-size:0.875rem;">Memuat data pengganti...</span>' +
        '</div>' +
        '</td>' +
        '</tr>';
      google.script.run
        .withSuccessHandler(function (res) {
          if (res && res.status === 'success') {
            renderSubstitutesData(res.data);
          } else {
            tbody.innerHTML =
              '<tr>' +
              '<td colspan="5" class="text-center py-6">' +
              '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ef4444;">' +
              '<p style="font-size:0.875rem;font-weight:500;">Gagal memuat data</p>' +
              '<p style="font-size:0.75rem;margin-top:0.25rem;">' + (res.message || 'Terjadi kesalahan') + '</p>' +
              '<button onclick="loadActiveSubstitutes()" style="margin-top:0.75rem;font-size:0.75rem;background:#fee2e2;color:#b91c1c;padding:0.25rem 0.75rem;border-radius:0.25rem;border:none;cursor:pointer;">' +
              'Coba Lagi' +
              '</button>' +
              '</div>' +
              '</td>' +
              '</tr>';
          }
        })
        .withFailureHandler(function (err) {
          console.error('Error loadActiveSubstitutes:', err);
          tbody.innerHTML =
            '<tr>' +
            '<td colspan="5" class="text-center py-6">' +
            '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;color:#ef4444;">' +
            '<p style="font-size:0.875rem;font-weight:500;">Koneksi gagal</p>' +
            '<p style="font-size:0.75rem;margin-top:0.25rem;">' + String(err) + '</p>' +
            '<button onclick="loadActiveSubstitutes()" style="margin-top:0.75rem;font-size:0.75rem;background:#fee2e2;color:#b91c1c;padding:0.25rem 0.75rem;border-radius:0.25rem;border:none;cursor:pointer;">' +
            'Coba Lagi' +
            '</button>' +
            '</div>' +
            '</td>' +
            '</tr>';
        })
        .getTodaySubstitutes(token);
    }
    