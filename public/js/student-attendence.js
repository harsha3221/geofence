document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("markAttendanceBtn");
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
                const studentId = document.getElementById("studentId").value; // Student ID

                // Show accuracy info to the user
                message.textContent = `Location Accuracy: ${accuracy.toFixed(2)} meters`;

                if (accuracy > 100) {
                    message.style.color = "orange";
                    message.textContent += " - Accuracy is low, please move to a more open area.";
                }

                // Get the CSRF token from the page's hidden input field
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

    // Event listener for "Mark Attendance" button
    btn.addEventListener("click", takeAttendance);
});
