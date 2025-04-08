/**
 * Camera and Face Recognition Module
 * Handles webcam access and face detection for attendance
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const startCameraBtn = document.getElementById('start-camera');
    const takeAttendanceBtn = document.getElementById('take-attendance');
    const scanStatus = document.getElementById('scan-status');
    const scanOverlay = document.querySelector('.scan-overlay');
    const scanLine = document.querySelector('.scan-line');
    
    // Variables
    let stream = null;
    let faceDetectionInterval = null;
    let modelsLoaded = false;
    
    // Initialize face-api.js
    async function loadModels() {
        try {
            // Load face detection models
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                faceapi.nets.faceRecognitionNet.loadFromUri('/models')
            ]);
            
            modelsLoaded = true;
            console.log('Face detection models loaded');
        } catch (error) {
            console.error('Error loading face detection models:', error);
            scanStatus.textContent = 'Error loading face detection models';
            scanStatus.className = 'scan-status error';
        }
    }
    
    // Start camera
    async function startCamera() {
        try {
            // Request camera access
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: 480,
                    height: 360,
                    facingMode: 'user'
                }
            });
            
            // Set video source and play
            video.srcObject = stream;
            await video.play();
            
            // Show scan overlay and animation
            scanOverlay.style.display = 'block';
            scanLine.style.opacity = '1';
            
            // Enable take attendance button
            takeAttendanceBtn.disabled = false;
            
            // Update status
            scanStatus.textContent = 'Camera started. Position your face in the frame.';
            scanStatus.className = 'scan-status';
            
            // Start face detection if models are loaded
            if (modelsLoaded) {
                startFaceDetection();
            } else {
                await loadModels();
                startFaceDetection();
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            scanStatus.textContent = 'Error accessing camera. Please check permissions.';
            scanStatus.className = 'scan-status error';
            showNotification('Error accessing camera. Please check permissions.', 'error');
        }
    }
    
    // Stop camera
    function stopCamera() {
        if (stream) {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            video.srcObject = null;
            
            // Hide scan overlay
            scanOverlay.style.display = 'none';
            scanLine.style.opacity = '0';
            
            // Disable take attendance button
            takeAttendanceBtn.disabled = true;
            
            // Stop face detection
            if (faceDetectionInterval) {
                clearInterval(faceDetectionInterval);
                faceDetectionInterval = null;
            }
            
            // Update status
            scanStatus.textContent = '';
            scanStatus.className = 'scan-status';
        }
    }
    
    // Start face detection
    function startFaceDetection() {
        if (faceDetectionInterval) {
            clearInterval(faceDetectionInterval);
        }
        
        faceDetectionInterval = setInterval(async () => {
            if (!video.paused && !video.ended) {
                const detections = await faceapi.detectAllFaces(
                    video, 
                    new faceapi.TinyFaceDetectorOptions()
                );
                
                // Draw detections on canvas
                const context = canvas.getContext('2d');
                context.clearRect(0, 0, canvas.width, canvas.height);
                
                if (detections.length > 0) {
                    // Face detected
                    scanStatus.textContent = 'Face detected! You can mark attendance now.';
                    scanStatus.className = 'scan-status success';
                    
                    // Draw rectangle around face
                    detections.forEach(detection => {
                        const box = detection.box;
                        context.strokeStyle = '#4d84e2';
                        context.lineWidth = 3;
                        context.strokeRect(box.x, box.y, box.width, box.height);
                    });
                } else {
                    // No face detected
                    scanStatus.textContent = 'No face detected. Please position your face in the frame.';
                    scanStatus.className = 'scan-status';
                }
            }
        }, 100);
    }
    
    // Mark attendance
    async function markAttendance() {
        // Disable button during processing
        takeAttendanceBtn.disabled = true;
        scanStatus.textContent = 'Processing attendance...';
        scanStatus.className = 'scan-status';

        try {
            // Get user and selected course from session storage
            const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
            const selectedCourseId = sessionStorage.getItem('selectedCourseId');

            if (!currentUser || !currentUser.id) {
                throw new Error('User not logged in. Please log in again.');
            }
            if (!selectedCourseId) {
                throw new Error('No course selected. Please select a course from the Courses tab first.');
            }

            const userId = currentUser.id;
            const courseId = parseInt(selectedCourseId); // Ensure courseId is an integer

            // Optional: Add face detection check here if required before sending
            // const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            // if (detections.length === 0) {
            //     throw new Error('No face detected. Cannot mark attendance.');
            // }
            
            console.log(`Attempting to mark attendance for User ID: ${userId}, Course ID: ${courseId}`);

            // Send data to the backend
            const response = await fetch('/mark-attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: userId, courseId: courseId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // --- Update UI on Success ---
                const now = new Date();
                document.getElementById('last-checkin').textContent = now.toLocaleString();
                
                // Update attendance rate (consider fetching actual rate from backend)
                const currentRate = document.getElementById('attendance-rate').textContent;
                const rate = parseInt(currentRate) || 0;
                const newRate = Math.min(rate + 5, 100); // Simple increment, adjust as needed
                document.getElementById('attendance-rate').textContent = `${newRate}%`;
                
                // Add to attendance table (consider fetching history from backend instead)
                const tableBody = document.getElementById('attendance-table-body');
                if (tableBody) {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${now.toLocaleDateString()}</td>
                        <td>${now.toLocaleTimeString()}</td>
                        <td><span class="status present">Present</span></td>
                    `;
                    if (tableBody.firstChild) {
                        tableBody.insertBefore(row, tableBody.firstChild);
                    } else {
                        tableBody.appendChild(row);
                    }
                    const noAttendance = document.getElementById('no-attendance');
                    if (noAttendance) noAttendance.style.display = 'none';
                }
                
                showNotification('Attendance marked successfully!', 'success');
                scanStatus.textContent = 'Attendance marked successfully!';
                scanStatus.className = 'scan-status success';
                // --- End UI Update ---
            } else {
                // Handle backend error or already marked message
                throw new Error(data.message || 'Failed to mark attendance.');
            }

        } catch (error) {
            console.error('Error marking attendance:', error);
            scanStatus.textContent = `Error: ${error.message}`;
            scanStatus.className = 'scan-status error';
            showNotification(`Error marking attendance: ${error.message}`, 'error');
        } finally {
            // Re-enable button regardless of success or failure
            takeAttendanceBtn.disabled = false;
            // Clear selected course ID after attempt
            // sessionStorage.removeItem('selectedCourseId'); 
            // Consider if you want to clear this or allow multiple attempts for the same course
        }
    }
    
    // Event listeners
    if (startCameraBtn) {
        startCameraBtn.addEventListener('click', startCamera);
    }
    
    if (takeAttendanceBtn) {
        takeAttendanceBtn.addEventListener('click', markAttendance);
    }
    
    // Clean up when leaving the page
    window.addEventListener('beforeunload', stopCamera);
});
