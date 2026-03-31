const loginForm = document.getElementById('loginForm');
const message = document.getElementById('message');

// Use same-origin API to avoid port mismatch issues.
const API_BASE = window.location.origin;

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  message.textContent = '';
  message.className = 'message';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.message || 'Login failed.';
      message.classList.add('error');
      return;
    }

    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard.html';
  } catch (error) {
    message.textContent = 'Unable to connect to server.';
    message.classList.add('error');
  }
});
