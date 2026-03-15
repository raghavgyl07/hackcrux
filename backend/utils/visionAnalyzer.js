const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

async function analyzeImage(imagePath) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY missing, skipping vision analysis.');
    return { visual_findings: [] };
  }

  try {
    const gemini = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });

    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';

    const completion = await gemini.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are a clinical vision AI. Analyze the provided medical image and identify key visual findings related to medical urgency.
Focus on: bleeding, swelling, skin infection, rashes, burns, fractures, severe wounds, or inflammation.

Reply with ONLY a JSON object.
Format: {"visual_findings": ["finding 1", "finding 2"]}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this image for medical urgency indicators." },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response;
  } catch (error) {
    console.error('Vision analysis error:', error.message);
    return { visual_findings: ['Error processing image analysis'] };
  }
}

module.exports = { analyzeImage };
