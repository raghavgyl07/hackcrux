require('dotenv').config();
const db = require('./config/db');

async function fixReport() {
  console.log('Fixing Madhav report department...');
  try {
    if (db.isSupabase) {
      const { error } = await db
        .from('reports')
        .update({ predicted_department: 'General Medicine' })
        .eq('patient_name', 'Madhav Bansal');
      if (error) throw error;
    } else {
      await new Promise((resolve, reject) => {
        db.run(
          "UPDATE reports SET predicted_department = 'General Medicine' WHERE patient_name = 'Madhav Bansal'",
          (err) => err ? reject(err) : resolve()
        );
      });
    }
    console.log('Successfully fixed Madhav report!');
  } catch (err) {
    console.error('Error fixing report:', err);
  }
}

fixReport();
