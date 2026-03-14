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
    // Use Grok API (xAI) - OpenAI SDK compatible
    const grok = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: 'https://api.x.ai/v1',
    });

    // Use Grok to summarize the transcript into clinical points
    const completion = await grok.chat.completions.create({
      model: "grok-3-mini",
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
    console.error("Grok AI processing error:", error);
    // Fallback: return the raw transcript as the summary
    res.json({
      summary: transcript,
      points: [{ topic: "Transcribed Speech", details: transcript }]
    });
  }
});

// ═══════════════════════════════════════════════════════
// POST /api/ai/assign-priority
// Grok AI-powered triage priority assignment
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
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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

module.exports = router;
