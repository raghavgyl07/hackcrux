/**
 * priorityCalculator.js
 * 
 * AI-Powered Patient Triage Priority System using Google Gemini API.
 * Falls back to local keyword-based scoring when GEMINI_API_KEY is not available.
 */

const OpenAI = require('openai');

// ═══════════════════════════════════════════════════════
// PRIORITY LEVEL CONSTANTS
// ═══════════════════════════════════════════════════════
const PRIORITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const LEVEL_MAP = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 
  'General Medicine', 'Pediatrics', 'ENT'
];

async function assignPriority(age, symptoms, registrationTime, visualFindings = null, historicalExamples = []) {
  // Try Gemini API first
  if (process.env.GEMINI_API_KEY) {
    try {
      const gemini = new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      });

      const visionContext = visualFindings && visualFindings.length > 0
        ? `\nVisual findings from image: ${visualFindings.join(', ')}`
        : "";

      // Format historical examples for the few-shot section
      const examplesContext = historicalExamples.length > 0
        ? "\n\n### HISTORICAL EXAMPLES (Few-Shot Examples)\n" + historicalExamples.map((ex, i) => `
Example Case ${i + 1}:
Symptoms: ${ex.symptoms}
Visual Findings: ${ex.visual_findings || 'None'}
Priority: ${ex.priority}
Department: ${ex.department}`).join('\n')
        : "";

      const completion = await gemini.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert hospital triage AI. Your goal is to assign the correct medical urgency (PRIORITY) and hospital DEPARTMENT based on patient symptoms, visual findings from uploaded images, and historical context.

### PRIORITY DEFINITIONS:
- CRITICAL: Life-threatening symptoms (severe chest pain, stroke signs, heavy bleeding, difficulty breathing, loss of consciousness).
- HIGH: Serious symptoms requiring urgent care (high fever, severe pain, head injury).
- MEDIUM: Moderate symptoms requiring doctor attention (vomiting, dizziness, minor infections).
- LOW: Minor symptoms (common cold, mild headache, minor cuts).

### DEPARTMENT GUIDELINES:
- Cardiology: Chest pain, heart-related issues.
- Orthopedics: Bone fractures, joint injuries, musculoskeletal pain.
- Dermatology: Skin rashes, infections, burns, lesions.
- Neurology: Headaches, seizures, paralysis, stroke symptoms.
- Pediatrics: All symptoms and issues for children and adolescents (age <= 18).
- General Medicine: Fever, infections, common ailments for adults.
- ENT: Ear, nose, throat, sinus issues.

### SAFETY RULES:
1. If symptoms indicate an EMERGENCY, ALWAYS choose CRITICAL.
2. If confidence is low, choose HIGHER urgency to ensure patient safety.
3. NEVER output a department that is not in the list.
4. Always provide valid JSON.${examplesContext}`
          },
          {
            role: "user",
            content: `Analyze this patient case:
Patient Age: ${age}
Symptoms: ${symptoms}${visionContext}

Reply with ONLY a JSON object:
{
  "priority": "LEVEL", 
  "department": "DEPARTMENT", 
  "visual_findings": ["findings extracted from visual findings input if any"], 
  "risk_indicators": ["potential risks"], 
  "reason": "Clear clinical reasoning based on inputs and historical patterns"
}`
          }
        ],
        temperature: 0,
        response_format: { type: "json_object" }
      });

      const response = JSON.parse(completion.choices[0].message.content);
      const priority = response.priority?.toUpperCase();
      const department = response.department;
      
      if (PRIORITY_LEVELS.includes(priority)) {
        return {
          priority,
          score: LEVEL_MAP[priority],
          department: DEPARTMENTS.includes(department) ? department : 'General Medicine',
          reason: response.reason || '',
          risk_indicators: response.risk_indicators || [],
          visualFindings: response.visual_findings || visualFindings || [],
          source: 'gemini-ai'
        };
      }
    } catch (error) {
      // Auto-retry on rate limit (429) for free-tier Gemini
      if (error.status === 429) {
        console.warn('Gemini rate limit hit, retrying in 3s...');
        await new Promise(r => setTimeout(r, 3000));
        try {
          const geminiRetry = new OpenAI({
            apiKey: process.env.GEMINI_API_KEY,
            baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
          });
          const retryCompletion = await geminiRetry.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
              { role: "system", content: "You are a hospital triage AI. Classify urgency and department. Reply with ONLY JSON: {\"priority\":\"LEVEL\",\"department\":\"DEPT\",\"reason\":\"...\",\"risk_indicators\":[],\"visual_findings\":[]}" },
              { role: "user", content: `Age: ${age}, Symptoms: ${symptoms}` }
            ],
            temperature: 0,
            response_format: { type: "json_object" }
          });
          const retryResp = JSON.parse(retryCompletion.choices[0].message.content);
          const retryPriority = retryResp.priority?.toUpperCase();
          if (PRIORITY_LEVELS.includes(retryPriority)) {
            return {
              priority: retryPriority,
              score: LEVEL_MAP[retryPriority],
              department: DEPARTMENTS.includes(retryResp.department) ? retryResp.department : 'General Medicine',
              reason: retryResp.reason || '',
              risk_indicators: retryResp.risk_indicators || [],
              visualFindings: retryResp.visual_findings || visualFindings || [],
              source: 'gemini-ai'
            };
          }
        } catch (retryErr) {
          console.error('Gemini retry also failed:', retryErr.message);
        }
      }
      console.error('Gemini API error, falling back to local scoring:', error.message);
    }
  }

  // Fallback: local keyword-based scoring
  const localResult = assignPriorityLocal(age, symptoms);
  
  // Basic department keyword mapping for local fallback
  let department = 'General Medicine';
  
  // Use regex with word boundaries to avoid partial matches like "years" matching "ear"
  const matches = (keywords) => {
    const text = (symptoms || '').toLowerCase();
    return keywords.some(k => new RegExp(`\\b${k}\\b`, 'i').test(text));
  };

  if (matches(['chest', 'heart', 'cardiac', 'palpitations'])) department = 'Cardiology';
  else if (matches(['brain', 'stroke', 'head', 'seizure', 'paralysis'])) department = 'Neurology';
  else if (matches(['bone', 'fracture', 'leg', 'arm', 'back', 'joint', 'knee', 'shoulder'])) department = 'Orthopedics';
  else if (matches(['skin', 'rash', 'itch', 'burn', 'acne'])) department = 'Dermatology';
  else if (matches(['ear', 'nose', 'throat', 'sinus', 'tonsil'])) department = 'ENT';
  else if (age <= 18) department = 'Pediatrics';
  else department = 'General Medicine';

  return {
    ...localResult,
    department
  };
}

// ═══════════════════════════════════════════════════════
// LOCAL FALLBACK SCORING (keyword-based)
// ═══════════════════════════════════════════════════════
const SYMPTOM_KEYWORDS = {
  CRITICAL: [
    'chest pain', 'breathing difficulty', 'shortness of breath',
    'stroke', 'unconscious', 'severe bleeding', 'cardiac arrest',
    'heart attack', 'seizure', 'loss of consciousness', 'not breathing',
    'difficulty breathing', 'can\'t breathe'
  ],
  HIGH: [
    'high fever', 'severe pain', 'severe abdominal pain',
    'persistent vomiting', 'head injury', 'broken bone',
    'fracture', 'deep cut', 'severe injury', 'blood in stool',
    'severe headache', 'weakness'
  ],
  MEDIUM: [
    'fever', 'vomiting', 'stomach pain', 'dizziness',
    'dehydration', 'moderate pain', 'infection', 'nausea',
    'swelling', 'rash', 'sprain'
  ],
  LOW: [
    'cold', 'cough', 'headache', 'sore throat', 'fatigue',
    'mild pain', 'runny nose', 'sneezing', 'minor cut',
    'mild headache', 'common cold'
  ]
};

function assignPriorityLocal(age, symptoms) {
  const text = (symptoms || '').toLowerCase();
  let matchedLevel = 'MEDIUM'; // Default
  
  // Check from most severe to least
  for (const level of PRIORITY_LEVELS) {
    const keywords = SYMPTOM_KEYWORDS[level];
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        matchedLevel = level;
        // Found a match at this level — use it (most severe wins since we check CRITICAL first)
        return {
          priority: matchedLevel,
          score: LEVEL_MAP[matchedLevel],
          source: 'local-fallback'
        };
      }
    }
  }

  // Age-based escalation for elderly patients
  if (age > 65 && matchedLevel !== 'CRITICAL') {
    // Elderly patients with any symptoms get bumped up one level
    const currentIdx = PRIORITY_LEVELS.indexOf(matchedLevel);
    if (currentIdx > 0) {
      matchedLevel = PRIORITY_LEVELS[currentIdx - 1];
    }
  }

  return {
    priority: matchedLevel,
    score: LEVEL_MAP[matchedLevel],
    source: 'local-fallback'
  };
}

// ═══════════════════════════════════════════════════════
// PRIORITY ESCALATION (time-based)
// ═══════════════════════════════════════════════════════
function updatePriorityWithTime(patient) {
  const regTime = new Date(patient.registrationTime);
  const diffMinutes = Math.floor((new Date() - regTime) / (1000 * 60));
  
  let currentLevel = (patient.priorityLevel || 'MEDIUM').toUpperCase();
  
  // Don't escalate CRITICAL — already at max
  if (currentLevel === 'CRITICAL') {
    return { priorityScore: LEVEL_MAP['CRITICAL'], priorityLevel: 'CRITICAL' };
  }

  // Time-based escalation rules
  if (diffMinutes >= 180) {
    // >= 3 hours: escalate to at least HIGH
    if (currentLevel !== 'CRITICAL' && currentLevel !== 'HIGH') {
      currentLevel = 'HIGH';
    }
  } else if (diffMinutes >= 120 && currentLevel === 'MEDIUM') {
    currentLevel = 'HIGH';
  } else if (diffMinutes >= 60 && currentLevel === 'LOW') {
    currentLevel = 'MEDIUM';
  }

  return {
    priorityScore: LEVEL_MAP[currentLevel],
    priorityLevel: currentLevel
  };
}

// ═══════════════════════════════════════════════════════
// PATIENT QUEUE SORTING
// ═══════════════════════════════════════════════════════
function sortPatientQueue(patients) {
  return patients.sort((a, b) => {
    const levelA = LEVEL_MAP[a.priority_level?.toUpperCase()] || 0;
    const levelB = LEVEL_MAP[b.priority_level?.toUpperCase()] || 0;

    // 1. Higher priority level first (CRITICAL > HIGH > MEDIUM > LOW)
    if (levelA !== levelB) {
      return levelB - levelA;
    }

    // 2. Same priority → earliest registration first
    return new Date(a.report_date).getTime() - new Date(b.report_date).getTime();
  });
}

// ═══════════════════════════════════════════════════════
// LEGACY EXPORTS (backward compatibility)
// ═══════════════════════════════════════════════════════
function getAgeScore(age) {
  if (age >= 0 && age <= 5) return 4;
  if (age >= 6 && age <= 18) return 2;
  if (age >= 19 && age <= 40) return 1;
  if (age >= 41 && age <= 60) return 3;
  if (age > 60) return 5;
  return 1;
}

function getSymptomScore(symptoms) {
  const text = (symptoms || '').toLowerCase();
  for (const keyword of SYMPTOM_KEYWORDS.CRITICAL) {
    if (text.includes(keyword)) return 10;
  }
  for (const keyword of SYMPTOM_KEYWORDS.HIGH) {
    if (text.includes(keyword)) return 8;
  }
  for (const keyword of SYMPTOM_KEYWORDS.MEDIUM) {
    if (text.includes(keyword)) return 5;
  }
  return 2;
}

function calculatePriority(patient) {
  const symptomScore = getSymptomScore(patient.symptoms);
  const ageScore = getAgeScore(patient.age);
  return Number(((0.5 * symptomScore) + (0.3 * ageScore) + 0.2).toFixed(1));
}

function getPriorityLevel(score) {
  if (score >= 8) return "CRITICAL";
  if (score >= 6) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}

module.exports = {
  assignPriority,
  assignPriorityLocal,
  updatePriorityWithTime,
  sortPatientQueue,
  PRIORITY_LEVELS,
  LEVEL_MAP,
  // Legacy exports
  getAgeScore,
  getSymptomScore,
  calculatePriority,
  getPriorityLevel
};
