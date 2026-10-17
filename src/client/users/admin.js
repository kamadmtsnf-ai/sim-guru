var _allUsersCache = [];
    var _activeRoleFilter = '';
    function initUsers() {
      const token = localStorage.getItem('auth_token');
      const tbody = document.getElementById('tbodyUsers');
      if (!tbody) return;
      tbody.innerHTML = skeletonTableRows(4, 5);
      google.script.run.withSuccessHandler(function (users) {
        _allUsersCache = users || [];
        const totalAdmins = _allUsersCache.filter(u => u.role === 'admin').length;
        const totalGurus = _allUsersCache.filter(u => u.role === 'guru').length;
        var elTotal = document.getElementById('statTotalUsers');
        var elAdmins = document.getElementById('statTotalAdmins');
        var elGurus = document.getElementById('statTotalGurus');
        if (elTotal) elTotal.textContent = _allUsersCache.length;
        if (elAdmins) elAdmins.textContent = totalAdmins;
        if (elGurus) elGurus.textContent = totalGurus;
        _renderUsersTable();
      }).withFailureHandler(function (err) {
        tbody.innerHTML = errorTableRows(5, 'Gagal memuat data pengguna: ' + err, 'initUsers()');
      }).getAllUsers(token);
    }
    function _renderUsersTable() {
      const tbody = document.getElementById('tbodyUsers');
      if (!tbody) return;
      const search = (document.getElementById('searchUsers') ? document.getElementById('searchUsers').value : '').toLowerCase().trim();
      const roleFilter = _activeRoleFilter;
      let filtered = _allUsersCache.filter(function (u) {
        const matchRole = !roleFilter || u.role === roleFilter;
        const matchSearch = !search ||
          (u.full_name || '').toLowerCase().includes(search) ||
          (u.username || '').toLowerCase().includes(search);
        return matchRole && matchSearch;
      });
      var lbl = document.getElementById('lblUserCount');
      if (lbl) lbl.textContent = filtered.length + ' dari ' + _allUsersCache.length + ' pengguna';
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="py-2">' + errorStateHTML('Tidak ada pengguna yang cocok.') + '</td></tr>';
        return;
      }
      const AVATAR_COLORS = [
        ['#dbeafe', '#1d4ed8'],
        ['#ede9fe', '#6d28d9'],
        ['#d1fae5', '#065f46'],
        ['#fef3c7', '#92400e'],
        ['#fce7f3', '#9d174d'],
        ['#e0f2fe', '#0369a1'],
      ];
      let html = '';
      filtered.forEach(function (u, idx) {
        const nameParts = (u.full_name || 'U').split(' ');
        const initials = nameParts.length >= 2
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : (u.full_name || 'U').substring(0, 2).toUpperCase();
        const colors = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        const avatarStyle = 'background-color:' + colors[0] + ';color:' + colors[1];
        const isAdmin = u.role === 'admin';
        const roleBadge = isAdmin
          ? '<span class="inline-flex items-center gap-1.5 bg-violet-50 text-violet-700 border border-violet-200 text-[11px] font-bold px-2.5 py-1 rounded-full">' +
          '<span class="w-1.5 h-1.5 rounded-full bg-violet-500 inline-block"></span>Admin</span>'
          : '<span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-2.5 py-1 rounded-full">' +
          '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>Guru</span>';
        const nip = (u.nip && String(u.nip).trim()) ? escapeHtml(String(u.nip)) : '<span class="text-slate-300 italic">—</span>';
        const safeId = String(u.id || '').replace(/'/g, "\\'");
        const safeName = String(u.full_name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeUser = String(u.username || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRole = String(u.role || 'guru');
        const safeNip = String(u.nip && String(u.nip).trim() && String(u.nip).trim() !== '-' ? u.nip : '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeKm = String(u.km_distance !== undefined && u.km_distance !== null ? u.km_distance : '').replace(/'/g, "\\'");
        html += '<tr class="hover:bg-slate-50 transition-colors group">' +
          '<td class="px-5 py-3.5">' +
          '<div class="flex items-center gap-3">' +
          '<div class="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0" style="' + avatarStyle + '">' + initials + '</div>' +
          '<div>' +
          '<p class="font-semibold text-slate-800 text-sm leading-snug">' + escapeHtml(u.full_name || '-') + '</p>' +
          '</div>' +
          '</div>' +
          '</td>' +
          '<td class="px-5 py-3.5">' +
          '<span class="font-mono text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">' + escapeHtml(u.username || '-') + '</span>' +
          '</td>' +
          '<td class="px-5 py-3.5 text-xs text-slate-500 font-mono">' + nip + '</td>' +
          '<td class="px-5 py-3.5 text-center">' + roleBadge + '</td>' +
          '<td class="px-5 py-3.5">' +
          '<div class="flex items-center justify-center gap-1.5">' +
          actionBtn('edit', "editUser('" + safeId + "','" + safeName + "','" + safeUser + "','" + safeRole + "','" + safeKm + "','" + safeNip + "')", 'Edit Pengguna') +
          actionBtn('resetKey', "resetPassAction('" + safeId + "','" + safeName + "')", 'Reset Password') +
          actionBtn('delete', "deleteUserAction('" + safeId + "','" + safeName + "')", 'Hapus Pengguna') +
          '</div>' +
          '</td>' +
          '</tr>';
      });
      tbody.innerHTML = html;
    }
    function filterUsersTable() { _renderUsersTable(); }
    function filterUsersByRole(role) {
      _activeRoleFilter = role;
      var pills = document.querySelectorAll('.user-role-filter');
      pills.forEach(function (btn) {
        btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        btn.classList.add('bg-white', 'text-slate-500', 'border-slate-200', 'hover:bg-slate-50');
      });
      var activeIds = { '': 'filterAll', 'admin': 'filterAdmin', 'guru': 'filterGuru' };
      var activeBtn = document.getElementById(activeIds[role]);
      if (activeBtn) {
        activeBtn.classList.remove('bg-white', 'text-slate-500', 'border-slate-200', 'hover:bg-slate-50');
        activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
      }
      _renderUsersTable();
    }
    function openUserModal(id, name, username, role, km_distance, nip) {
      document.getElementById('userModal').classList.remove('hidden');
      document.getElementById('formUser').reset();
      document.getElementById('inpUserId').value = id || "";
      document.getElementById('inpNamaLengkap').value = name || "";
      document.getElementById('inpNip').value = (nip !== undefined && nip !== null) ? nip : '';
      document.getElementById('inpUsernameUser').value = username || "";
      document.getElementById('inpRole').value = role || "guru";
      document.getElementById('inpKmDistance').value = (km_distance !== undefined && km_distance !== null && km_distance !== '') ? km_distance : '';
      var errEl = document.getElementById('errKmDistance');
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
      document.getElementById('titleUserModal').innerText = id ? "Edit Data Pengguna" : "Tambah Pengguna Baru";
      if (id) document.getElementById('divUserPassword').classList.add('hidden');
      else document.getElementById('divUserPassword').classList.remove('hidden');
    }
    function editUser(id, name, username, role, km_distance, nip) { openUserModal(id, name, username, role, km_distance, nip); }
    function closeUserModal() {
      document.getElementById('userModal').classList.add('hidden');
    }
    function submitUser() {
      const data = {
        id: document.getElementById('inpUserId').value,
        full_name: document.getElementById('inpNamaLengkap').value,
        nip: (document.getElementById('inpNip').value || '').trim(),
        username: document.getElementById('inpUsernameUser').value,
        role: document.getElementById('inpRole').value,
        password: document.getElementById('inpPasswordUser').value
      };
      if (!data.full_name || !data.username) return showToast("Nama dan Username wajib diisi", "error");
      var kmRaw = (document.getElementById('inpKmDistance').value || '').trim();
      var errEl = document.getElementById('errKmDistance');
      if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
      if (kmRaw !== '') {
        var kmVal = parseFloat(kmRaw);
        var isValid = true;
        var errMsg = '';
        if (isNaN(kmVal) || !/^\d+(\.\d{1,2})?$/.test(kmRaw)) {
          isValid = false;
          errMsg = 'Jarak harus berupa angka antara 0 dan 999,99 dengan maksimal 2 angka di belakang koma.';
        } else if (kmVal < 0 || kmVal > 999.99) {
          isValid = false;
          errMsg = 'Jarak harus berupa angka antara 0 dan 999,99 dengan maksimal 2 angka di belakang koma.';
        }
        if (!isValid) {
          if (errEl) { errEl.textContent = errMsg; errEl.classList.remove('hidden'); }
          showToast(errMsg, 'error');
          return;
        }
        data.km_distance = kmRaw;
      } else {
        data.km_distance = '';
      }
      const btn = document.getElementById('btnSubmitUser');
      btn.disabled = true;
      btn.innerText = "Menyimpan...";
      const token = localStorage.getItem('auth_token');
      google.script.run.withSuccessHandler((res) => {
        btn.disabled = false;
        btn.innerText = "Simpan Data";
        if (res && res.status === 'success') { showToast("Data pengguna berhasil diperbarui"); closeUserModal(); initUsers(); }
        else showToast(res.message, "error");
      }).saveUser(token, data);
    }
    function deleteUserAction(id, name) {
      showConfirm(
        'Hapus Pengguna',
        `Apakah Anda yakin ingin menghapus pengguna ${name}? Data yang sudah dihapus tidak dapat dikembalikan.`,
        () => {
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            if (res && res.status === 'success') { showToast("Pengguna berhasil dihapus"); initUsers(); }
            else showToast(res.message, "error");
          }).deleteUser(token, id);
        }
      );
    }
    function resetPassAction(id, name) {
      showConfirm(
        'Reset Password',
        `Apakah Anda yakin ingin mereset password pengguna ${name} menjadi '123456'?`,
        () => {
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            if (res.status === 'success') showToast("Password berhasil direset");
            else showToast(res.message, "error");
          }).resetUserPassword(token, id);
        }
      );
    }
    