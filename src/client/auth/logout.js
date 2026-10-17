function actionLogout() {
      showConfirm('Konfirmasi Keluar', 'Apakah Anda yakin ingin keluar dari aplikasi?', () => {
        if (typeof window._onLogoutStart === 'function') window._onLogoutStart();
        const token = localStorage.getItem('auth_token');
        if (token) google.script.run.logoutUser(token);
        localStorage.clear();
        loadPage('Page_Login');
      });
    }
    