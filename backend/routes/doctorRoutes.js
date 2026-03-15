const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { updatePriorityWithTime, sortPatientQueue, LEVEL_MAP } = require('../utils/priorityCalculator');

// Doctor Login Flow: Check email existence in 'doctors' table
router.post('/login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const { data, error } = await db
      .from('doctors')
      .select('*')
      .eq('email', email)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    const doctor = data;

    if (!doctor) {
      return res.json({ exists: false });
    }

    res.json({ 
      exists: true, 
      doctor: { 
        id: doctor.doctor_id, 
        email: doctor.email, 
        department: doctor.department 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Doctor Register: Save new doctor with department
router.post('/register', async (req, res) => {
  const { email, department } = req.body;
  if (!email || !department) return res.status(400).json({ error: 'Email and department required' });

  try {
    const { data, error } = await db
      .from('doctors')
      .insert([{ email, department }])
      .select('*')
      .single();
    if (error) throw error;
    const doctor = data;

    res.status(201).json({ 
      message: 'Doctor registered successfully', 
      doctor: { 
        id: doctor.doctor_id || doctor.id, 
        email: doctor.email, 
        department: doctor.department 
      } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Dashboard Data (Filtered by Department)
router.get('/dashboard', async (req, res) => {
  const { department } = req.query;
  if (!department) return res.status(400).json({ error: 'Department required for filtering' });

  try {
    const { data, error } = await db
      .from('reports')
      .select('*')
      .eq('predicted_department', department)
      .is('doctor_response', null);
    if (error) throw error;
    const rows = data;

    // 1. Escalate priorities dynamically
    let patients = rows.map(report => {
      const updated = updatePriorityWithTime({
        symptoms: report.ai_summary || '',
        age: report.age,
        registrationTime: report.report_date,
        priorityScore: report.priority_score,
        priorityLevel: report.priority_level
      });
      return {
        ...report,
        priority_score: updated.priorityScore,
        priority_level: updated.priorityLevel
      };
    });

    // 2. Sort the patient queue
    patients = sortPatientQueue(patients);

    // 3. Compute stats
    const stats = {
      total: patients.length,
      critical: patients.filter(r => r.priority_level === 'CRITICAL').length,
      high: patients.filter(r => r.priority_level === 'HIGH').length,
      medium: patients.filter(r => r.priority_level === 'MEDIUM').length,
      low: patients.filter(r => r.priority_level === 'LOW').length,
    };

    res.json({ stats, patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Reports (Historical View, Filtered by Department)
router.get('/reports', async (req, res) => {
  const { department } = req.query;
  if (!department) return res.status(400).json({ error: 'Department required' });

  try {
    const { data, error } = await db
      .from('reports')
      .select('*')
      .eq('predicted_department', department)
      .order('report_date', { ascending: false });
    if (error) throw error;
    const rows = data;

    // Apply dynamic priority escalation and sorting
    let patients = rows.map(report => {
      const updated = updatePriorityWithTime({
        symptoms: report.ai_summary || '',
        age: report.age,
        registrationTime: report.report_date,
        priorityScore: report.priority_score,
        priorityLevel: report.priority_level
      });
      return { ...report, priority_score: updated.priorityScore, priority_level: updated.priorityLevel };
    });

    patients = sortPatientQueue(patients);
    res.json({ patients });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single report
router.get('/report/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await db
      .from('reports')
      .select('*')
      .eq('report_id', id)
      .single();
    if (error) throw error;
    const row = data;

    if (!row) return res.status(404).json({ error: 'Report not found' });
      
    // Apply dynamic priority escalation
    const updated = updatePriorityWithTime({
      symptoms: row.ai_summary || '',
      age: row.age,
      registrationTime: row.report_date,
      priorityScore: row.priority_score,
      priorityLevel: row.priority_level
    });
    row.priority_score = updated.priorityScore;
    row.priority_level = updated.priorityLevel;

    res.json(row);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Finalize a report
router.post('/report/:id/finalize', async (req, res) => {
  const { id } = req.params;
  const { doctor_response } = req.body;

  if (!doctor_response) return res.status(400).json({ error: 'Doctor response required' });

  try {
    const { error } = await db
      .from('reports')
      .update({ doctor_response })
      .eq('report_id', id);
    if (error) throw error;
    res.json({ message: 'Report finalized successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
