const express = require("express");
const studentController = require("../controllers/studentController");

const router = express.Router();

router.get("/dashboard", studentController.getDashboard);
router.get("/check-in", studentController.getCheckIn);
router.post("/check-in", studentController.postCheckIn);
router.get("/attendance", studentController.getAttendance);
router.get("/profile", studentController.getProfile); 
router.post("/update-profile", studentController.postUpdateProfile);

module.exports = router;
