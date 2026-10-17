function toggleHonorVisibility() {
      const isHidden = localStorage.getItem('hide_honor_dashboard') === 'true';
      localStorage.setItem('hide_honor_dashboard', isHidden ? 'false' : 'true');
      updateHonorVisibilityUI();
    }
    function updateHonorVisibilityUI() {
      const el = document.getElementById('valEstHonor');
      const iconOpen = document.getElementById('iconEyeOpen');
      const iconClosed = document.getElementById('iconEyeClosed');
      const btnToggle = document.getElementById('btnToggleHonor');
      if (!el) return;
      const isHidden = localStorage.getItem('hide_honor_dashboard') === 'true';
      const realValue = el.getAttribute('data-value') || 'Rp 0';
      if (isHidden) {
        el.innerText = 'Rp •••••••';
        el.classList.add('opacity-75');
        if (iconOpen) iconOpen.classList.add('hidden');
        if (iconClosed) iconClosed.classList.remove('hidden');
        if (btnToggle) btnToggle.setAttribute('title', 'Tampilkan Honor');
      } else {
        el.innerText = realValue;
        el.classList.remove('opacity-75');
        if (iconOpen) iconOpen.classList.remove('hidden');
        if (iconClosed) iconClosed.classList.add('hidden');
        if (btnToggle) btnToggle.setAttribute('title', 'Sembunyikan Honor');
      }
    }
    function toggleTransportVisibility() {
      const isHidden = localStorage.getItem('hide_transport_dashboard') === 'true';
      localStorage.setItem('hide_transport_dashboard', isHidden ? 'false' : 'true');
      updateTransportVisibilityUI();
    }
    function updateTransportVisibilityUI() {
      const el = document.getElementById('valGuruTransport');
      const iconOpen = document.getElementById('iconTransportEyeOpen');
      const iconClosed = document.getElementById('iconTransportEyeClosed');
      const btnToggle = document.getElementById('btnToggleTransport');
      if (!el) return;
      const isHidden = localStorage.getItem('hide_transport_dashboard') === 'true';
      const realValue = el.getAttribute('data-value') || '';
      if (isHidden) {
        el.innerText = 'Rp •••••••';
        el.classList.add('opacity-75');
        if (iconOpen) iconOpen.classList.add('hidden');
        if (iconClosed) iconClosed.classList.remove('hidden');
        if (btnToggle) btnToggle.setAttribute('title', 'Tampilkan Transport');
      } else {
        el.innerText = realValue || 'Rp 0';
        el.classList.remove('opacity-75');
        if (iconOpen) iconOpen.classList.remove('hidden');
        if (iconClosed) iconClosed.classList.add('hidden');
        if (btnToggle) btnToggle.setAttribute('title', 'Sembunyikan Transport');
      }
    }
    