// DOM Elements
const container = document.querySelector(".container");
const signInBtn = document.querySelector("#sign-in-btn");
const signUpBtn = document.querySelector("#sign-up-btn");
const authContainer = document.querySelector("#auth-container");
const dashboardContainer = document.querySelector("#dashboard-container");
const loginBtn = document.querySelector("#login-button");
const registerBtn = document.querySelector("#register-button");
const logoutBtn = document.querySelector("#logout-btn");
const tabs = document.querySelectorAll(".nav-link");
const tabContents = document.querySelectorAll(".tab-content");
const startCameraBtn = document.querySelector("#start-camera");
const takeAttendanceBtn = document.querySelector("#take-attendance");
const video = document.querySelector("#video");
const canvas = document.querySelector("#canvas");
const scanOverlay = document.querySelector(".scan-line");
const scanStatus = document.querySelector("#scan-status");
const monthFilter = document.querySelector("#month-filter");
const attendanceTableBody = document.querySelector("#attendance-table-body");
const noAttendance = document.querySelector("#no-attendance");
const addCourseForm = document.querySelector("#add-course-form");
const courseCards = document.querySelector("#course-cards");
const noCourses = document.querySelector("#no-courses");
const notification = document.querySelector("#notification");

// Current user global variable
let currentUser = null;
let videoStream = null;
let modelsLoaded = false;

// Date formatting
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Update current date
document.getElementById('current-date').textContent = formatDate(new Date());

// Auth container animation
signUpBtn.addEventListener("click", () => {
    container.classList.add("sign-up-mode");
});

signInBtn.addEventListener("click", () => {
    container.classList.remove("sign-up-mode");
});

// User Authentication
function setupAuthListeners() {
    // Login form submission
    document.querySelector(".sign-in-form").addEventListener("submit", function(e) {
        e.preventDefault();
        const username = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;
        login(username, password);
    });

    // Register form submission
    document.querySelector(".sign-up-form").addEventListener("submit", function(e) {
        e.preventDefault();
        const username = document.getElementById("register-username").value;
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        register(username, email, password);
    });
}

// Register function
function register(username, email, password) {
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const existingUser = users.find(user => user.username === username || user.email === email);
    
    if (existingUser) {
        showNotification("User already exists. Please use a different username or email.", "error");
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        username,
        email,
        password, // In a real app, you'd encrypt this
        attendance: [],
        courses: []
    };
    
    // Save to localStorage
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    showNotification("Registration successful! Please login.", "success");
    container.classList.remove("sign-up-mode");
    document.getElementById("login-username").value = username;
}

// Login function
function login(username, password) {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(user => user.username === username && user.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showNotification("Login successful!", "success");
        authContainer.style.display = "none";
        dashboardContainer.style.display = "flex";
        loadUserData();
    } else {
        showNotification("Invalid username or password.", "error");
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    authContainer.style.display = "block";
    dashboardContainer.style.display = "none";
    
    // Stop camera if it's running
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
}

// Load the dashboard with user data
function loadUserData() {
    // Set username in welcome message
    document.getElementById("user-name").textContent = currentUser.username;
    
    // Update profile information
    document.getElementById("profile-username").textContent = currentUser.username;
    document.getElementById("profile-email").textContent = currentUser.email;
    
    // Load courses
    loadCourses();
    
    // Load attendance
    loadAttendance();
    
    // Update stats
    updateStats();
}

// Update user stats
function updateStats() {
    // Calculate attendance rate
    const totalDays = 30; // Example: Total possible attendance days
    const daysPresent = currentUser.attendance.length;
    const attendanceRate = ((daysPresent / totalDays) * 100).toFixed(1);
    
    // Update attendance rate
    document.getElementById("attendance-rate").textContent = `${attendanceRate}%`;
    document.getElementById("profile-attendance-rate").textContent = `${attendanceRate}%`;
    
    // Update courses count
    const coursesCount = currentUser.courses.length;
    document.getElementById("courses-count").textContent = coursesCount;
    document.getElementById("profile-courses-count").textContent = coursesCount;
    
    // Update last check-in
    if (currentUser.attendance.length > 0) {
        const lastAttendance = new Date(currentUser.attendance[currentUser.attendance.length - 1].date);
        document.getElementById("last-checkin").textContent = lastAttendance.toLocaleDateString();
    } else {
        document.getElementById("last-checkin").textContent = "Never";
    }
}

// Tab navigation
function setupTabNavigation() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to current tab
            tab.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show the selected tab content
            const tabId = tab.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
}

// Face Recognition Functions
async function setupFaceRecognition() {
    startCameraBtn.addEventListener('click', startCamera);
    takeAttendanceBtn.addEventListener('click', markAttendance);
    
    // Load face-api models if not already loaded
    if (!modelsLoaded) {
        try {
            await loadFaceApiModels();
            modelsLoaded = true;
        } catch (error) {
            console.error("Failed to load face-api models:", error);
            showNotification("Could not load face recognition models. Please try again later.", "error");
        }
    }
}

async function loadFaceApiModels() {
    scanStatus.textContent = "Loading face detection models...";
    
    // Load models
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('https://cdnjs.cloudflare.com/ajax/libs/face-api.js/0.22.2/models');
    
    scanStatus.textContent = "Face detection models loaded!";
    setTimeout(() => { scanStatus.textContent = ""; }, 2000);
}

async function startCamera() {
    try {
        if (videoStream) {
            // Stop existing stream
            videoStream.getTracks().forEach(track => track.stop());
        }
        
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
        });
        
        video.srcObject = videoStream;
        scanStatus.textContent = "Camera started. Please look at the camera.";
        scanOverlay.style.opacity = "1";
        takeAttendanceBtn.disabled = false;
    } catch (error) {
        console.error("Error accessing camera:", error);
        scanStatus.textContent = "Error accessing camera. Please check permissions.";
        scanStatus.classList.add("error");
        setTimeout(() => { 
            scanStatus.textContent = "";
            scanStatus.classList.remove("error");
        }, 3000);
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
        video.srcObject = null;
        scanOverlay.style.opacity = "0";
        takeAttendanceBtn.disabled = true;
    }
}

async function markAttendance() {
    if (!videoStream) {
        showNotification("Please start the camera first.", "error");
        return;
    }
    
    try {
        scanStatus.textContent = "Scanning face...";
        
        // Take a snapshot from the video
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Detect faces in the snapshot
        const detections = await faceapi.detectAllFaces(canvas, 
            new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        
        if (detections.length === 0) {
            scanStatus.textContent = "No face detected. Please make sure your face is visible.";
            scanStatus.classList.add("error");
            setTimeout(() => { 
                scanStatus.textContent = "";
                scanStatus.classList.remove("error");
            }, 3000);
            return;
        }
        
        if (detections.length > 1) {
            scanStatus.textContent = "Multiple faces detected. Please ensure only your face is visible.";
            scanStatus.classList.add("error");
            setTimeout(() => { 
                scanStatus.textContent = "";
                scanStatus.classList.remove("error");
            }, 3000);
            return;
        }
        
        // Face detected - mark attendance
        const today = new Date();
        const attendanceRecord = {
            date: today.toISOString(),
            time: today.toLocaleTimeString(),
            status: 'present'
        };
        
        // Check if already marked attendance today
        const todayString = today.toDateString();
        const alreadyMarked = currentUser.attendance.some(record => {
            return new Date(record.date).toDateString() === todayString;
        });
        
        if (alreadyMarked) {
            scanStatus.textContent = "You've already marked your attendance today!";
            scanStatus.classList.add("success");
            setTimeout(() => { 
                scanStatus.textContent = "";
                scanStatus.classList.remove("success");
            }, 3000);
            return;
        }
        
        // Add attendance record
        currentUser.attendance.push(attendanceRecord);
        
        // Update in localStorage
        updateCurrentUserInStorage();
        
        // Update UI
        loadAttendance();
        updateStats();
        
        // Show success message
        scanStatus.textContent = "Attendance marked successfully!";
        scanStatus.classList.add("success");
        setTimeout(() => { 
            scanStatus.textContent = "";
            scanStatus.classList.remove("success");
        }, 3000);
        
        // Stop camera after successful attendance
        stopCamera();
        showNotification("Attendance marked successfully!", "success");
        
    } catch (error) {
        console.error("Error marking attendance:", error);
        scanStatus.textContent = "Error processing face. Please try again.";
        scanStatus.classList.add("error");
        setTimeout(() => { 
            scanStatus.textContent = "";
            scanStatus.classList.remove("error");
        }, 3000);
    }
}

// Attendance functions
function loadAttendance() {
    // Sort attendance by date (newest first)
    const sortedAttendance = [...currentUser.attendance].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });
    
    // Clear previous records
    attendanceTableBody.innerHTML = '';
    
    // Get selected month filter
    const selectedMonth = parseInt(monthFilter.value);
    
    // Filter records by month if needed
    let filteredAttendance = sortedAttendance;
    if (selectedMonth !== -1 && !isNaN(selectedMonth)) {
        filteredAttendance = filteredAttendance.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === selectedMonth;
        });
    }
    
    // Show or hide empty state
    if (filteredAttendance.length === 0) {
        noAttendance.style.display = 'flex';
        return;
    } else {
        noAttendance.style.display = 'none';
    }
    
    // Add records to table
    filteredAttendance.forEach(record => {
        const date = new Date(record.date);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${date.toLocaleDateString()}</td>
            <td>${record.time}</td>
            <td><span class="status-badge status-present">Present</span></td>
        `;
        
        attendanceTableBody.appendChild(row);
    });
}

// Course Management Functions
function setupCourseManagement() {
    // Add course form submission
    addCourseForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const courseName = document.getElementById('course-name').value;
        const courseCode = document.getElementById('course-code').value;
        addCourse(courseName, courseCode);
    });
    
    // Month filter change
    monthFilter.addEventListener('change', loadAttendance);
}

function addCourse(name, code) {
    // Check if course already exists
    const courseExists = currentUser.courses.some(course => 
        course.code.toLowerCase() === code.toLowerCase() || 
        course.name.toLowerCase() === name.toLowerCase()
    );
    
    if (courseExists) {
        showNotification("This course already exists.", "error");
        return;
    }
    
    // Add course
    const newCourse = {
        id: Date.now().toString(),
        name,
        code
    };
    
    currentUser.courses.push(newCourse);
    
    // Update in localStorage
    updateCurrentUserInStorage();
    
    // Update UI
    loadCourses();
    updateStats();
    
    // Clear form
    document.getElementById('course-name').value = '';
    document.getElementById('course-code').value = '';
    
    showNotification("Course added successfully!", "success");
}

function loadCourses() {
    // Clear previous courses
    courseCards.innerHTML = '';
    
    // Show or hide empty state
    if (currentUser.courses.length === 0) {
        noCourses.style.display = 'flex';
        return;
    } else {
        noCourses.style.display = 'none';
    }
    
    // Add course cards
    currentUser.courses.forEach(course => {
        const card = document.createElement('div');
        card.className = 'course-card';
        
        card.innerHTML = `
            <h3>${course.name}</h3>
            <p>${course.code}</p>
            <button class="delete-course" data-id="${course.id}">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        courseCards.appendChild(card);
    });
    
    // Add delete functionality
    document.querySelectorAll('.delete-course').forEach(btn => {
        btn.addEventListener('click', function() {
            const courseId = this.getAttribute('data-id');
            deleteCourse(courseId);
        });
    });
}

function deleteCourse(courseId) {
    // Filter out the course to delete
    currentUser.courses = currentUser.courses.filter(course => course.id !== courseId);
    
    // Update in localStorage
    updateCurrentUserInStorage();
    
    // Update UI
    loadCourses();
    updateStats();
    
    showNotification("Course deleted successfully!", "success");
}

// Helper Functions
function updateCurrentUserInStorage() {
    // Update current user in localStorage
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const userIndex = users.findIndex(user => user.id === currentUser.id);
    
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
}

function showNotification(message, type) {
    const notificationContent = notification.querySelector('.notification-content');
    const notificationIcon = notification.querySelector('.notification-icon');
    const notificationMessage = notification.querySelector('.notification-message');
    
    if (type === 'success') {
        notification.className = 'notification success show';
        notificationIcon.className = 'notification-icon fas fa-check-circle';
    } else {
        notification.className = 'notification error show';
        notificationIcon.className = 'notification-icon fas fa-exclamation-circle';
    }
    
    notificationMessage.textContent = message;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Check if user is already logged in
function checkLoggedInUser() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        authContainer.style.display = "none";
        dashboardContainer.style.display = "flex";
        loadUserData();
    }
}

// Initialize the app
function init() {
    setupAuthListeners();
    setupTabNavigation();
    setupFaceRecognition();
    setupCourseManagement();
    logoutBtn.addEventListener('click', logout);
    checkLoggedInUser();
}

// Start the application
document.addEventListener('DOMContentLoaded', init);