const message = document.getElementById('message');
const userName = document.getElementById('userName');
const userEmail = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

const token = localStorage.getItem('token');

if (!token) {
  window.location.href = '/login.html';
}

async function loadProfile() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      localStorage.removeItem('token');
      window.location.href = '/login.html';
      return;
    }

    userName.textContent = `Name: ${data.user.name}`;
    userEmail.textContent = `Email: ${data.user.email}`;
    message.textContent = 'You are logged in successfully.';
    message.className = 'message success';
  } catch (error) {
    message.textContent = 'Unable to load profile.';
    message.className = 'message error';
  }
}

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = '/login.html';
});

loadProfile();
