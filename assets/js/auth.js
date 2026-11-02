/* ============================================================
 *  auth.js  —  Author Login + Dashboard Integration
 *  -----------------------------------------------------------
 *  PROTECTED — DO NOT TOUCH.
 *  Carried over VERBATIM from the original single-file build
 *  (original <script> block, lines 1908-2069).
 *  Supabase SDK is loaded separately via a <script> tag in index.html
 *  BEFORE this file runs (unchanged from the original wiring).
 *
 *  Element IDs this script binds to (all preserved in index.html):
 *    #authorLoginBtn  #authorLoginLabel  #loginModalOverlay
 *    #modalEmail  #modalPassword  #modalLoginBtn  #modalStatus
 *    #forgotPasswordLink  #forgotPasswordForm  #resetEmail
 *    #sendResetBtn  #cancelResetBtn  #signupLink
 *  Exposes: window.closeLoginModal()
 * ============================================================ */

(function() {
  const SUPABASE_URL = "https://voswrndbxrsaqfzwffhh.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_lsz4V4nlZIbrFKi43YhOEg_m_pf0E5I";

  const loginBtn = document.getElementById('authorLoginBtn');
  const loginLabel = document.getElementById('authorLoginLabel');
  const overlay = document.getElementById('loginModalOverlay');
  const modalStatus = document.getElementById('modalStatus');
  const modalEmail = document.getElementById('modalEmail');
  const modalPassword = document.getElementById('modalPassword');
  const modalLoginBtn = document.getElementById('modalLoginBtn');

  let sb = null;
  try {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('Supabase init failed:', e);
  }

  function showStatus(msg, type) {
    if (!msg) { modalStatus.className = 'modal-status'; modalStatus.textContent = ''; return; }
    modalStatus.className = 'modal-status show ' + type;
    modalStatus.textContent = msg;
  }

  function openLoginModal() {
    overlay.classList.add('open');
    setTimeout(() => modalEmail.focus(), 100);
  }
  window.closeLoginModal = function() {
    overlay.classList.remove('open');
    modalPassword.value = '';
    showStatus('', '');
  };

  loginBtn.onclick = () => {
    // If already logged in, go to dashboard
    if (loginBtn.classList.contains('logged-in')) {
      window.location.href = 'dashboard.html';
      return;
    }
    openLoginModal();
  };

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) window.closeLoginModal();
  });
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) window.closeLoginModal();
  });

  // Enter key handlers
  modalEmail.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); modalPassword.focus(); } });
  modalPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); modalLoginBtn.click(); } });

  modalLoginBtn.onclick = async () => {
    if (!sb) { showStatus('সেটআপ সমস্যা — Supabase লোড হয়নি।', 'error'); return; }
    const email = modalEmail.value.trim();
    const password = modalPassword.value;
    if (!email || !password) { showStatus('ইমেইল ও পাসওয়ার্ড দিন।', 'error'); return; }
    showStatus('লগইন করা হচ্ছে…', 'warning');
    modalLoginBtn.disabled = true;
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { showStatus('লগইন ব্যর্থ: ' + error.message, 'error'); modalLoginBtn.disabled = false; return; }
      // Check admin
      const { data: admin, error: adminErr } = await sb.from('admin_users').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (adminErr || !admin) {
        showStatus('অ্যাকাউন্ট অ্যাডমিন হিসেবে অনুমোদিত নয়।', 'error');
        await sb.auth.signOut();
        modalLoginBtn.disabled = false;
        return;
      }
      showStatus('লগইন সফল! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে…', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 800);
    } catch (e) {
      showStatus('সমস্যা: ' + e.message, 'error');
      modalLoginBtn.disabled = false;
    }
  };

  // Check existing session on load
  async function checkSession() {
    if (!sb) return;
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        // Verify admin
        const { data: admin } = await sb.from('admin_users').select('user_id').eq('user_id', session.user.id).maybeSingle();
        if (admin) {
          loginBtn.classList.add('logged-in');
          loginLabel.textContent = 'ড্যাশবোর্ড খুলুন →';
        }
      }
    } catch (e) {}
  }
  checkSession();

  // ====== Forgot password ======
  const forgotLink = document.getElementById('forgotPasswordLink');
  const forgotForm = document.getElementById('forgotPasswordForm');
  const resetEmailInput = document.getElementById('resetEmail');
  const sendResetBtn = document.getElementById('sendResetBtn');
  const cancelResetBtn = document.getElementById('cancelResetBtn');

  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    // Pre-fill reset email with login email if present
    if (modalEmail.value.trim() && !resetEmailInput.value) {
      resetEmailInput.value = modalEmail.value.trim();
    }
    forgotForm.style.display = 'block';
    setTimeout(() => resetEmailInput.focus(), 100);
  });

  cancelResetBtn.addEventListener('click', () => {
    forgotForm.style.display = 'none';
    resetEmailInput.value = '';
    showStatus('', '');
  });

  sendResetBtn.addEventListener('click', async () => {
    if (!sb) { showStatus('সেটআপ সমস্যা — Supabase লোড হয়নি।', 'error'); return; }
    const email = resetEmailInput.value.trim();
    if (!email) { showStatus('ইমেইল দিন।', 'error'); return; }
    showStatus('রিসেট লিংক পাঠানো হচ্ছে…', 'warning');
    sendResetBtn.disabled = true;
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'dashboard.html'
      });
      if (error) {
        showStatus('ত্রুটি: ' + error.message, 'error');
        sendResetBtn.disabled = false;
        return;
      }
      showStatus('পাসওয়ার্ড রিসেট লিংক পাঠানো হয়েছে! ইমেইল চেক করুন।', 'success');
      setTimeout(() => {
        forgotForm.style.display = 'none';
        resetEmailInput.value = '';
      }, 3000);
    } catch (e) {
      showStatus('সমস্যা: ' + e.message, 'error');
    }
    sendResetBtn.disabled = false;
  });

  // Enter key on reset email
  resetEmailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendResetBtn.click(); }
  });

  // ====== Signup (create account) ======
  const signupLink = document.getElementById('signupLink');
  signupLink.addEventListener('click', (e) => {
    e.preventDefault();
    showStatus('অ্যাকাউন্ট তৈরি করতে হলে সাইট অ্যাডমিনের সাথে যোগাযোগ করুন। শুধুমাত্র অনুমোদিত অ্যাডমিন অ্যাকাউন্ট দিয়ে লগইন করা যাবে।', 'warning');
  });
})();
