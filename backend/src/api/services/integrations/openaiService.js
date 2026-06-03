function buildMockText(prompt) {
  const summary = String(prompt || '').slice(0, 120);
  return `Mock OpenAI response: ${summary || 'No prompt provided.'}`;
}

async function* mockStream(prompt) {
  const text = buildMockText(prompt);
  for (const chunk of text.match(/.{1,80}(\s|$)/g) || [text]) {
    yield chunk;
  }
}

export async function generateText({ messages = [], model = process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature = 0.5 } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return { mode: 'mock', provider: 'openai', model, temperature, content: buildMockText(messages.map((message) => message.content).join(' ')) };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, temperature, messages })
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return {
    mode: 'live',
    provider: 'openai',
    model,
    temperature,
    content: payload.choices?.[0]?.message?.content || ''
  };
}

export async function streamText({ messages = [], model = process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature = 0.5 } = {}) {
  if (!process.env.OPENAI_API_KEY) {
    return { mode: 'mock', provider: 'openai', model, temperature, stream: mockStream(messages.map((message) => message.content).join(' ')) };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model, temperature, stream: true, messages })
  });

  if (!response.ok || !response.body) {
    throw new Error(`OpenAI streaming request failed with status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  async function* liveStream() {
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;

        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      }
    }
  }

  return { mode: 'live', provider: 'openai', model, temperature, stream: liveStream() };
}

export async function generateJson({ messages = [], model = process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature = 0.4 } = {}) {
  const result = await generateText({ messages, model, temperature });

  if (result.mode === 'mock') {
    return { ...result, content: '{}' };
  }

  return result;
}
