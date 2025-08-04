const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTodayLog,
  getWeekLogs,
  getTimesheet,
} = require('../controllers/timeController');

// ⏰ Clock In/Out
router.post('/clock-in', verifyToken, clockIn);
router.post('/clock-out', verifyToken, clockOut);

// ☕ Breaks
router.post('/break-start', verifyToken, startBreak);
router.post('/break-end', verifyToken, endBreak);

// 📅 Daily/Weekly Logs
router.get('/today', verifyToken, getTodayLog);
router.get('/week', verifyToken, getWeekLogs);
router.get('/range', verifyToken, getTimesheet);

module.exports = router;
