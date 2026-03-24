import { GoogleGenAI } from '@google/genai';

// Initialize the client. It automatically picks up the GEMINI_API_KEY from your environment variables.
const ai = new GoogleGenAI({});

async function generateCode() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fast and excellent for coding tasks
      contents: 'Write a secure JavaScript function to tally student votes for an organization election.',
    });

    console.log(response.text);
  } catch (error) {
    console.error("Error connecting to Gemini:", error);
  }
}

generateCode();