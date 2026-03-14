/**
 * priorityCalculator.js
 * 
 * AI-Powered Patient Triage Priority System using Grok LLM API.
 * Falls back to local keyword-based scoring when XAI_API_KEY is not available.
 */

const OpenAI = require('openai');

// ═══════════════════════════════════════════════════════
// PRIORITY LEVEL CONSTANTS
// ═══════════════════════════════════════════════════════
const PRIORITY_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const LEVEL_MAP = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

// ═══════════════════════════════════════════════════════
// GROK AI PRIORITY ASSIGNMENT
// ═══════════════════════════════════════════════════════
async function assignPriority(age, symptoms, registrationTime) {
  // Try Grok API first
  if (process.env.XAI_API_KEY) {
    try {
      const grok = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });

      const completion = await grok.chat.completions.create({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: `You are a hospital triage AI. Given a patient's age and symptoms, classify the medical urgency.

Reply with ONLY one word — the priority level. No explanation. No punctuation.

Priority levels:
CRITICAL — Immediate life-threatening: chest pain, breathing difficulty, stroke symptoms, severe bleeding, loss of consciousness, seizures
HIGH — Serious/urgent: high fever with weakness, severe abdominal pain, persistent vomiting, head injury, elderly patient (>65) with concerning symptoms
MEDIUM — Moderate: fever, moderate pain, vomiting, dizziness, minor infections
LOW — Non-urgent: mild headache, common cold, minor cuts, mild cough`
          },
          {
            role: "user",
            content: `Patient age: ${age}\nSymptoms: ${symptoms}`
          }
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const response = completion.choices[0].message.content.trim().toUpperCase();
      
      // Validate the response is one of the valid levels
      if (PRIORITY_LEVELS.includes(response)) {
        return {
          priority: response,
          score: LEVEL_MAP[response],
          source: 'grok-ai'
        };
      }
      
      // If Grok returned something unexpected, try to extract the level
      for (const level of PRIORITY_LEVELS) {
        if (response.includes(level)) {
          return {
            priority: level,
            score: LEVEL_MAP[level],
            source: 'grok-ai'
          };
        }
      }
      
      // Fall through to local scoring
      console.warn('Grok returned unexpected response:', response);
    } catch (error) {
      console.error('Grok API error, falling back to local scoring:', error.message);
    }
  }

  // Fallback: local keyword-based scoring
  return assignPriorityLocal(age, symptoms);
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
