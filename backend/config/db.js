const path = require('path');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Dotenv Error in db.js:', result.error.message);
} else {
  console.log('Dotenv loaded from:', envPath);
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase variables MISSING in db.js after dotenv reload.");
} else {
  console.log('Supabase URL:', supabaseUrl);
  console.log('Supabase Key Summary:', supabaseKey.substring(0, 10) + '...' + supabaseKey.substring(supabaseKey.length - 5));
}

const db = createClient(supabaseUrl, supabaseKey);

// JWT Role Check
let actualRole = 'unknown';
try {
  const parts = supabaseKey.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    actualRole = payload.role;
  }
} catch (e) {}

console.log(`Supabase Client initialized. Internal Role: ${actualRole}`);

module.exports = db;