const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let db;
let isSupabase = false;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
  db = createClient(supabaseUrl, supabaseKey);
  isSupabase = true;
  console.log('Using Supabase database client.');
} else {
  const dbPath = path.resolve(__dirname, '../database.sqlite');
  db = new sqlite3.Database(dbPath);
  console.log('Supabase keys missing. Falling back to SQLite at:', dbPath);
  
  // Ensure tables exist in SQLite
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT CHECK(role IN ('Doctor', 'Patient')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS doctors (
      doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS reports (
      report_id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT,
      patient_email TEXT,
      age INTEGER,
      ai_summary TEXT,
      predicted_department TEXT,
      doctor_response TEXT,
      priority_level TEXT,
      priority_score REAL,
      image_url TEXT,
      visual_findings TEXT,
      ai_reason TEXT,
      risk_indicators TEXT,
      report_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(email)
    )`);
  });
}

// Attach a helper to identify the DB type
db.isSupabase = isSupabase;

/*
SQL FOR SUPABASE DASHBOARD (Run this in the SQL Editor):
-------------------------------------------------------
-- 1. Create users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text CHECK (role IN ('Doctor', 'Patient')) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Create doctors table
CREATE TABLE doctors (
  doctor_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  department text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. Create reports table
CREATE TABLE reports (
  report_id text PRIMARY KEY,
  patient_id text NOT NULL REFERENCES users(email),
  patient_name text,
  patient_email text,
  age integer,
  ai_summary text,
  predicted_department text,
  doctor_response text,
  priority_level text,
  priority_score float8,
  image_url text,
  visual_findings text,
  ai_reason text,
  risk_indicators text,
  report_date timestamptz DEFAULT now()
);
*/

module.exports = db;
