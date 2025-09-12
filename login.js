// A simple shorthand for document.getElementById
function $(id) { return document.getElementById(id); }

// The base URL for the backend API, same as in admin.js
const SYNC_BASE = "https://hobbybyrox-site.onrender.com";
// The username is not asked for in the new simplified UI, but the API expects it.
// We'll use a hardcoded default. The security check is on the password.
const ADMIN_USERNAME_DEFAULT = "admin";

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

    try {
        const response = await fetch(`${SYNC_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loginIn, password: password }),
        });

        const result = await response.json();

        if (response.ok && result.ok) {
            sessionStorage.setItem('admin_token', result.token);
            window.location.href = 'admin.html';
        } else {
            loginError.textContent = result.message || 'Login failed. Please check your password.';
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
    $('password').addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    });
});
