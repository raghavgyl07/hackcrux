require('dotenv').config();
const db = require('./config/db');

async function checkReports() {
  console.log('Checking reports in database...');
  try {
    let reports;
    if (db.isSupabase) {
      const { data, error } = await db.from('reports').select('*');
      if (error) throw error;
      reports = data;
    } else {
      reports = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM reports', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
    }
    console.log(`Found ${reports.length} reports.`);
    reports.forEach(r => {
      console.log(`ID: ${r.report_id}, Name: ${r.patient_name}, Department: ${r.predicted_department}, Symptoms: ${r.ai_summary || 'N/A'}`);
    });
  } catch (err) {
    console.error('Error checking reports:', err);
  }
}

checkReports();
