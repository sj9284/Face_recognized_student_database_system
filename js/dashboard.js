// --- Globally Accessible Functions ---

// Helper function to show notifications (Globally accessible)
window.showNotification = function(message, type) {
    const notification = document.getElementById('notification');
    if (!notification) return; // Guard against missing element
    const notificationMessage = notification.querySelector('.notification-message');
    const notificationIcon = notification.querySelector('.notification-icon');

    if (!notificationMessage || !notificationIcon) return; // Guard against missing elements

    notificationMessage.textContent = message;

    // Set icon and class based on type
    notification.className = 'notification'; // Reset classes first
    if (type === 'success') {
        notificationIcon.className = 'notification-icon fas fa-check-circle';
        notification.classList.add('notification-success');
    } else if (type === 'error') {
        notificationIcon.className = 'notification-icon fas fa-exclamation-circle';
        notification.classList.add('notification-error');
    } else if (type === 'info') {
        notificationIcon.className = 'notification-icon fas fa-info-circle';
        notification.classList.add('notification-info');
    } else {
        notificationIcon.className = 'notification-icon'; // Default or clear icon
    }

    // Show notification
    notification.style.display = 'block';

    // Hide after 3 seconds
    setTimeout(() => {
        if (notification) {
            notification.style.display = 'none';
        }
    }, 3000);
}

// Function to create a course card element (Helper for loadUserCourses)
function createCourseCard(courseName, courseCode, courseId) {
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    courseCard.dataset.courseId = courseId; // Store course ID
    courseCard.innerHTML = `
        <h3>${courseName}</h3>
        <p class="course-code">${courseCode}</p>
        <button class="btn small take-attendance-btn">Take Attendance</button>
    `;

    // Add event listener to the take attendance button on the created card
    const takeAttendanceBtn = courseCard.querySelector('.take-attendance-btn');
    if (takeAttendanceBtn) {
        takeAttendanceBtn.addEventListener('click', () => {
            sessionStorage.setItem('selectedCourseId', courseCard.dataset.courseId);
            // Attempt to switch tab and scroll
            const homeTabLink = document.querySelector('.nav-link[data-tab="home"]');
            const faceScanContainer = document.querySelector('.face-scan-container');
            if (homeTabLink) homeTabLink.click();
            if (faceScanContainer) faceScanContainer.scrollIntoView({ behavior: 'smooth' });
            window.showNotification(`Ready to mark attendance for ${courseName} (${courseCode})`, 'info');
        });
    }
    return courseCard;
}


// Function to load and display user's courses (Globally accessible)
window.loadUserCourses = async function() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (!currentUser || !currentUser.id) {
        console.log("User not logged in, cannot load courses.");
        // Ensure UI reflects no courses state
        const courseCardsContainer = document.getElementById('course-cards');
        const noCoursesMessage = document.getElementById('no-courses');
        const coursesCountElement = document.getElementById('courses-count');
        const profileCoursesCountElement = document.getElementById('profile-courses-count');
        if (courseCardsContainer) courseCardsContainer.innerHTML = '';
        if (noCoursesMessage) noCoursesMessage.style.display = 'block';
        if (coursesCountElement) coursesCountElement.textContent = '0';
        if (profileCoursesCountElement) profileCoursesCountElement.textContent = '0';
        return;
    }
    const userId = currentUser.id;
    const courseCardsContainer = document.getElementById('course-cards');
    const noCoursesMessage = document.getElementById('no-courses');
    const coursesCountElement = document.getElementById('courses-count');
    const profileCoursesCountElement = document.getElementById('profile-courses-count');

    // Ensure elements exist before manipulating
    if (!courseCardsContainer || !noCoursesMessage || !coursesCountElement || !profileCoursesCountElement) {
        console.error("Dashboard elements for courses not found!");
        return;
    }

    // Clear existing cards and reset state
    courseCardsContainer.innerHTML = '';
    noCoursesMessage.style.display = 'block'; // Show 'no courses' initially
    coursesCountElement.textContent = '0';
    profileCoursesCountElement.textContent = '0';

    try {
        console.log(`Fetching courses for user ID: ${userId}`);
        const response = await fetch(`/courses?user_id=${userId}`); // Use GET request
        const data = await response.json();

        if (response.ok && data.success && data.courses) {
            console.log("Courses fetched successfully:", data.courses);
            if (data.courses.length > 0) {
                noCoursesMessage.style.display = 'none'; // Hide 'no courses' message
                data.courses.forEach(course => {
                    const courseCard = createCourseCard(course.course_name, course.course_code, course.id);
                    courseCardsContainer.appendChild(courseCard);
                });
                // Update counts
                coursesCountElement.textContent = data.courses.length;
                profileCoursesCountElement.textContent = data.courses.length;
            } else {
                 console.log("User has no enrolled courses.");
                 noCoursesMessage.style.display = 'block'; // Ensure 'no courses' is visible
            }
        } else {
            console.error("Failed to fetch courses:", data.message || `Server responded with status ${response.status}`);
            window.showNotification(data.message || 'Failed to load courses.', 'error');
            noCoursesMessage.style.display = 'block'; // Show 'no courses' on error too
        }
    } catch (error) {
        console.error('Error loading courses:', error);
        window.showNotification('An error occurred while loading courses.', 'error');
        noCoursesMessage.style.display = 'block';
    }
}


// --- DOMContentLoaded Event Listener ---
document.addEventListener('DOMContentLoaded', () => {

    // Set current date
    const currentDateElement = document.getElementById('current-date');
    if (currentDateElement) {
        const currentDate = new Date();
        currentDateElement.textContent = currentDate.toLocaleDateString();
    }

    // Tab navigation setup
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            link.classList.add('active');

            // Hide all tab contents
            tabContents.forEach(content => content.classList.remove('active'));

            // Show selected tab content
            const tabId = link.getAttribute('data-tab');
            const targetTab = document.getElementById(`${tabId}-tab`);
            if (targetTab) {
                targetTab.classList.add('active');
            }

            // Load courses if the courses tab is selected and function exists
            if (tabId === 'courses' && typeof window.loadUserCourses === 'function') {
                window.loadUserCourses();
            }
        });
    });

    // Month filter setup
    const monthFilter = document.getElementById('month-filter');
    if (monthFilter) {
        monthFilter.addEventListener('change', () => { // Changed to anonymous function for clarity
            const selectedMonth = monthFilter.value;
            const rows = document.querySelectorAll('#attendance-table-body tr');
            const noAttendanceMessage = document.getElementById('no-attendance');
            let visibleRows = 0;

            rows.forEach(row => {
                if (selectedMonth === 'all') {
                    row.style.display = '';
                    visibleRows++;
                    return;
                }
                const dateCell = row.querySelector('td:first-child');
                if (dateCell) {
                    const date = new Date(dateCell.textContent);
                    // Check if date is valid before comparing month
                    if (!isNaN(date.getTime()) && date.getMonth() == selectedMonth) {
                        row.style.display = '';
                        visibleRows++;
                    } else {
                        row.style.display = 'none';
                    }
                } else {
                    row.style.display = 'none'; // Hide rows without a date cell
                }
            });

            // Show/hide no attendance message based on visible rows
            if (noAttendanceMessage) {
                noAttendanceMessage.style.display = visibleRows > 0 ? 'none' : 'block';
            }
        });
    }

    // Add course form setup
    const addCourseForm = document.getElementById('add-course-form');
    if (addCourseForm) {
        addCourseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const courseNameInput = document.getElementById('course-name');
            const courseCodeInput = document.getElementById('course-code');
            const courseName = courseNameInput ? courseNameInput.value : '';
            const courseCode = courseCodeInput ? courseCodeInput.value : '';

            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

            if (!currentUser || !currentUser.id) {
                window.showNotification('You must be logged in to add courses.', 'error');
                return;
            }
            if (!courseName || !courseCode) {
                window.showNotification('Please fill in both course name and code.', 'error');
                return;
            }

            const userId = currentUser.id;
            fetch('/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_name: courseName,
                    course_code: courseCode,
                    user_id: userId
                }),
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Reload the list to show the new course if function exists
                    if (typeof window.loadUserCourses === 'function') {
                        window.loadUserCourses();
                    }
                    // Clear form
                    addCourseForm.reset();
                    window.showNotification('Course added successfully!', 'success');
                } else {
                    window.showNotification(data.message || 'Failed to add course.', 'error');
                }
            })
            .catch(error => {
                console.error('Error adding course:', error);
                window.showNotification('An error occurred while adding the course.', 'error');
            });
        });
    }

    // --- Initial Load Check ---
    // Check if user is logged in (this might be redundant if auth.js handles showing/hiding dashboard)
    const initialUser = JSON.parse(sessionStorage.getItem('currentUser'));
    if (initialUser) {
        // If logged in, check if the active tab is 'courses' and load them
        const activeTabLink = document.querySelector('.nav-link.active');
        if (activeTabLink && activeTabLink.getAttribute('data-tab') === 'courses' && typeof window.loadUserCourses === 'function') {
             window.loadUserCourses();
        }
        // Potentially load other initial data for the home tab here if needed
    }
});
