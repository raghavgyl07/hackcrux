const { spawn } = require('child_process');
const path = require('path');
const OpenAI = require('openai');

const runNlpScript = (text, age) => {
  return new Promise((resolve, reject) => {
    // Determine path to python script relative to backend root
    const scriptPath = path.resolve(__dirname, '../../nlp/process_symptoms.py');
    const pythonExecutable = path.resolve(__dirname, '../../nlp/venv/Scripts/python.exe'); // Path to venv python in Windows

    const payload = JSON.stringify({ text, age });

    // Use pythonExecutable if exists in venv, fallback to global python if running manually outside
    const pythonProcess = spawn(pythonExecutable, [scriptPath, payload]);

    let dataOut = '';
    let errOut = '';

    pythonProcess.stdout.on('data', (chunk) => {
      dataOut += chunk.toString();
    });

    pythonProcess.stderr.on('data', (chunk) => {
      errOut += chunk.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python script exited with code ${code}: ${errOut}`));
      }
      try {
        const result = JSON.parse(dataOut);
        if (result.error) return reject(new Error(result.error));
        resolve(result);
      } catch (e) {
        reject(new Error(`Failed to parse python output: ${dataOut}`));
      }
    });
  });
};

const generateAiSummary = async (symptoms) => {
  if (process.env.XAI_API_KEY) {
    try {
      // Use Grok API (xAI) - OpenAI SDK compatible
      const grok = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });

      const completion = await grok.chat.completions.create({
        model: "grok-3-mini",
        messages: [
          {
            role: "system",
            content: "You are a medical AI assistant. Given the patient's reported symptoms, generate a brief clinical summary (2-3 sentences max) describing their condition and urgency level. Be professional and concise."
          },
          {
            role: "user",
            content: `Patient symptoms: ${symptoms}`
          }
        ],
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error("Grok AI summary error:", error.message);
      // Fallback to basic summary if API call fails
      return `AI Generated Summary: The patient presents with ${symptoms.substring(0, 50)}... and requires clinical review based on the severity profile calculated.`;
    }
  }
  
  // No key provided fallback
  return `AI Generated Summary: The patient presents with ${symptoms.substring(0, 50)}... and requires clinical review based on the severity profile calculated.`;
};

module.exports = {
  runNlpScript,
  generateAiSummary
};

