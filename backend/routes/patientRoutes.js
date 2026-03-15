const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { runNlpScript, generateAiSummary } = require('../utils/nlpRunner');
const { assignPriority } = require('../utils/priorityCalculator');
const multer = require('multer');
const path = require('path');
const { analyzeImage } = require('../utils/visionAnalyzer');

// Setup storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Create a short id like PAT-2026-001
const generatePatientId = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-4);
  const randomSerial = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PAT-${year}-${timestamp}-${randomSerial}`;
};

// Helper to get last 5 reports for few-shot learning
const getHistoricalExamples = async () => {
  try {
    if (db.isSupabase) {
      const { data, error } = await db
        .from('reports')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(5);
      if (error) return [];
      return data.map(r => ({
        symptoms: r.symptoms, // Note: symptoms might be the summary if we only stored summary before, but let's assume we store input
        // Wait, the reports table has ai_summary, not direct symptoms. Let's check.
        // Actually, let's use ai_summary as the symptom description for history
        symptoms: r.ai_summary,
        visual_findings: r.visual_findings,
        priority: r.priority_level,
        department: r.predicted_department
      }));
    } else {
      return await new Promise((resolve) => {
        db.all(
          `SELECT ai_summary as symptoms, visual_findings, priority_level as priority, predicted_department as department 
           FROM reports ORDER BY report_date DESC LIMIT 5`,
          [],
          (err, rows) => resolve(err ? [] : rows)
        );
      });
    }
  } catch (e) {
    return [];
  }
};

// Create a new report (Multi-modal with Few-Shot Learning)
router.post('/submit', upload.single('image'), async (req, res) => {
  const { name, email, age, symptoms } = req.body;
  if (!name || !email || !age || !symptoms) {
    return res.status(400).json({ error: 'All fields (name, email, age, symptoms) are required.' });
  }

  const parsedAge = parseInt(age);
  const registrationTime = new Date().toISOString();
  
  try {
    const reportId = generatePatientId();
    let imageUrl = null;
    let visualFindings = [];

    // 1. Fetch History for Few-Shot Learning
    const history = await getHistoricalExamples();

    // 2. Analyze image if provided
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      const visionResult = await analyzeImage(req.file.path);
      visualFindings = visionResult.visual_findings || [];
    }

    // 3. Multi-modal Triage with Few-Shot examples
    const priorityResult = await assignPriority(parsedAge, symptoms, registrationTime, visualFindings, history);
    const aiSummary = await generateAiSummary(symptoms);

    const reportData = {
      report_id: reportId,
      patient_id: email,
      patient_name: name,
      patient_email: email,
      age: parsedAge,
      ai_summary: aiSummary,
      predicted_department: priorityResult.department,
      priority_level: priorityResult.priority,
      priority_score: priorityResult.score,
      image_url: imageUrl,
      visual_findings: JSON.stringify(priorityResult.visualFindings || visualFindings),
      ai_reason: priorityResult.reason,
      risk_indicators: JSON.stringify(priorityResult.risk_indicators),
      report_date: registrationTime
    };

    if (db.isSupabase) {
      // Retry loop: auto-strip columns that don't exist in Supabase table
      let insertData = { ...reportData };
      let lastError = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await db.from('reports').insert([insertData]);
        if (!error) { lastError = null; break; }
        // If error is about a missing column, strip it and retry
        const colMatch = error.message.match(/Could not find the '(\w+)' column/);
        if (colMatch) {
          console.warn(`Supabase: column '${colMatch[1]}' missing, stripping and retrying...`);
          delete insertData[colMatch[1]];
          lastError = error;
        } else {
          throw new Error(`Supabase error: ${error.message}`);
        }
      }
      if (lastError) throw new Error(`Supabase error: ${lastError.message}`);
    } else {
      await new Promise((resolve, reject) => {
        const cols = Object.keys(reportData).join(', ');
        const placeholders = Object.keys(reportData).map(() => '?').join(', ');
        db.run(
          `INSERT INTO reports (${cols}) VALUES (${placeholders})`,
          Object.values(reportData),
          (err) => err ? reject(err) : resolve()
        );
      });
    }

    res.status(201).json({ 
      message: 'Report created successfully', 
      reportId,
      priority: priorityResult.priority,
      department: priorityResult.department,
      reason: priorityResult.reason,
      visualFindings
    });

  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get patient's own reports
router.get('/reports', async (req, res) => {
  const email = req.query.email;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    let reports;
    if (db.isSupabase) {
      const { data, error } = await db
        .from('reports')
        .select('*')
        .eq('patient_email', email)
        .order('report_date', { ascending: false });
      if (error) throw error;
      reports = data.map(row => ({ id: row.report_id, ...row }));
    } else {
      reports = await new Promise((resolve, reject) => {
        db.all(
          `SELECT *, report_id as id FROM reports WHERE patient_email = ? ORDER BY report_date DESC`,
          [email],
          (err, rows) => err ? reject(err) : resolve(rows)
        );
      });
    }

    // Apply dynamic priority escalation (same as doctor routes) for consistency
    const { updatePriorityWithTime } = require('../utils/priorityCalculator');
    reports = reports.map(report => {
      const updated = updatePriorityWithTime({
        symptoms: report.ai_summary || '',
        age: report.age,
        registrationTime: report.report_date,
        priorityScore: report.priority_score,
        priorityLevel: report.priority_level
      });
      return { ...report, priority_score: updated.priorityScore, priority_level: updated.priorityLevel };
    });

    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
