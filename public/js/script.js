document.addEventListener("DOMContentLoaded", () => {
    const loginSelection = document.getElementById("loginSelection");
    const loginForm = document.getElementById("loginForm");
    const loginTitle = document.getElementById("loginTitle");
    const loginError = document.getElementById("loginError");
    const studentSection = document.getElementById("studentSection");
    const adminSection = document.getElementById("adminSection");
    const locationStatus = document.getElementById("locationStatus");
    const attendanceForm = document.getElementById("attendanceForm");
    
    let currentUserType = null;

    function showLoginForm(userType) {
        currentUserType = userType;
        loginSelection.style.display = "none";
        loginForm.style.display = "block";
        loginTitle.textContent = userType === "student" ? "Student Login" : "Admin Login";
        loginError.textContent = "";
    }

    function logout() {
        fetch("/logout", { method: "POST" })
            .then(() => location.reload())
            .catch(console.error);
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        try {
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, userType: currentUserType })
            });

            const data = await res.json();
            if (res.ok) {
                if (currentUserType === "student") showStudentDashboard();
                else showAdminDashboard();
            } else {
                loginError.textContent = data.error || "Invalid credentials";
            }
        } catch (error) {
            console.error("Login failed", error);
        }
    });

    function showStudentDashboard() {
        loginForm.style.display = "none";
        studentSection.style.display = "block";
        initGeolocation();
    }

    function showAdminDashboard() {
        loginForm.style.display = "none";
        adminSection.style.display = "block";
    }

    function initGeolocation() {
        if (!navigator.geolocation) {
            updateStatusDisplay("error", "Geolocation is not supported by your browser");
            return;
        }
        navigator.geolocation.watchPosition(handleLocation, handleLocationError, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        });
    }

    function handleLocation(position) {
        fetch("/check-location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude
            })
        })
        .then(res => res.json())
        .then(data => {
            updateStatusDisplay(data.status, data.message);
            attendanceForm.style.display = data.status === "success" ? "block" : "none";
        })
        .catch(console.error);
    }

    function handleLocationError(error) {
        updateStatusDisplay("error", "Location access denied. Allow it to mark attendance.");
    }

    function updateStatusDisplay(type, message) {
        locationStatus.className = `status-box ${type}`;
        locationStatus.textContent = message;
    }

    attendanceForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const studentId = document.getElementById("studentId").value;
        const name = document.getElementById("name").value;

        fetch("/mark-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId, name })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert("Attendance marked successfully!");
                attendanceForm.reset();
            } else {
                alert("Failed to mark attendance");
            }
        })
        .catch(console.error);
    });
});
