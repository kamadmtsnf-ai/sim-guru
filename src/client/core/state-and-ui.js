
    let globalConfig = Object.assign({}, JSON.parse(document.getElementById('server-config').textContent || '{}'));
    let cachedSchedules = [];
    let filteredSchedules = [];
    let confirmCallback = null;
    let allTeachersCache = [];
    function formatDateID(dateInput) {
      if (!dateInput) return '-';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    }
    function formatTimeID(timeInput) {
      if (!timeInput) return '00:00';
      const str = String(timeInput);
      if (str.includes('T')) {
        const d = new Date(timeInput);
        if (!isNaN(d.getTime())) {
          const h = String(d.getHours()).padStart(2, '0');
          const m = String(d.getMinutes()).padStart(2, '0');
          return `${h}:${m}`;
        }
      }
      if (str.includes(':') && !str.includes('-')) {
        return str.substring(0, 5);
      }
      return str.length > 5 && str.includes(':') ? str.substring(0, 5) : str;
    }
    function showToast(message, type = 'success', duration = 4000) {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-[99999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      const palette = {
        success: { bg: 'bg-emerald-600', icon: 'M5 13l4 4L19 7' },
        error: { bg: 'bg-red-600', icon: 'M6 18L18 6M6 6l12 12' },
        info: { bg: 'bg-blue-600', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
        warning: { bg: 'bg-amber-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
      };
      const p = palette[type] || palette.success;
      toast.className = `${p.bg} text-white px-4 py-3 rounded-xl shadow-xl toast-notification pointer-events-auto flex items-start gap-3 animate-fade-in`;
      toast.innerHTML = `
      <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="${p.icon}"/></svg>
      <span class="flex-1 font-medium leading-snug">${message}</span>
      <button onclick="this.parentElement.remove()" class="text-white/80 hover:text-white text-lg leading-none -mt-0.5">&times;</button>
    `;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => toast.remove(), 500);
      }, Math.max(1500, Number(duration) || 4000));
    }
    function showConfirm(title, message, callback, options) {
      confirmCallback = callback;
      options = options || {};
      const elTitle = document.getElementById('confirmTitle');
      const elMsg = document.getElementById('confirmMessage');
      const elModal = document.getElementById('confirmModal');
      const elIconWrap = document.getElementById('confirmIconWrap');
      const elIconSvg = document.getElementById('confirmIconSvg');
      if (elTitle) elTitle.innerText = title;
      if (elMsg) elMsg.innerHTML = message;
      const type = options.type || 'warning';
      if (elIconWrap && elIconSvg) {
        const palettes = {
          danger: { bg: '#FEE2E2', color: '#DC2626', path: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
          warning: { bg: '#FEF3C7', color: '#D97706', path: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
          info: { bg: '#DBEAFE', color: '#2563EB', path: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
          success: { bg: '#D1FAE5', color: '#059669', path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }
        };
        const p = palettes[type] || palettes.warning;
        elIconWrap.style.background = p.bg;
        elIconSvg.style.color = p.color;
        while (elIconSvg.firstChild) elIconSvg.removeChild(elIconSvg.firstChild);
        const NS = 'http://www.w3.org/2000/svg';
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', p.path);
        elIconSvg.appendChild(path);
        const elModal2 = document.getElementById('confirmModal');
        if (elModal2) {
          const primaryBtn = elModal2.querySelector('button[onclick*="executeConfirm"]');
          if (primaryBtn) {
            primaryBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500', 'bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500', 'bg-amber-600', 'hover:bg-amber-700', 'focus:ring-amber-500', 'bg-emerald-600', 'hover:bg-emerald-700', 'focus:ring-emerald-500');
            if (type === 'danger') {
              primaryBtn.classList.add('bg-red-600', 'hover:bg-red-700', 'focus:ring-red-500');
              primaryBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg> Ya, Hapus';
            } else if (type === 'success') {
              primaryBtn.classList.add('bg-emerald-600', 'hover:bg-emerald-700', 'focus:ring-emerald-500');
              primaryBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Ya, Lanjutkan';
            } else if (type === 'warning') {
              primaryBtn.classList.add('bg-amber-600', 'hover:bg-amber-700', 'focus:ring-amber-500');
              primaryBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Ya, Lanjutkan';
            } else {
              primaryBtn.classList.add('bg-blue-600', 'hover:bg-blue-700', 'focus:ring-blue-500');
              primaryBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg> Ya, Lanjutkan';
            }
          }
        }
      }
      if (elModal) elModal.classList.remove('hidden');
    }
    function closeConfirmModal() {
      const elModal = document.getElementById('confirmModal');
      if (elModal) elModal.classList.add('hidden');
      confirmCallback = null;
    }
    function executeConfirm() {
      var callback = confirmCallback;
      closeConfirmModal();
      if (callback && typeof callback === 'function') {
        setTimeout(function () {
          callback();
        }, 10);
      }
    }
    