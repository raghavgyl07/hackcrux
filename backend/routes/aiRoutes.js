const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const OpenAI = require('openai');

const upload = multer({ dest: 'uploads/' });

router.post('/whisper', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });

  const transcript = req.body.transcript || "";

  // Clean up uploaded file
  try { fs.unlinkSync(req.file.path); } catch {}

  if (!transcript.trim()) {
    return res.json({
      summary: "No speech detected.",
      points: [{ topic: "Status", details: "No transcript was captured from the browser." }]
    });
  }

  try {
    // Use Google Gemini API - OpenAI SDK compatible
    const gemini = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    // Use Gemini to summarize the transcript into clinical points
    const completion = await gemini.chat.completions.create({
      model: "gemini-2.0-flash",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a medical AI assistant. Analyze the following doctor-patient consultation transcript and output a JSON object with two fields: 'summary' (a concise clinical summary string) and 'points' (an array of objects, each with 'topic' and 'details' strings covering key clinical findings like Symptoms, Duration, Severity, Assessment, Plan, etc.)."
        },
        {
          role: "user",
          content: transcript
        }
      ],
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    res.json(aiResponse);

  } catch (error) {
    console.error("Gemini AI processing error:", error);
    // Fallback: return the raw transcript as the summary
    res.json({
      summary: transcript,
      points: [{ topic: "Transcribed Speech", details: transcript }]
    });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/assign-priority
// Gemini AI-powered triage priority assignment
// ═══════════════════════════════════════════════════════
const { assignPriority } = require('../utils/priorityCalculator');

router.post('/assign-priority', async (req, res) => {
  const { age, symptoms, registrationTime } = req.body;

  if (!age || !symptoms) {
    return res.status(400).json({ error: 'Missing required fields: age, symptoms' });
  }

  const regTime = registrationTime || new Date().toISOString();

  try {
    const result = await assignPriority(age, symptoms, regTime);

    res.json({
      age: Number(age),
      symptoms,
      priority: result.priority,
      priorityScore: result.score,
      registrationTime: regTime,
      source: result.source
    });
  } catch (error) {
    console.error('Priority assignment error:', error);
    res.status(500).json({ error: 'Failed to assign priority' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/transcribe
// Uses OpenAI Whisper for accurate backend speech-to-text
// ═══════════════════════════════════════════════════════
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });
  
  try {
    // Requires OPENAI_API_KEY in .env
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is missing in backend environment');
    }
    const openai = new OpenAI({ apiKey });
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
    });
    
    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch {}
    
    res.json({ text: transcription.text });
  } catch (error) {
    console.error("Transcription error:", error.message || error);
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(500).json({ error: 'Failed to transcribe audio. Verify OPENAI_API_KEY is set.' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/process-transcript
// Endpoint for the standalone VoiceRecorder component
// ═══════════════════════════════════════════════════════
router.post('/process-transcript', (req, res) => {
  const { transcript } = req.body;

  if (!transcript || !transcript.trim()) {
    return res.status(400).json({ error: 'Missing or empty transcript.' });
  }

  console.log('--- Received Live Transcript ---');
  console.log(transcript);
  console.log('--------------------------------');
  
  res.status(200).json({ 
    message: 'Transcript received successfully.',
    transcriptPreview: transcript.substring(0, 50) + '...'
  });
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/summarize-consultation
// Doctor-Patient Conversation Filter + Symptom Extraction
// ═══════════════════════════════════════════════════════

// English symptom keywords for regex fallback
const KNOWN_SYMPTOMS_EN = [
  'headache', 'head pain', 'migraine',
  'chest pain', 'heart pain', 'heart hurting',
  'breathing difficulty', 'shortness of breath', 'breathlessness',
  'fever', 'high temperature', 'chills',
  'leg pain', 'leg hurts', 'knee pain',
  'swelling', 'inflammation', 'edema',
  'nausea', 'vomiting', 'stomach pain', 'abdominal pain',
  'dizziness', 'lightheaded', 'vertigo', 'dizzy',
  'cough', 'sore throat', 'throat pain',
  'back pain', 'body ache', 'fatigue', 'weakness',
  'rash', 'skin irritation', 'itching',
  'blurred vision', 'eye pain',
  'ear pain', 'hearing loss',
  'numbness', 'tingling', 'seizure',
  'bleeding', 'blood', 'fracture', 'broken bone',
  'joint pain', 'muscle pain', 'cramps',
  'insomnia', 'sleep issues', 'difficulty sleeping',
  'loss of appetite', 'weight loss',
  'palpitations', 'irregular heartbeat',
  'depression', 'depressed', 'anxiety', 'anxious', 'panic',
  'stress', 'stressed', 'overwhelmed',
];

// Hindi symptom keywords → English mapping (ordered longest-first for greedy matching)
const HINDI_SYMPTOM_MAP = {
  // Compound phrases first (longest match wins)
  'सिर में भी दर्द': 'Headache', 'सिर में दर्द': 'Headache', 'सिर दर्द': 'Headache', 'सिरदर्द': 'Headache',
  'छाती में दर्द': 'Chest pain', 'सीने में दर्द': 'Chest pain',
  'पेट में दर्द': 'Stomach pain', 'पेट दर्द': 'Stomach pain', 'पेट में': 'Stomach pain', 'पेट': 'Stomach pain',
  'बुखार': 'Fever', 'ज्वर': 'Fever', 'तापमान': 'Fever',
  'खांसी': 'Cough', 'खाँसी': 'Cough',
  'गले में दर्द': 'Sore throat', 'गला दर्द': 'Sore throat', 'गला खराब': 'Sore throat',
  'चक्कर आ': 'Dizziness', 'चक्कर': 'Dizziness', 'सिर घूमना': 'Dizziness',
  'उल्टी': 'Vomiting', 'जी मिचलाना': 'Nausea',
  'कमर में दर्द': 'Back pain', 'कमर दर्द': 'Back pain', 'पीठ दर्द': 'Back pain', 'पीठ में दर्द': 'Back pain',
  'सांस लेने में दिक्कत': 'Breathing difficulty', 'सांस लेने में तकलीफ': 'Breathing difficulty',
  'सांस फूलना': 'Shortness of breath', 'साँस फूलना': 'Shortness of breath',
  'टांग में दर्द': 'Leg pain', 'पैर में दर्द': 'Leg pain', 'पैर दर्द': 'Leg pain', 'घुटने में दर्द': 'Knee pain',
  'सूजन': 'Swelling',
  'थकान': 'Fatigue', 'कमजोरी': 'Weakness', 'कमज़ोरी': 'Weakness',
  'नींद नहीं': 'Insomnia', 'नींद न आना': 'Insomnia',
  'भूख नहीं': 'Loss of appetite', 'खाना नहीं': 'Loss of appetite',
  'जोड़ों में दर्द': 'Joint pain', 'जोड़ दर्द': 'Joint pain',
  'खून आना': 'Bleeding', 'खून': 'Bleeding', 'खुजली': 'Itching',
  'तबीयत खराब': 'General malaise', 'हालत खराब': 'General malaise',
  'बेचैनी': 'Anxiety', 'घबराहट': 'Anxiety', 'तनाव': 'Stress', 'उदासी': 'Depression',
  'धड़कन': 'Palpitations', 'दिल': 'Heart-related symptom',
  'आंख में दर्द': 'Eye pain', 'आंख': 'Eye-related symptom', 'कान में दर्द': 'Ear pain',
  'सुन्न': 'Numbness', 'झनझनाहट': 'Tingling',
  'कैंसर': 'Cancer concern (patient fears cancer)',
  'दर्द हो रहा': 'Pain', 'दर्द': 'Pain',
};

const SEVERITY_KEYWORDS = [
  'severe', 'intense', 'chronic', 'worsening', 'unbearable',
  'sharp', 'constant', 'extreme', 'terrible', 'acute',
  'mild', 'moderate', 'persistent', 'occasional', 'intermittent',
];

const HINDI_SEVERITY_MAP = {
  'बहुत': 'Severe', 'ज्यादा': 'Severe', 'तेज': 'Intense',
  'भयंकर': 'Terrible', 'असहनीय': 'Unbearable', 'हल्का': 'Mild', 'थोड़ा': 'Mild',
};

const DURATION_PATTERNS = [
  /since\s+(?:yesterday|last\s+\w+|morning|evening|night|today|\d+\s+\w+\s+ago)/gi,
  /for\s+(?:the\s+)?(?:past\s+)?\d+\s+(?:day|week|month|year|hour|minute)s?/gi,
  /\d+\s+(?:day|week|month|year|hour|minute)s?\s+ago/gi,
  /(?:yesterday|last\s+night|last\s+week|this\s+morning|today|recently)/gi,
];

const HINDI_DURATION_MAP = {
  'कल से': 'Since yesterday', 'पिछले': 'Since last', 'बहुत दिनों से': 'For many days',
  'कई दिनों से': 'For several days', 'आज से': 'Since today', 'सुबह से': 'Since morning',
  'चार दिन': 'For 4 days', 'तीन दिन': 'For 3 days', 'दो दिन': 'For 2 days',
  'एक हफ्ते': 'For 1 week', 'एक महीने': 'For 1 month', 'पांच दिन': 'For 5 days',
  'छह दिन': 'For 6 days', 'सात दिन': 'For 7 days', 'दस दिन': 'For 10 days',
};

/**
 * Regex fallback: extract symptoms from raw text (English + Hindi).
 */
function extractSymptomsWithRegex(text) {
  const lower = text.toLowerCase();
  const symptoms = [];

  // English keyword scan
  for (const kw of KNOWN_SYMPTOMS_EN) {
    if (lower.includes(kw)) {
      symptoms.push(kw.charAt(0).toUpperCase() + kw.slice(1));
    }
  }

  // Hindi keyword scan
  for (const [hindiKw, englishSymptom] of Object.entries(HINDI_SYMPTOM_MAP)) {
    if (text.includes(hindiKw)) {
      if (!symptoms.includes(englishSymptom)) {
        symptoms.push(englishSymptom);
      }
    }
  }

  // English heuristic mappings
  if (lower.includes('heart') && (lower.includes('hurt') || lower.includes('pain'))) {
    if (!symptoms.includes('Chest pain')) symptoms.push('Chest pain');
  }
  if (lower.includes('head') && (lower.includes('hurt') || lower.includes('ache') || lower.includes('pain'))) {
    if (!symptoms.includes('Headache')) symptoms.push('Headache');
  }
  if (lower.includes('leg') && (lower.includes('hurt') || lower.includes('pain'))) {
    if (!symptoms.includes('Leg pain')) symptoms.push('Leg pain');
  }
  if (lower.includes('stomach') && (lower.includes('hurt') || lower.includes('pain'))) {
    if (!symptoms.includes('Stomach pain')) symptoms.push('Stomach pain');
  }
  if (lower.includes("can't breathe") || lower.includes('cannot breathe') || lower.includes('hard to breathe')) {
    if (!symptoms.includes('Breathing difficulty')) symptoms.push('Breathing difficulty');
  }
  if (lower.includes('unwell') || lower.includes('not feeling well') || lower.includes('feeling sick')) {
    if (!symptoms.includes('General malaise')) symptoms.push('General malaise');
  }

  // Severity detection
  const severityFound = [];
  for (const kw of SEVERITY_KEYWORDS) {
    if (lower.includes(kw)) severityFound.push(kw);
  }
  for (const [hindiKw, engSev] of Object.entries(HINDI_SEVERITY_MAP)) {
    if (text.includes(hindiKw)) {
      if (!severityFound.includes(engSev)) severityFound.push(engSev);
    }
  }

  // Prepend severity to the FIRST SPECIFIC symptom (skip generic 'Pain')
  if (severityFound.length > 0 && symptoms.length > 0) {
    const primarySeverity = severityFound[0].charAt(0).toUpperCase() + severityFound[0].slice(1);
    // Find the first symptom that isn't just generic "Pain"
    const targetIdx = symptoms.findIndex(s => s !== 'Pain');
    if (targetIdx >= 0) {
      symptoms[targetIdx] = `${primarySeverity} ${symptoms[targetIdx].toLowerCase()}`;
    }
  }

  // Remove generic "Pain" if we already have specific pain symptoms
  const specificPains = symptoms.filter(s => s !== 'Pain' && s.toLowerCase().includes('pain'));
  if (specificPains.length > 0) {
    const painIdx = symptoms.indexOf('Pain');
    if (painIdx >= 0) symptoms.splice(painIdx, 1);
  }

  // Extract duration (English)
  const durationFound = [];
  for (const pattern of DURATION_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (!durationFound.includes(m.trim())) durationFound.push(m.trim());
      }
    }
  }
  // Hindi duration
  for (const [hindiKw, englishDur] of Object.entries(HINDI_DURATION_MAP)) {
    if (text.includes(hindiKw) && !durationFound.includes(englishDur)) {
      durationFound.push(englishDur);
    }
  }

  if (symptoms.length === 0) {
    symptoms.push('Unspecified symptoms reported');
  }

  const summary = `Patient reports ${symptoms.join(', ').toLowerCase()}.`;

  return {
    symptoms,
    duration_mentions: durationFound,
    summary,
  };
}

/**
 * Try to extract JSON from a response that may be wrapped in markdown code blocks
 */
function extractJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch {}
  const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()); } catch {} }
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) { try { return JSON.parse(braceMatch[0]); } catch {} }
  return null;
}

router.post('/summarize-consultation', async (req, res) => {
  const { transcription } = req.body;

  if (!transcription || !transcription.trim()) {
    return res.status(400).json({ error: 'Missing or empty transcription.' });
  }

  try {
    const gemini = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      timeout: 25000, // 25 second timeout
    });

    // Hard 20s timeout — give Gemini enough time for multilingual processing
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout (20s)')), 20000)
    );

    const completion = await Promise.race([
      gemini.chat.completions.create({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "user",
            content: `You are an expert medical triage assistant specializing in multilingual clinical transcripts.

The following is a transcription of a doctor-patient consultation. The patient may speak in ANY language (Hindi, English, Spanish, etc.).

Your task: Extract the patient's specific medical symptoms, any duration information, and provide a clinical summary. ALWAYS respond in English.

RULES:
1. Translate non-English speech ACCURATELY before extracting symptoms.
2. Extract SPECIFIC symptom names, NOT vague words:
   - "पेट में दर्द" → "Stomach pain" (NOT "Pain" or "Very pain")
   - "सिर में दर्द" → "Headache" (NOT "Head pain")
   - "सांस फूलना" → "Shortness of breath"
   - "छाती में दर्द" → "Chest pain"
   - "बुखार" → "Fever"
   - "my tummy hurts" → "Stomach pain"
   - "heart hurting" → "Chest pain"
3. Include severity qualifiers when mentioned (e.g., "Severe stomach pain", "Persistent headache").
4. Duration: Extract time references like "4 days", "since last week", "many days".
5. If the patient expresses fears/concerns (e.g., fear of cancer), note them as a separate symptom like "Patient expresses concern about cancer".
6. Return ONLY valid JSON, no markdown fences, no explanation text.

{
  "symptoms": ["Specific Symptom 1", "Specific Symptom 2"],
  "duration_mentions": ["Duration 1"],
  "summary": "Concise English clinical summary."
}

Transcription:
${transcription}`
          }
        ],
        temperature: 0.1,
      }),
      timeoutPromise,
    ]);

    const rawContent = completion.choices[0].message.content;
    console.log('Gemini raw response:', rawContent);

    const aiResponse = extractJSON(rawContent);

    if (!aiResponse) {
      console.error('Could not extract JSON from Gemini response:', rawContent);
      const fallback = extractSymptomsWithRegex(transcription);
      return res.json({ ...fallback, source: 'regex-fallback' });
    }

    const symptoms = Array.isArray(aiResponse.symptoms) ? aiResponse.symptoms : [];
    const duration = Array.isArray(aiResponse.duration_mentions) ? aiResponse.duration_mentions : [];
    const summary = typeof aiResponse.summary === 'string' ? aiResponse.summary : '';

    if (symptoms.length === 0) {
      console.warn('Gemini returned empty symptoms, using regex fallback');
      const fallback = extractSymptomsWithRegex(transcription);
      return res.json({
        symptoms: fallback.symptoms,
        duration_mentions: fallback.duration_mentions.length > 0 ? fallback.duration_mentions : duration,
        summary: fallback.summary || summary,
        source: 'regex-fallback',
      });
    }

    res.json({
      symptoms,
      duration_mentions: duration,
      summary,
      source: 'gemini-ai',
    });

  } catch (error) {
    console.error('Summarize-consultation FULL error:', error);

    const fallback = extractSymptomsWithRegex(transcription);
    res.json({ ...fallback, source: 'regex-fallback' });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/translate-to-english
// Translates any text to English using Gemini
// ═══════════════════════════════════════════════════════
router.post('/translate-to-english', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text.' });
  }

  // Quick check: if text is likely already English (all ASCII + common punctuation), skip API call
  const nonAsciiRatio = (text.replace(/[\x00-\x7F]/g, '').length) / text.length;
  if (nonAsciiRatio < 0.1) {
    return res.json({ translated: text.trim(), wasTranslated: false });
  }

  try {
    // Dynamic import is sometimes needed if it's an ESM module, but usually require works
    const translate = require('google-translate-api-x');
    
    const resTranslation = await translate(text.trim(), { to: 'en' });
    
    res.json({ 
      translated: resTranslation.text || text.trim(), 
      wasTranslated: true 
    });

  } catch (error) {
    console.error('Translation error:', error.message || error);
    // Fallback: return original text if API times out or fails
    res.json({ translated: text.trim(), wasTranslated: false });
  }
});

module.exports = router;
