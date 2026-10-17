function ensureAnimationsExist() {
      if (!document.getElementById('customAnimations')) {
        var style = document.createElement('style');
        style.id = 'customAnimations';
        style.textContent =
          '@keyframes fadeIn {' +
          'from { opacity: 0; transform: translateY(10px); }' +
          'to { opacity: 1; transform: translateY(0); }' +
          '}' +
          '.animate-fade-in {' +
          'animation: fadeIn 0.5s ease forwards;' +
          '}';
        document.head.appendChild(style);
      }
    }
    ensureAnimationsExist();
    