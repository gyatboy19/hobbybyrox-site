// A simple shorthand for document.getElementById
function $(id) {
  return document.getElementById(id);
}

// The base URL for the backend API, same as in admin.js
const SYNC_BASE = "https://hobbybyrox-site.onrender.com";

async function handleLogin() {
  // Get the values from BOTH input fields using their IDs.
  const username = $('loginIn').value;
  const password = $('password').value;

  const loginError = $('loginError');
  const loginBtn = $('loginBtn');

  if (!username || !password) {
    loginError.textContent = 'Please enter a username and password.';
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in...';
  loginError.textContent = '';

  try {
    const response = await fetch(`${SYNC_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });

    const result = await response.json();

    if (response.ok) {
      sessionStorage.setItem('admin_token', result.token);
      window.location.href = 'admin.html';
    } else {
      loginError.textContent = result.message || 'Login failed. Please check your credentials.';
    }
  } catch (error) {
    loginError.textContent = 'An error occurred. Please try again.';
    console.error('Login error:', error);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // If user is already logged in, redirect to admin page
  if (sessionStorage.getItem('admin_token')) {
    window.location.href = 'admin.html';
  }

  $('loginBtn').addEventListener('click', handleLogin);

  // Allow pressing Enter in either field to submit
  $('loginIn').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  });

  $('password').addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      handleLogin();
    }
  });
});
