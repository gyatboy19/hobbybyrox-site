// A simple shorthand for document.getElementById
function $(id) {
  return document.getElementById(id);
}

// --- Obfuscation ---
// This section contains the obfuscated password and the logic to reveal it.
// The actual password is "RoxLovesHobby".

// To change the password:
// 1. Open the developer console in your browser (usually F12).
// 2. Paste the following function and press Enter:
/*
function transformPassword(password) {
  let transformed = '';
  for (let i = 0; i < password.length; i++) {
    transformed += String.fromCharCode(password.charCodeAt(i) + (i % 2 === 0 ? 1 : -1));
  }
  return transformed;
}
*/
// 3. Run `transformPassword("YourNewPassword")` in the console.
// 4. Copy the resulting string and replace the value of OBFUSCATED_PASS below.

const OBFUSCATED_PASS = "SnyKpufrIncaz"; // This is "RoxLovesHobby" transformed

function revealPassword(obfuscated) {
  let original = '';
  for (let i = 0; i < obfuscated.length; i++) {
    original += String.fromCharCode(obfuscated.charCodeAt(i) - (i % 2 === 0 ? 1 : -1));
  }
  return original;
}
// --- End of Obfuscation ---

async function handleLogin() {
  const password = $('password').value;
  const loginError = $('loginError');
  const loginBtn = $('loginBtn');

  if (!password) {
    loginError.textContent = 'Please enter a password.';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  loginError.textContent = '';

  // De-obfuscate the stored password and compare it to the user's input
  const correctPassword = revealPassword(OBFUSCATED_PASS);

  // Simple delay to make it feel like a real login process
  setTimeout(() => {
    if (password === correctPassword) {
      // On success, set a simple token and redirect to the admin page.
      sessionStorage.setItem('admin_token', 'true');
      window.location.href = 'admin.html';
    } else {
      // On failure, show an error message.
      loginError.textContent = 'Login failed. Please check your password.';
      loginBtn.disabled = false;
      loginBtn.textContent = 'Login';
    }
  }, 250); // 250ms delay
}

document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect to admin page
  if (sessionStorage.getItem('admin_token')) {
    window.location.href = 'admin.html';
  }

  $('loginBtn').addEventListener('click', handleLogin);

  // Allow pressing Enter in the password field to submit
  $('password').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  });
});
