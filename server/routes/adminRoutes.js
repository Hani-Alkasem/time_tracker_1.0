const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const fs = require('fs');
const path = require('path');

module.exports = (io) => {
  router.get('/export-pdf', verifyToken, isAdmin, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'Missing date range' });

    try {
      const [rows] = await db.query(
        `SELECT users.name AS employee, time_logs.clock_in, time_logs.clock_out, 
                time_logs.break_start, time_logs.break_end, time_logs.manual, time_logs.approved
         FROM time_logs
         JOIN users ON users.id = time_logs.user_id
         WHERE clock_in BETWEEN ? AND ?
         ORDER BY time_logs.clock_in ASC`,
        [start, end]
      );

      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="logs-${start}_to_${end}.pdf"`);

      doc.fontSize(14).text(`Employee Logs: ${start} to ${end}`, { align: 'center' });
      doc.moveDown();

      rows.forEach((log, i) => {
        doc
          .fontSize(10)
          .text(
            `${i + 1}. ${log.employee}
Clock In: ${log.clock_in}
Break Start: ${log.break_start || '-'}
Break End: ${log.break_end || '-'}
Clock Out: ${log.clock_out}
Manual: ${log.manual ? 'Yes' : 'No'} | Approved: ${log.approved ? 'Yes' : 'No'}`,
            { paragraphGap: 10 }
          )
          .moveDown();
      });

      doc.end();
      doc.pipe(res);
    } catch (err) {
      res.status(500).json({ message: 'Failed to generate PDF', error: err.message });
    }
  });

  router.get('/export', verifyToken, isAdmin, async (req, res) => {
    const { start, end } = req.query;

    if (!start || !end) return res.status(400).json({ message: 'Missing date range' });

    try {
      const [rows] = await db.query(
        `SELECT users.name AS employee, time_logs.clock_in, time_logs.break_start, time_logs.break_end, time_logs.clock_out
         FROM time_logs
         JOIN users ON users.id = time_logs.user_id
         WHERE clock_in BETWEEN ? AND ?
         ORDER BY clock_in DESC`,
        [start, end]
      );

      const parser = new Parser({
        fields: ['employee', 'clock_in', 'break_start', 'break_end', 'clock_out']
      });

      const csv = parser.parse(rows);
      const fileName = `timesheet-${start}_to_${end}.csv`;
      const filePath = path.join(__dirname, '..', 'exports', fileName);

      if (!fs.existsSync(path.dirname(filePath))) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
      }

      fs.writeFileSync(filePath, csv);

      res.download(filePath, fileName, () => {
        fs.unlinkSync(filePath);
      });
    } catch (err) {
      res.status(500).json({ message: 'CSV export failed', error: err.message });
    }
  });

  router.post('/approve/:id', verifyToken, isAdmin, async (req, res) => {
    const logId = req.params.id;
    try {
      await db.query('UPDATE time_logs SET approved = 1 WHERE id = ?', [logId]);
      io.emit('log-updated');
      res.json({ message: 'Log approved' });
    } catch (err) {
      res.status(500).json({ message: 'Approval failed', error: err.message });
    }
  });

  router.get('/hours-per-user', verifyToken, isAdmin, async (req, res) => {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ message: 'Missing date range' });

    try {
      const [rows] = await db.query(
        `SELECT users.name AS employee, 
                SUM(TIMESTAMPDIFF(MINUTE, clock_in, clock_out)) / 60 AS total_hours
         FROM time_logs
         JOIN users ON users.id = time_logs.user_id
         WHERE clock_in IS NOT NULL AND clock_out IS NOT NULL
           AND clock_in BETWEEN ? AND ?
         GROUP BY user_id
         ORDER BY total_hours DESC`,
        [start, end]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: 'Failed to calculate hours', error: err.message });
    }
  });

  return router;
};
