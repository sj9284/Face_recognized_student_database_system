document.addEventListener('DOMContentLoaded', () => {
    const signUpButton = document.getElementById('sign-up-btn');
    const signInButton = document.getElementById('sign-in-btn');
    const container = document.getElementById('auth-container');
    const loginForm = document.querySelector('.sign-in-form');
    const registerForm = document.querySelector('.sign-up-form');
    
    // Switch between login and signup forms
    signUpButton.addEventListener('click', () => {
        container.classList.add('sign-up-mode');
    });

    signInButton.addEventListener('click', () => {
        container.classList.remove('sign-up-mode');
    });

    // Handle Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (username && password) {
            // Send login credentials to the backend
            fetch('/login', { 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Login successful
                    // Store user info returned from backend in session storage
                    sessionStorage.setItem('currentUser', JSON.stringify(data.user));

                    // Hide auth container and show dashboard
                    document.getElementById('auth-container').style.display = 'none';
                    document.getElementById('dashboard-container').style.display = 'block';
                    
                    // Update UI with user info
                    document.getElementById('user-name').textContent = data.user.username;

                    // --- ADDED: Load courses immediately on login ---
                    if (typeof window.loadUserCourses === 'function') {
                        window.loadUserCourses();
                    } else {
                        console.error("loadUserCourses function not found on window object.");
                    }
                    // --- END ADDED ---
                    
                    // Show success notification
                    if (window.showNotification) {
                        window.showNotification('Login successful!', 'success');
                    }
                } else {
                    // Login failed - show error message from backend
                    if (window.showNotification) {
                        window.showNotification(data.message || 'Login failed. Please check your credentials.', 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Error during login:', error);
                if (window.showNotification) {
                    window.showNotification('An error occurred during login. Please check the console.', 'error');
                }
            });
        } else {
            if (window.showNotification) {
                window.showNotification('Please enter both username and password', 'error');
            }
        }
    });

    // Handle Registration
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (username && email && password) {
            // Send data to the backend
            fetch('/register', { // Assumes backend is running on the same origin or CORS is configured
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Switch to login form after successful registration
                    container.classList.remove('sign-up-mode');
                    
                    // Clear registration form
                    registerForm.reset();
                    
                    // Show success notification
                    if (window.showNotification) {
                        window.showNotification('Registration successful! Please login.', 'success');
                    }
                } else {
                    // Show error notification from backend
                    if (window.showNotification) {
                        window.showNotification(data.message || 'Registration failed. Please try again.', 'error');
                    }
                }
            })
            .catch(error => {
                console.error('Error during registration:', error);
                if (window.showNotification) {
                    window.showNotification('An error occurred during registration. Please check the console.', 'error');
                }
            });

        } else {
            if (window.showNotification) {
                window.showNotification('Please fill all fields', 'error');
            }
        }
    });

    // Handle Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        // Clear session storage
        sessionStorage.removeItem('currentUser');
        
    // Show auth container and hide dashboard
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('dashboard-container').style.display = 'none';

    // --- ADDED: Explicitly clear course list on logout ---
    const courseCardsContainer = document.getElementById('course-cards');
    const noCoursesMessage = document.getElementById('no-courses');
    if (courseCardsContainer) {
        courseCardsContainer.innerHTML = ''; // Clear cards
    }
    if (noCoursesMessage) {
        noCoursesMessage.style.display = 'block'; // Show 'no courses' message
    }
    // Also reset counts shown elsewhere if needed (e.g., on home/profile tabs)
    const coursesCountElement = document.getElementById('courses-count');
    const profileCoursesCountElement = document.getElementById('profile-courses-count');
    if (coursesCountElement) coursesCountElement.textContent = '0';
    if (profileCoursesCountElement) profileCoursesCountElement.textContent = '0';
    // --- END ADDED ---

    // Reset login form
        loginForm.reset();
        
        // Show notification
        if (window.showNotification) {
            window.showNotification('Logged out successfully', 'success');
        }
    });
    
    // Check if user is already logged in
    const user = JSON.parse(sessionStorage.getItem('currentUser'));
    if (user) {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'block';
        document.getElementById('user-name').textContent = user.username;
    }
});
