function _csvEscape(s) {
      if (s === null || s === undefined) return '';
      const v = String(s);
      if (v.indexOf('"') !== -1 || v.indexOf(',') !== -1 || v.indexOf('\n') !== -1 || v.indexOf(';') !== -1) {
        return '"' + v.replace(/"/g, '""') + '"';
      }
      return v;
    }
    function _downloadCSV(rows, filename) {
      const csv = rows.map(r => r.map(_csvEscape).join(',')).join('\r\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }
    function exportGuruJournalCSV() {
      const data = _guruJournalCache || [];
      if (!data.length) return showToast('Tidak ada data untuk diekspor.', 'info');
      const header = ['No', 'Tanggal', 'Waktu', 'Kelas', 'Mapel', 'Materi', 'Hadir', 'Absen', 'Catatan', 'JTM'];
      const rows = [header];
      data.forEach((h, i) => {
        rows.push([
          i + 1,
          formatDateID(h.date),
          h.time || '-',
          h.class_name || '-',
          h.subject || '-',
          h.materi || '-',
          h.students || 0,
          h.students_absent || 0,
          h.notes || h.clean_notes || '',
          h.jtm_val || 0
        ]);
      });
      const stamp = new Date().toISOString().slice(0, 10);
      _downloadCSV(rows, `Jurnal_Saya_${stamp}.csv`);
      showToast('CSV jurnal diunduh.', 'success');
    }
    function exportAdminJournalCSV() {
      const data = _adminJournalCache || [];
      if (!data.length) return showToast('Tidak ada data untuk diekspor.', 'info');
      const header = ['No', 'Tanggal', 'Waktu', 'Guru', 'Kelas', 'Mapel', 'Materi', 'Hadir', 'Absen', 'Catatan', 'JTM'];
      const rows = [header];
      data.forEach((h, i) => {
        rows.push([
          i + 1,
          formatDateID(h.date),
          formatTimeID(h.time) || '-',
          h.guru_name || '-',
          h.class_name || '-',
          h.subject || '-',
          h.materi || '-',
          h.students_present || 0,
          h.students_absent || 0,
          h.notes || '',
          h.jtm_val || 0
        ]);
      });
      const stamp = new Date().toISOString().slice(0, 10);
      _downloadCSV(rows, `Jurnal_Admin_${stamp}.csv`);
      showToast('CSV jurnal diunduh.', 'success');
    }
    