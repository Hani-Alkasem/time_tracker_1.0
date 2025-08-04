const timeModel = require('../models/timeModel');

// ⏰ Clock In
const clockIn = async (req, res) => {
  try {
    const logId = await timeModel.createLog(req.user.id);
    res.json({ message: 'Clocked in', logId });
  } catch (err) {
    res.status(500).json({ message: 'Clock-in failed', error: err.message });
  }
};

// 🕔 Clock Out
const clockOut = async (req, res) => {
  try {
    const latest = await timeModel.getLatestLog(req.user.id);
    if (!latest || latest.clock_out) {
      return res.status(400).json({ message: 'No active session found' });
    }
    await timeModel.updateClockOut(latest.id);
    res.json({ message: 'Clocked out' });
  } catch (err) {
    res.status(500).json({ message: 'Clock-out failed', error: err.message });
  }
};

// ☕ Start Break (multiple breaks supported)
const startBreak = async (req, res) => {
  try {
    const latest = await timeModel.getLatestLog(req.user.id);
    if (!latest || latest.clock_out) {
      return res.status(400).json({ message: 'No active session found' });
    }

    const breaks = await timeModel.getBreaks(latest.id);
    const isOnBreak = breaks.some((b) => !b.break_end);

    if (isOnBreak) {
      return res.status(400).json({ message: 'Break already in progress' });
    }

    await timeModel.addBreakStart(latest.id);
    res.json({ message: 'Break started' });
  } catch (err) {
    console.error('❌ Break start error:', err);
    res.status(500).json({ message: 'Break start failed', error: err.message });
  }
};

// 🍽️ End Break
const endBreak = async (req, res) => {
  try {
    const latest = await timeModel.getLatestLog(req.user.id);
    if (!latest || latest.clock_out) {
      return res.status(400).json({ message: 'No active session found' });
    }

    const breaks = await timeModel.getBreaks(latest.id);
    const lastBreak = breaks.find((b) => !b.break_end);

    if (!lastBreak) {
      return res.status(400).json({ message: 'No active break found' });
    }

    await timeModel.endBreak(latest.id);
    res.json({ message: 'Break ended' });
  } catch (err) {
    console.error('❌ Break end error:', err);
    res.status(500).json({ message: 'Break end failed', error: err.message });
  }
};

// 📅 Today's Status
const getTodayLog = async (req, res) => {
  try {
    const log = await timeModel.getTodayLog(req.user.id);
    res.json(log || {});
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch today\'s log', error: err.message });
  }
};

// 📊 Weekly Timesheet
const getWeekLogs = async (req, res) => {
  try {
    const logs = await timeModel.getWeekLogs(req.user.id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch weekly logs', error: err.message });
  }
};

// 📆 Custom Range Timesheet
const getTimesheet = async (req, res) => {
  try {
    const { start, end } = req.query;
    const logs = await timeModel.getUserLogs(req.user.id, start, end);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch timesheet', error: err.message });
  }
};

module.exports = {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getTodayLog,
  getWeekLogs,
  getTimesheet
};
