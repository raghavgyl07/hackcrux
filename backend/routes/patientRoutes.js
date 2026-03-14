const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { runNlpScript, generateAiSummary } = require('../utils/nlpRunner');
const { assignPriority } = require('../utils/priorityCalculator');

// Create a short id like PAT-2026-001
const generatePatientId = () => {
  const year = new Date().getFullYear();
  const randomSerial = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAT-${year}-${randomSerial}`;
};

// Create a new report
router.post('/submit', async (req, res) => {
  const { name, email, age, symptoms } = req.body;
  if (!name || !email || !age || !symptoms) return res.status(400).json({ error: 'Missing fields' });

  try {
    const reportId = generatePatientId();
    const registrationTime = new Date().toISOString();
    
    // Run NLP script in background (optional enrichment)
    runNlpScript(symptoms, age).catch(() => {});
    
    // Use Grok AI to assign priority (falls back to local scoring if no API key)
    const priorityResult = await assignPriority(age, symptoms, registrationTime);
    const priority_level = priorityResult.priority;
    const priority_score = priorityResult.score;
    
    // Generate AI clinical summary
    const aiSummary = await generateAiSummary(symptoms);

    db.run(
      `INSERT INTO Reports (report_id, patient_id, patient_name, patient_email, age, ai_summary, priority_level, priority_score, report_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [reportId, email, name, email, age, aiSummary, priority_level, priority_score, registrationTime],
      function (err) {
        if (err) return res.status(400).json({ error: err.message });
        res.status(201).json({ 
          message: 'Report created', 
          reportId,
          priority: priority_level,
          prioritySource: priorityResult.source
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get patient's own reports
router.get('/reports', (req, res) => {
  const email = req.query.email; // Replace with JWT later
  if (!email) return res.status(400).json({ error: 'Email required' });

  db.all(`SELECT report_id as id, report_date, priority_level, priority_score FROM Reports WHERE patient_email = ?`, [email], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(row => ({
      ...row,
      report_date: row.report_date.endsWith('Z') || row.report_date.includes('T') ? row.report_date : row.report_date.replace(' ', 'T') + 'Z'
    })));
  });
});

module.exports = router;
