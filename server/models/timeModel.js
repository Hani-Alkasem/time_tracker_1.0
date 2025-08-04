const db = require('../db');

// ⏰ Create a new clock-in log
const createLog = async (userId, manual = false) => {
  const [result] = await db.query(
    'INSERT INTO time_logs (user_id, clock_in, manual, approved) VALUES (?, NOW(), ?, ?)',
    [userId, manual, !manual]
  );
  return result.insertId;
};

// ⏹️ Update clock-out
const updateClockOut = async (logId) => {
  await db.query('UPDATE time_logs SET clock_out = NOW() WHERE id = ?', [logId]);
};

// ☕ Insert break start into breaks table
const addBreakStart = async (logId) => {
  const [result] = await db.query(
    'INSERT INTO breaks (log_id, break_start) VALUES (?, NOW())',
    [logId]
  );
  return result.insertId;
};

// 🍽️ End the last open break for the current log
const endBreak = async (logId) => {
  await db.query(
    'UPDATE breaks SET break_end = NOW() WHERE log_id = ? AND break_end IS NULL ORDER BY id DESC LIMIT 1',
    [logId]
  );
};

// 📄 Get all breaks for a log
const getBreaks = async (logId) => {
  const [rows] = await db.query(
    'SELECT break_start, break_end FROM breaks WHERE log_id = ? ORDER BY break_start ASC',
    [logId]
  );
  return rows;
};

// 📌 Get most recent log for a user
const getLatestLog = async (userId) => {
  const [rows] = await db.query(
    'SELECT * FROM time_logs WHERE user_id = ? ORDER BY id DESC LIMIT 1',
    [userId]
  );
  return rows[0];
};

// 📅 Get logs between two dates (used in timesheet)
const getUserLogs = async (userId, startDate, endDate) => {
  const [rows] = await db.query(
    `SELECT * FROM time_logs
     WHERE user_id = ? AND clock_in BETWEEN ? AND ?
     ORDER BY clock_in DESC`,
    [userId, startDate, endDate]
  );

  for (let log of rows) {
    log.breaks = await getBreaks(log.id);
  }

  return rows;
};

// 📆 Get today's log
const getTodayLog = async (userId) => {
  const [rows] = await db.query(
    `SELECT * FROM time_logs
     WHERE user_id = ? AND DATE(clock_in) = CURDATE()
     ORDER BY id DESC LIMIT 1`,
    [userId]
  );

  const log = rows[0];
  if (log) {
    log.breaks = await getBreaks(log.id);
  }

  return log;
};

// 📊 Get logs from current week (Mon–Sun)
const getWeekLogs = async (userId) => {
  const [rows] = await db.query(
    `SELECT * FROM time_logs
     WHERE user_id = ? AND YEARWEEK(clock_in, 1) = YEARWEEK(CURDATE(), 1)
     ORDER BY clock_in DESC`,
    [userId]
  );

  for (let log of rows) {
    log.breaks = await getBreaks(log.id);
  }

  return rows;
};

module.exports = {
  createLog,
  updateClockOut,
  addBreakStart,
  endBreak,
  getLatestLog,
  getUserLogs,
  getTodayLog,
  getWeekLogs,
  getBreaks 
};
