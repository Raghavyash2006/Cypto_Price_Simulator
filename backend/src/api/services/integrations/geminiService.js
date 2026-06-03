import { getEnv } from '../../../config/env.js';
import { sanitizeText } from '../../../utils/inputSanitizer.js';

function mockGeminiReply(prompt) {
  const summary = String(prompt || '').slice(0, 120);
  return `Mock Gemini response: ${summary || 'No prompt provided.'}`;
}

function getGeminiClient() {
  const { geminiApiKey } = getEnv();
  if (!geminiApiKey) {
    return null;
  }

  return geminiApiKey;
}

function normalizeModelName(value, fallback = getEnv().geminiModel || 'gemini-2.5-flash') {
  const model = sanitizeText(value || fallback, { maxLength: 80 });
  return /^[a-z0-9._-]+$/i.test(model) ? model : fallback;
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history.slice(-8).map((message) => ({
    role: ['user', 'assistant', 'system'].includes(String(message?.role)) ? String(message.role) : 'user',
    parts: [{ text: sanitizeText(message?.parts?.[0]?.text || message?.text || '', { maxLength: 1000, allowNewlines: true }) }]
  }));
}

function extractText(response) {
  if (!response) return '';

  if (typeof response.text === 'function') {
    return response.text();
  }

  return response.candidates?.[0]?.content?.parts?.map((part) => part.text).join('') || '';
}

export async function generateGeminiText({
  prompt = '',
  systemInstruction = '',
  history = [],
  model = getEnv().geminiModel || 'gemini-2.5-flash',
  temperature = 0.45,
  maxOutputTokens = 1024
} = {}) {
  const apiKey = getGeminiClient();
  const normalizedModel = normalizeModelName(model);
  const normalizedPrompt = sanitizeText(prompt, { maxLength: 8000, allowNewlines: true });
  const normalizedSystemInstruction = sanitizeText(systemInstruction, { maxLength: 2000, allowNewlines: true });
  const normalizedHistory = normalizeHistory(history);

  if (!apiKey) {
    return { mode: 'mock', provider: 'gemini', model: normalizedModel, content: mockGeminiReply(normalizedPrompt) };
  }

  const modelCandidates = [...new Set(['gemini-2.5-flash', normalizedModel, 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-2.5-flash-lite'])];
  let lastError = null;

  const combinedPrompt = [normalizedSystemInstruction, normalizedPrompt].filter(Boolean).join('\n\n');

  for (const candidate of modelCandidates) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            ...normalizedHistory,
            {
              role: 'user',
              parts: [{ text: combinedPrompt }]
            }
          ],
          generationConfig: {
            temperature,
            maxOutputTokens
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini request failed with status ${response.status}: ${errorText}`);
      }

      const payload = await response.json();
      return {
        mode: 'live',
        provider: 'gemini',
        model: candidate,
        content: extractText(payload)
      };
    } catch (error) {
      lastError = error;
      const message = String(error?.message || '');
      if (!/not found|404|unsupported|model/i.test(message)) {
        throw error;
      }
    }
  }

  if (lastError) {
    throw lastError;
  }

  return { mode: 'mock', provider: 'gemini', model: normalizedModel, content: mockGeminiReply(normalizedPrompt) };
}
