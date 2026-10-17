function exportElementToPDF(elementId, filename, orientation) {
      var ev = (typeof event !== 'undefined') ? event : null;
      var btnExport = (ev && (ev.currentTarget || ev.target)) ? (ev.currentTarget || ev.target) : null;
      var originalBtnText = btnExport ? btnExport.innerText : "Export PDF";
      var finalOrient = orientation || 'portrait';
      var element = document.getElementById(elementId);
      if (!element) return showToast("Element tidak ditemukan.", "error");
      var isMobile = window.innerWidth < 768;
      var finalScale = isMobile ? 1 : 2;
      var finalQuality = isMobile ? 0.75 : 0.98;
      var ownerPass = "SEC" + new Date().getTime();
      showToast("Memproses PDF...", "info");
      if (btnExport) {
        btnExport.innerText = "⏳ Memproses...";
        btnExport.disabled = true;
      }
      var opt = {
        margin: 5,
        filename: filename,
        image: { type: 'jpeg', quality: finalQuality },
        html2canvas: { scale: finalScale, useCORS: true, logging: false },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: finalOrient,
          encryption: {
            userPassword: "",
            ownerPassword: ownerPass,
            userPermissions: ["print", "copy", "accessibility"]
          }
        }
      };
      var onServerSuccess = function (url) {
        if (url && url.indexOf("http") === 0) {
          showToast("Berhasil! Membuka PDF...", "success");
          setTimeout(function () { window.location.href = url; }, 1000);
          if (btnExport) {
            btnExport.innerText = "📂 Buka File PDF";
            btnExport.disabled = false;
            btnExport.classList.remove('opacity-50', 'cursor-not-allowed');
            btnExport.onclick = function () { window.location.href = url; };
          }
        } else {
          showToast("Gagal: " + url, "error");
          if (btnExport) {
            btnExport.innerText = originalBtnText;
            btnExport.disabled = false;
          }
        }
      };
      html2pdf().set(opt).from(element).toPdf().output('datauristring')
        .then(function (pdfBase64) {
          var cleanBase64 = pdfBase64.split(',')[1];
          showToast("Mengupload ke Drive...", "info");
          setTimeout(function () {
            google.script.run
              .withSuccessHandler(onServerSuccess)
              .withFailureHandler(function (err) {
                showToast("Gagal Upload: " + err, "error");
                if (btnExport) {
                  btnExport.innerText = originalBtnText;
                  btnExport.disabled = false;
                }
              })
              .savePdfToDrive(cleanBase64, filename);
          }, 100);
        }).catch(function (err) {
          showToast("Gagal Render: " + err, "error");
          if (btnExport) {
            btnExport.innerText = originalBtnText;
            btnExport.disabled = false;
          }
        });
    }
    