function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str).replace(/[&<>"']/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        if (m === "'") return '&#39;';
        return m;
      }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (c) {
        return c;
      });
    }
    // Format tanggal untuk tabel BlokJurnal / BlokAcara.
    // Menerima YYYY-MM-DD (string dari spreadsheet) atau ISO string (e.g. "2026-10-11T17:00:00.000Z").
    // Mengembalikan format "11 Okt 2026" agar konsisten dengan standar aplikasi.
    function fmtTglBlok(val) {
      if (!val) return '-';
      var s = String(val).trim();
      if (!s) return '-';
      var bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      // Coba parse sebagai YYYY-MM-DD murni (hindari timezone shift)
      var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) {
        var day = parseInt(m[3], 10);
        var mon = parseInt(m[2], 10) - 1; // 0-indexed
        var yr  = parseInt(m[1], 10);
        if (mon >= 0 && mon <= 11) return day + ' ' + bulan[mon] + ' ' + yr;
      }
      // Fallback: coba lewat Date object
      var d = new Date(s);
      if (!isNaN(d.getTime())) {
        return d.getDate() + ' ' + bulan[d.getMonth()] + ' ' + d.getFullYear();
      }
      return s;
    }
    function sanitizeDateForInput(val) {
      if (!val) return '';
      var s = String(val).trim();
      var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : '';
    }
    function formatHHmm(val) {
      if (val === null || val === undefined || val === '') return '';
      const s = String(val).trim();
      if (!s) return '';
      if (/^\d{2}:\d{2}/.test(s)) return s.substring(0, 5);
      if (s.includes('T') || (s.includes('-') && s.length > 10)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
      }
      return s;
    }
    