function openForgotModal() {
      document.getElementById('forgotModal').classList.remove('hidden');
      document.getElementById('inpForgotUsername').value = '';
      if (document.getElementById('inpSecurityAnswerForgot')) document.getElementById('inpSecurityAnswerForgot').value = '';
      if (document.getElementById('inpForgotOtp')) document.getElementById('inpForgotOtp').value = '';
      window._forgotState = {
        username: '',
        methods: null,
        method: '',
        otpCooldownTimer: null,
        otpExpiresAt: 0
      };
      _showForgotStep(1);
      setTimeout(() => document.getElementById('inpForgotUsername').focus(), 100);
    }
    function closeForgotModal() {
      document.getElementById('forgotModal').classList.add('hidden');
      if (window._forgotState && window._forgotState.otpCooldownTimer) {
        clearInterval(window._forgotState.otpCooldownTimer);
        window._forgotState.otpCooldownTimer = null;
      }
    }
    function _checkForgotLockout(username) {
      const rlKey = 'reset_rl_' + username;
      const rlRaw = localStorage.getItem(rlKey);
      if (!rlRaw) return false;
      const rlData = JSON.parse(rlRaw);
      if (rlData.lockedUntil && Date.now() < rlData.lockedUntil) {
        const btn = document.getElementById('btnSubmitForgot');
        if (btn) {
          btn.disabled = true;
          _startForgotCountdown(username, rlData.lockedUntil);
        }
        return true;
      }
      return false;
    }
    function _showForgotStep(step) {
      const s1 = document.getElementById('forgotStep1');
      const sM = document.getElementById('forgotStepMethod');
      const s2 = document.getElementById('forgotStep2');
      const s3 = document.getElementById('forgotStep3Otp');
      const sF = document.getElementById('forgotStepFinal');
      const bar = document.getElementById('forgotProgressBar');
      if (s1) s1.classList.toggle('hidden', step !== 1);
      if (sM) sM.classList.toggle('hidden', step !== 'method');
      if (s2) s2.classList.toggle('hidden', step !== 'secq');
      if (s3) s3.classList.toggle('hidden', step !== 'otp');
      if (sF) sF.classList.toggle('hidden', step !== 'final');
      if (bar) {
        let w = '33%';
        if (step === 'method') w = '50%';
        else if (step === 'secq' || step === 'otp') w = '75%';
        else if (step === 'final') w = '100%';
        bar.style.width = w;
      }
    }
    function forgotNextStep() {
      const username = (document.getElementById('inpForgotUsername').value || '').trim();
      if (!username) return showToast('Silakan masukkan username Anda.', 'error');
      const btn = document.getElementById('btnForgotNext');
      btn.disabled = true;
      btn.innerText = 'Memverifikasi...';
      google.script.run
        .withSuccessHandler((res) => {
          btn.disabled = false;
          btn.innerText = 'Lanjutkan →';
          if (res && res.status === 'success') {
            window._forgotState = window._forgotState || {};
            window._forgotState.username = username;
            window._forgotState.methods = {
              has_security_question: !!res.has_security_question,
              has_email_verified: !!res.has_email_verified,
              masked_email: res.masked_email || ''
            };
            if (!res.has_security_question && !res.has_email_verified) {
              showToast('Akun ini belum mempunyai pertanyaan keamanan & email terverifikasi. Hubungi Admin.', 'error');
              return;
            }
            _renderForgotMethodStep();
            _showForgotStep('method');
          } else {
            showToast((res && res.message) || 'Username tidak ditemukan.', 'error');
          }
        })
        .withFailureHandler(() => {
          btn.disabled = false;
          btn.innerText = 'Lanjutkan →';
          showToast('Gagal terhubung ke server.', 'error');
        })
        .getForgotMethods(username);
    }
    function _renderForgotMethodStep() {
      const st = window._forgotState || {};
      const m = st.methods || {};
      const txtUser = document.getElementById('txtForgotUsernameMethod');
      if (txtUser) txtUser.innerText = st.username || '';
      const btnSecQ = document.getElementById('btnMethodSecQ');
      const btnOtp = document.getElementById('btnMethodOtp');
      const descSecQ = document.getElementById('txtMethodSecQDesc');
      const descOtp = document.getElementById('txtMethodOtpDesc');
      if (btnSecQ) btnSecQ.disabled = !m.has_security_question;
      if (descSecQ) {
        descSecQ.innerText = m.has_security_question
          ? 'Jawab pertanyaan keamanan Anda.'
          : 'Belum ada pertanyaan keamanan untuk akun ini.';
      }
      if (btnOtp) btnOtp.disabled = !m.has_email_verified;
      if (descOtp) {
        descOtp.innerText = m.has_email_verified
          ? ('Kode 6 digit dikirim ke ' + (m.masked_email || 'email terverifikasi') + '.')
          : 'Akun ini belum memiliki email terverifikasi.';
      }
    }
    function forgotBackToStep1() {
      _showForgotStep(1);
      setTimeout(() => {
        const inp = document.getElementById('inpForgotUsername');
        if (inp) inp.focus();
      }, 100);
    }
    function forgotBackToMethod() {
      if (window._forgotState && window._forgotState.otpCooldownTimer) {
        clearInterval(window._forgotState.otpCooldownTimer);
        window._forgotState.otpCooldownTimer = null;
      }
      _renderForgotMethodStep();
      _showForgotStep('method');
    }
    function forgotChooseMethod(method) {
      const st = window._forgotState || {};
      st.method = method;
      window._forgotState = st;
      if (method === 'secq') {
        _forgotStartSecurityQuestion();
      } else if (method === 'otp') {
        _forgotStartOtp();
      }
    }
    function _forgotStartSecurityQuestion() {
      const st = window._forgotState || {};
      const username = st.username;
      const btn = document.getElementById('btnMethodSecQ');
      if (btn) btn.disabled = true;
      google.script.run
        .withSuccessHandler((res) => {
          if (btn) btn.disabled = false;
          if (res && res.status === 'success') {
            document.getElementById('txtForgotUsername').innerText = username;
            document.getElementById('txtSecurityQuestion').innerText = res.question;
            document.getElementById('inpSecurityAnswerForgot').value = '';
            _showForgotStep('secq');
            _checkForgotLockout(username);
            setTimeout(() => document.getElementById('inpSecurityAnswerForgot').focus(), 100);
          } else {
            showToast((res && res.message) || 'Gagal memuat pertanyaan keamanan.', 'error');
          }
        })
        .withFailureHandler(() => {
          if (btn) btn.disabled = false;
          showToast('Gagal terhubung ke server.', 'error');
        })
        .getSecurityQuestion(username);
    }
    function _forgotStartOtp() {
      const st = window._forgotState || {};
      const m = st.methods || {};
      document.getElementById('txtForgotOtpEmail').innerText = m.masked_email || 'email terverifikasi';
      document.getElementById('inpForgotOtp').value = '';
      _showForgotStep('otp');
      forgotRequestOtp(false);
      setTimeout(() => {
        const inp = document.getElementById('inpForgotOtp');
        if (inp) inp.focus();
      }, 150);
    }
    function forgotRequestOtp(isResend) {
      const st = window._forgotState || {};
      const username = st.username;
      if (!username) return;
      const resendBtn = document.getElementById('btnForgotResendOtp');
      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.innerText = 'Mengirim...';
      }
      google.script.run
        .withSuccessHandler((res) => {
          if (res && res.status === 'success') {
            showToast(isResend ? 'Kode OTP baru terkirim.' : ('OTP dikirim ke ' + (res.masked_email || 'email terverifikasi') + '.'), 'success');
            if (res.masked_email) {
              const t = document.getElementById('txtForgotOtpEmail');
              if (t) t.innerText = res.masked_email;
            }
            _startForgotOtpCooldown(Number(res.cooldown || 60));
          } else {
            if (resendBtn) {
              resendBtn.disabled = false;
              resendBtn.innerText = 'Kirim ulang';
            }
            showToast((res && res.message) || 'Gagal mengirim OTP.', 'error');
            if (!isResend) {
              forgotBackToMethod();
            }
          }
        })
        .withFailureHandler(() => {
          if (resendBtn) {
            resendBtn.disabled = false;
            resendBtn.innerText = 'Kirim ulang';
          }
          showToast('Gagal terhubung ke server.', 'error');
        })
        .requestForgotPasswordOTP(username);
    }
    function _startForgotOtpCooldown(secs) {
      const st = window._forgotState || {};
      if (st.otpCooldownTimer) {
        clearInterval(st.otpCooldownTimer);
        st.otpCooldownTimer = null;
      }
      let remaining = Math.max(0, Number(secs) || 60);
      const btn = document.getElementById('btnForgotResendOtp');
      if (!btn) return;
      btn.disabled = true;
      btn.innerText = 'Tunggu ' + remaining + 'd';
      st.otpCooldownTimer = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          clearInterval(st.otpCooldownTimer);
          st.otpCooldownTimer = null;
          btn.disabled = false;
          btn.innerText = 'Kirim ulang';
          return;
        }
        btn.innerText = 'Tunggu ' + remaining + 'd';
      }, 1000);
      window._forgotState = st;
    }
    function submitForgotAction() {
      const username = (document.getElementById('inpForgotUsername').value || '').trim();
      const answer = (document.getElementById('inpSecurityAnswerForgot').value || '').trim();
      if (!username) return showToast('Username tidak ditemukan.', 'error');
      if (!answer) return showToast('Silakan isi jawaban keamanan Anda.', 'error');
      const rlKey = 'reset_rl_' + username;
      const rlRaw = localStorage.getItem(rlKey);
      let rlData = rlRaw ? JSON.parse(rlRaw) : { count: 0, lockedUntil: 0 };
      const now = Date.now();
      if (rlData.lockedUntil && now < rlData.lockedUntil) {
        const secsLeft = Math.ceil((rlData.lockedUntil - now) / 1000);
        const minsLeft = Math.ceil(secsLeft / 60);
        showToast('Terlalu banyak percobaan gagal. Coba lagi dalam ' + (secsLeft > 60 ? minsLeft + ' menit' : secsLeft + ' detik') + '.', 'error');
        _startForgotCountdown(username, rlData.lockedUntil);
        return;
      }
      if (rlData.lockedUntil && now >= rlData.lockedUntil) {
        rlData = { count: 0, lockedUntil: 0 };
        localStorage.setItem(rlKey, JSON.stringify(rlData));
      }
      const btn = document.getElementById('btnSubmitForgot');
      btn.disabled = true;
      btn.innerText = 'Memverifikasi...';
      google.script.run
        .withSuccessHandler((res) => {
          btn.disabled = false;
          btn.innerText = 'Verifikasi';
          if (res && res.status === 'success') {
            localStorage.removeItem(rlKey);
            window._forgotState = window._forgotState || {};
            window._forgotState.resetToken = res.reset_token;
            _enterForgotFinalStep();
          } else {
            rlData.count += 1;
            const remaining = 3 - rlData.count;
            if (rlData.count >= 3) {
              rlData.lockedUntil = Date.now() + (2 * 60 * 1000);
              localStorage.setItem(rlKey, JSON.stringify(rlData));
              btn.disabled = true;
              btn.innerText = 'Terkunci';
              _startForgotCountdown(username, rlData.lockedUntil);
              showToast('Anda telah mencapai batas 3 percobaan. Permintaan diblokir selama 2 menit.', 'error');
            } else {
              localStorage.setItem(rlKey, JSON.stringify(rlData));
              showToast(((res && res.message) || 'Verifikasi gagal.') + ' (Sisa percobaan: ' + remaining + ')', 'error');
            }
          }
        })
        .withFailureHandler(() => {
          btn.disabled = false;
          btn.innerText = 'Verifikasi';
          showToast('Gagal terhubung ke server.', 'error');
        })
        .verifyForgotSecurityAnswer(username, answer);
    }
    function submitForgotOtpAction() {
      const st = window._forgotState || {};
      const username = st.username || (document.getElementById('inpForgotUsername').value || '').trim();
      const code = (document.getElementById('inpForgotOtp').value || '').trim();
      if (!username) return showToast('Username tidak ditemukan.', 'error');
      if (!/^\d{6}$/.test(code)) return showToast('Kode OTP harus 6 digit angka.', 'error');
      const btn = document.getElementById('btnSubmitForgotOtp');
      btn.disabled = true;
      btn.innerText = 'Memverifikasi...';
      google.script.run
        .withSuccessHandler((res) => {
          btn.disabled = false;
          btn.innerText = 'Verifikasi';
          if (res && res.status === 'success') {
            window._forgotState = window._forgotState || {};
            window._forgotState.resetToken = res.reset_token;
            if (st.otpCooldownTimer) {
              clearInterval(st.otpCooldownTimer);
              st.otpCooldownTimer = null;
            }
            _enterForgotFinalStep();
          } else {
            showToast((res && res.message) || 'Verifikasi OTP gagal.', 'error');
          }
        })
        .withFailureHandler(() => {
          btn.disabled = false;
          btn.innerText = 'Verifikasi';
          showToast('Gagal terhubung ke server.', 'error');
        })
        .requestPasswordResetByOTP(username, code);
    }
    function _enterForgotFinalStep() {
      const st = window._forgotState || {};
      const u = st.username || '';
      const txt = document.getElementById('txtForgotUsernameFinal');
      if (txt) txt.innerText = u;
      const np = document.getElementById('inpForgotNewPass');
      const cp = document.getElementById('inpForgotConfirmPass');
      if (np) { np.value = ''; np.type = 'password'; }
      if (cp) { cp.value = ''; cp.type = 'password'; }
      const submit = document.getElementById('btnSubmitNewPass');
      if (submit) submit.disabled = true;
      forgotEvalPassword();
      _showForgotStep('final');
      setTimeout(() => { if (np) try { np.focus(); } catch (_) { } }, 100);
    }
    function forgotTogglePassVis(inputId, btn) {
      const inp = document.getElementById(inputId);
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
      if (btn) btn.classList.toggle('text-emerald-500', inp.type === 'text');
    }
    function _forgotCheckPassRules(pass, username) {
      const u = String(username || '').toLowerCase();
      const p = String(pass || '');
      return {
        length: p.length >= 8,
        upper: /[A-Z]/.test(p),
        lower: /[a-z]/.test(p),
        digit: /[0-9]/.test(p),
        symbol: /[!@#$%^&*(),.?":{}|<>]/.test(p),
        noident: !!p && (!u || !p.toLowerCase().includes(u))
      };
    }
    function forgotEvalPassword() {
      const st = window._forgotState || {};
      const username = st.username || '';
      const np = document.getElementById('inpForgotNewPass');
      const cp = document.getElementById('inpForgotConfirmPass');
      const bar = document.getElementById('forgotPassStrengthBar');
      const lbl = document.getElementById('forgotPassStrengthLabel');
      const checklist = document.getElementById('forgotPassChecklist');
      const hint = document.getElementById('forgotConfirmHint');
      const submit = document.getElementById('btnSubmitNewPass');
      const pass = np ? np.value : '';
      const confirm = cp ? cp.value : '';
      const rules = _forgotCheckPassRules(pass, username);
      const passed = Object.values(rules).filter(Boolean).length;
      const allOk = passed === 6;
      if (checklist) {
        checklist.querySelectorAll('li[data-rule]').forEach(li => {
          const k = li.getAttribute('data-rule');
          const dot = li.querySelector('.rule-dot');
          if (rules[k]) {
            li.classList.remove('text-slate-400');
            li.classList.add('text-emerald-600', 'font-semibold');
            if (dot) {
              dot.classList.remove('bg-slate-300');
              dot.classList.add('bg-emerald-500');
            }
          } else {
            li.classList.add('text-slate-400');
            li.classList.remove('text-emerald-600', 'font-semibold');
            if (dot) {
              dot.classList.add('bg-slate-300');
              dot.classList.remove('bg-emerald-500');
            }
          }
        });
      }
      let pct = (passed / 6) * 100;
      let color = '#E2E8F0';
      let labelTxt = '—';
      if (passed === 0) { color = '#E2E8F0'; labelTxt = '—'; }
      else if (passed <= 2) { color = '#EF4444'; labelTxt = 'Lemah'; }
      else if (passed <= 4) { color = '#F59E0B'; labelTxt = 'Sedang'; }
      else if (passed === 5) { color = '#3B82F6'; labelTxt = 'Kuat'; }
      else { color = '#10B981'; labelTxt = 'Sangat Kuat'; }
      if (bar) { bar.style.width = pct + '%'; bar.style.background = color; }
      if (lbl) {
        lbl.innerText = 'Kekuatan: ' + labelTxt;
        lbl.style.color = color === '#E2E8F0' ? '#94A3B8' : color;
      }
      let confirmOk = false;
      if (hint) {
        if (!confirm) {
          hint.innerText = 'Masukkan password yang sama persis.';
          hint.className = 'text-[11px] text-slate-400 mb-4';
        } else if (confirm !== pass) {
          hint.innerText = '⚠️ Password konfirmasi tidak cocok.';
          hint.className = 'text-[11px] text-red-500 font-semibold mb-4';
        } else {
          hint.innerText = '✓ Password cocok.';
          hint.className = 'text-[11px] text-emerald-600 font-semibold mb-4';
          confirmOk = true;
        }
      }
      if (submit) submit.disabled = !(allOk && confirmOk);
    }
    function submitForgotNewPassword() {
      const st = window._forgotState || {};
      const token = st.resetToken || '';
      const np = document.getElementById('inpForgotNewPass');
      const cp = document.getElementById('inpForgotConfirmPass');
      const pass = np ? np.value : '';
      const confirm = cp ? cp.value : '';
      if (!token) return showToast('Sesi verifikasi tidak ditemukan. Ulangi proses.', 'error');
      if (!pass) return showToast('Password baru wajib diisi.', 'error');
      if (pass !== confirm) return showToast('Password konfirmasi tidak cocok.', 'error');
      const rules = _forgotCheckPassRules(pass, st.username || '');
      if (!rules.length || !rules.upper || !rules.lower || !rules.digit || !rules.symbol || !rules.noident) {
        return showToast('Password belum memenuhi semua syarat keamanan.', 'error');
      }
      const btn = document.getElementById('btnSubmitNewPass');
      if (btn) { btn.disabled = true; btn.innerText = 'Menyimpan...'; }
      google.script.run
        .withSuccessHandler((res) => {
          if (btn) { btn.disabled = false; btn.innerText = 'Simpan Password'; }
          if (res && res.status === 'success') {
            showToast(res.message || 'Password berhasil diubah.', 'success');
            try { localStorage.removeItem('reset_rl_' + (st.username || '')); } catch (_) { }
            closeForgotModal();
          } else {
            showToast((res && res.message) || 'Gagal menyimpan password.', 'error');
            if (res && res.message && /token/i.test(res.message)) {
              window._forgotState = window._forgotState || {};
              window._forgotState.resetToken = '';
            }
          }
        })
        .withFailureHandler(() => {
          if (btn) { btn.disabled = false; btn.innerText = 'Simpan Password'; }
          showToast('Gagal terhubung ke server.', 'error');
        })
        .resetPasswordWithToken(token, pass);
    }
    function _startForgotCountdown(username, lockedUntil) {
      const btn = document.getElementById('btnSubmitForgot');
      if (!btn) return;
      btn.disabled = true;
      const tick = () => {
        const secsLeft = Math.ceil((lockedUntil - Date.now()) / 1000);
        if (secsLeft <= 0) {
          const rlKey = 'reset_rl_' + username;
          localStorage.removeItem(rlKey);
          if (btn) {
            btn.disabled = false;
            btn.innerText = 'Kirim Permintaan';
          }
          return;
        }
        if (btn) btn.innerText = `Tunggu ${secsLeft}d...`;
        setTimeout(tick, 1000);
      };
      tick();
    }
    function handleForgotPassword() {
      openForgotModal();
    }
    function initResetRequests() {
      const token = localStorage.getItem('auth_token');
      const tbody = document.getElementById('tbodyResetRequests');
      if (!tbody) return;
      tbody.innerHTML = skeletonTableRows(3, 3);
      google.script.run.withSuccessHandler((res) => {
        updateNotificationBadges();
        if (res.status === 'success') {
          if (!res.data || res.data.length === 0) {
            tbody.innerHTML = `
            <tr><td colspan="3" class="py-2 settings-cell-empty">
              <div class="error-state-container">
                <div class="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-3 mx-auto">
                  <svg class="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <p class="text-slate-500 font-semibold text-sm">Tidak ada permintaan reset</p>
                <p class="text-slate-400 text-xs mt-1">Semua permintaan telah diproses</p>
              </div>
            </td></tr>`;
            return;
          }
          let html = '';
          res.data.forEach(r => {
            const safeRequestId = String(r.request_id || '').replace(/'/g, "\\'");
            const safeUsername = String(r.username || '').replace(/'/g, "\\'");
            const safeFullName = String(r.full_name || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            html += `
            <tr class="border-b hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3 font-semibold text-slate-700" data-label="Nama Lengkap"><span class="settings-mobile-value">${safeFullName}</span></td>
              <td class="px-4 py-3 text-slate-500 text-sm" data-label="Username"><span class="settings-mobile-value">${safeUsername}</span></td>
              <td class="px-4 py-3 text-center settings-cell-actions">
                <button id="btnApprove_${safeRequestId}" onclick="approveResetAction('${safeRequestId}', '${safeUsername}')"
                  class="inline-flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-600 transition-all shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                  Setujui
                </button>
              </td>
            </tr>`;
          });
          tbody.innerHTML = html;
        } else {
          tbody.innerHTML = errorTableRows(3, res.message || 'Gagal memuat data.', 'initResetRequests()');
        }
      }).withFailureHandler((err) => {
        tbody.innerHTML = errorTableRows(3, 'Koneksi gagal: ' + (err.message || err), 'initResetRequests()');
      }).getResetRequests(token);
    }
    function approveResetAction(requestId, username) {
      showConfirm(
        'Setujui Reset Password',
        `Apakah Anda yakin menyetujui reset password untuk ${username}? Password akan diubah menjadi '123456'.`,
        () => {
          const btn = document.getElementById('btnApprove_' + requestId);
          var restore = (typeof _busyButton === 'function') ? _busyButton(btn, '...') : function () {
            if (btn) { btn.disabled = true; btn.dataset._oldHTML = btn.innerHTML; btn.innerHTML = '...'; }
            return function () { if (btn) { btn.disabled = false; if (btn.dataset._oldHTML) { btn.innerHTML = btn.dataset._oldHTML; delete btn.dataset._oldHTML; } } };
          }();
          const token = localStorage.getItem('auth_token');
          google.script.run.withSuccessHandler((res) => {
            if (res && res.status === 'success') {
              showToast('Password berhasil direset ke standar.', 'success');
              initResetRequests();
              updateNotificationBadges();
            } else {
              restore();
              showToast((res && res.message) || 'Gagal memproses permintaan', 'error');
            }
          }).withFailureHandler((err) => {
            restore();
            showToast('Koneksi gagal: ' + (err && err.message ? err.message : err), 'error');
          }).approveResetRequest(token, requestId, username);
        }
      );
    }
    