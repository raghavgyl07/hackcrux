const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { updatePriorityWithTime, sortPatientQueue, LEVEL_MAP } = require('../utils/priorityCalculator');

// Get Dashboard Data
router.get('/dashboard', (req, res) => {
  db.all(`SELECT * FROM Reports`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    // 1. Escalate priorities dynamically based on waiting time
    let patients = rows.map(report => {
      // Fix date string for timezone parsing
      const reportDate = report.report_date.endsWith('Z') || report.report_date.includes('T') 
        ? report.report_date 
        : report.report_date.replace(' ', 'T') + 'Z';

      const patientData = {
        symptoms: report.ai_summary || '',
        age: report.age,
        registrationTime: reportDate,
        priorityScore: report.priority_score,
        priorityLevel: report.priority_level
      };
      
      const updated = updatePriorityWithTime(patientData);
      return {
        ...report,
        report_date: reportDate,
        priority_score: updated.priorityScore,
        priority_level: updated.priorityLevel
      };
    });

    // 2. Sort the patient queue (CRITICAL > HIGH > MEDIUM > LOW, then earliest registration)
    patients = sortPatientQueue(patients);

    // 3. Compute stats dynamically
    const stats = {
      total: patients.length,
      critical: patients.filter(r => r.priority_level === 'CRITICAL').length,
      high: patients.filter(r => r.priority_level === 'HIGH').length,
      medium: patients.filter(r => r.priority_level === 'MEDIUM').length,
      low: patients.filter(r => r.priority_level === 'LOW').length,
    };

    res.json({ stats, patients });
  });
});

// Get a single report
router.get('/report/:id', (req, res) => {
  const { id } = req.params;
  db.get(`SELECT * FROM Reports WHERE report_id = ?`, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Report not found' });
    
    // Fix date format
    row.report_date = row.report_date.endsWith('Z') || row.report_date.includes('T') 
      ? row.report_date 
      : row.report_date.replace(' ', 'T') + 'Z';
      
    // Apply dynamic priority escalation
    const patientData = {
      symptoms: row.ai_summary || '',
      age: row.age,
      registrationTime: row.report_date,
      priorityScore: row.priority_score,
      priorityLevel: row.priority_level
    };
    
    const updated = updatePriorityWithTime(patientData);
    row.priority_score = updated.priorityScore;
    row.priority_level = updated.priorityLevel;

    res.json(row);
  });
});

// Finalize a report
router.post('/report/:id/finalize', (req, res) => {
  const { id } = req.params;
  const { doctor_response } = req.body;

  if (!doctor_response) return res.status(400).json({ error: 'Doctor response required' });

  db.run(
    `UPDATE Reports SET doctor_response = ? WHERE report_id = ?`,
    [doctor_response, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Report finalized successfully' });
    }
  );
});

module.exports = router;
