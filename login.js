const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const togglePasswordBtn = document.getElementById('togglePassword');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

// Password Visibility Toggle
if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        const icon = togglePasswordBtn.querySelector('.material-icons');
        if (icon) {
            icon.textContent = isPassword ? 'visibility' : 'visibility_off';
        }
    });
}

// Display Feedback Banner
function showStatus(message, type = 'error') {
    formStatus.textContent = message;
    formStatus.className = `form-status ${type}`;
    formStatus.classList.remove('hidden');
}

// Authentication Submit Handler
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showStatus('Please fill in both email and password.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.6';
        submitBtn.textContent = 'Signing in...';

        try {
            const response = await fetch('http://127.0.0.1:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                throw new Error('Invalid email or password.');
            }

            showStatus('Sign in successful. Redirecting...', 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 800);

        } catch (error) {
            const errorMsg = error.message.includes('Failed to fetch')
                ? 'Backend server unreachable. Make sure your local server is running on port 5000.'
                : error.message;

            showStatus(errorMsg, 'error');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.textContent = 'Sign In';
        }
    });
}