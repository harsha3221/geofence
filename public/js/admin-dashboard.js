document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("take-attendance"); // Assuming the button has this ID
    const message = document.getElementById("attendanceMessage");
    const spinner = document.getElementById("loadingSpinner");

    // Function to show loading spinner and disable the button
    function showLoading() {
        spinner.style.display = "block";
        btn.disabled = true;
        message.textContent = "Getting location...";
        message.style.color = "blue";
    }

    // Function to hide the loading spinner and re-enable the button
    function hideLoading() {
        spinner.style.display = "none";
        btn.disabled = false;
    }

    // Function to take attendance
    function takeAttendance() {
        if (!navigator.geolocation) {
            message.textContent = "Geolocation is not supported by this browser.";
            message.style.color = "red";
            return;
        }

        showLoading();

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const latitude = position.coords.latitude;
                const longitude = position.coords.longitude;
                const accuracy = position.coords.accuracy; // Location accuracy in meters
                const studentId = document.getElementById("studentId").value; // Assuming there's a hidden input for student ID

                // Show accuracy info to the user
                message.textContent = `Location Accuracy: ${accuracy.toFixed(2)} meters`;

                if (accuracy > 100) {
                    message.style.color = "orange";
                    message.textContent += " - Accuracy is low, please move to a more open area.";
                }

                // Get the CSRF token from the hidden input field
                const csrfToken = document.querySelector('input[name="_csrf"]').value;

                // Send geolocation data to the server
                fetch("/admin/take-attendance", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ studentId, latitude, longitude, _csrf: csrfToken }),
                })
                .then(response => response.json())
                .then(data => {
                    message.textContent = data.message;
                    message.style.color = data.success ? "green" : "red";
                    hideLoading(); // Hide loading spinner and re-enable button
                })
                .catch(error => {
                    console.error("Error:", error);
                    message.textContent = "Error marking attendance.";
                    message.style.color = "red";
                    hideLoading();
                });
            },
            (error) => {
                message.textContent = "Error getting location: " + error.message;
                message.style.color = "red";
                hideLoading();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }

    // Event listener for "Take Attendance" button
    btn.addEventListener("click", takeAttendance);

    // Handle Take Attendance button click
    const takeAttendanceBtn = document.getElementById('take-attendance');
    if (takeAttendanceBtn) {
        takeAttendanceBtn.addEventListener('click', function() {
            // Redirect to take attendance page
            window.location.href = '/admin/take-attendance';
        });
    }

    // Initialize stats counters with animation
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const finalValue = parseFloat(stat.textContent);
        animateValue(stat, 0, finalValue, 1000);
    });
});

// Function to animate number counting
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        let value = Math.floor(progress * (end - start) + start);
        
        // If it's a percentage, keep one decimal place
        if (obj.textContent.includes('%')) {
            value = (progress * (end - start) + start).toFixed(1);
            obj.textContent = value + '%';
        } else {
            obj.textContent = value;
        }
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}
