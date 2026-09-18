import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
  // Utilizando o modelo Gemini 2.5 Flash conforme solicitado para estabilidade
  model: googleAI.model(process.env.GEMINI_MODEL as any || 'gemini-3.6-flash'),
});
