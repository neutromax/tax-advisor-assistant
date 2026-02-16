document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            // Update active tab button
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Show corresponding form
            if (tab === 'login') {
                loginForm.classList.add('active');
                signupForm.classList.remove('active');
            } else {
                signupForm.classList.add('active');
                loginForm.classList.remove('active');
            }
            
            // Clear error messages
            document.querySelectorAll('.error-message').forEach(el => {
                el.style.display = 'none';
            });
        });
    });

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const btn = loginForm.querySelector('.btn-primary');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        const errorMsg = loginForm.querySelector('.error-message');
        
        // Show loading state
        btn.disabled = true;
        btnText.textContent = 'Logging in...';
        btnLoader.style.display = 'block';
        errorMsg.style.display = 'none';
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            // 🚨 DEBUG: Log the result to the browser console
            console.log('Login API Status:', response.status, response.ok);
            console.log('Login API Data:', data);
            
            if (response.ok && data.success) {
                // Successful login - redirect to dashboard
                console.log('Login successful. Redirecting...');
                window.location.href = '/dashboard';
            } else {
                // Show error message
                console.error('Login failed on server or credentials invalid.');
                errorMsg.textContent = data.error || 'Login failed';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Login fetch or network error:', error);
            errorMsg.textContent = 'Network error. Please try again.';
            errorMsg.style.display = 'block';
        } finally {
            // Reset button state
            btn.disabled = false;
            btnText.textContent = 'Login';
            btnLoader.style.display = 'none';
        }
    });

    // Signup form submission
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        const btn = signupForm.querySelector('.btn-primary');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        const errorMsg = signupForm.querySelector('.error-message');
        
        // Show loading state
        btn.disabled = true;
        btnText.textContent = 'Creating account...';
        btnLoader.style.display = 'block';
        errorMsg.style.display = 'none';
        
        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            // 🚨 DEBUG: Log the result to the browser console
            console.log('Signup API Status:', response.status, response.ok);
            console.log('Signup API Data:', data);
            
            if (response.ok && data.success) {
                // Successful signup - redirect to dashboard
                console.log('Signup successful. Redirecting...');
                window.location.href = '/dashboard';
            } else {
                // Show error message
                console.error('Signup failed on server.');
                errorMsg.textContent = data.error || 'Signup failed';
                errorMsg.style.display = 'block';
            }
        } catch (error) {
            console.error('Signup fetch or network error:', error);
            errorMsg.textContent = 'Network error. Please try again.';
            errorMsg.style.display = 'block';
        } finally {
            // Reset button state
            btn.disabled = false;
            btnText.textContent = 'Create Account';
            btnLoader.style.display = 'none';
        }
    });
});