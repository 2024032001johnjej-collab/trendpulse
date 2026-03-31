const signupForm = document.getElementById('signupForm');
const message = document.getElementById('message');

// Use same-origin API to avoid port mismatch issues.
const API_BASE = window.location.origin;

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  message.textContent = '';
  message.className = 'message';

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${API_BASE}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      message.textContent = data.message || 'Signup failed.';
      message.classList.add('error');
      return;
    }

    message.textContent = 'Signup successful. Redirecting to login...';
    message.classList.add('success');

    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1000);
  } catch (error) {
    message.textContent = 'Unable to connect to server.';
    message.classList.add('error');
  }
});
