import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMConfig } from '../types';
import { LLM_PROVIDERS } from '../constants';

const getBaseUrl = (provider: string): string => {
  const def = LLM_PROVIDERS.find(p => p.id === provider);
  if (!def) throw new Error(`Unknown LLM provider: ${provider}`);
  return def.baseUrl;
};

export const callLLMText = async (config: LLMConfig, prompt: string): Promise<string> => {
  if (!config.apiKey) throw new Error('未配置 API Key，请在设置中配置 LLM');

  if (config.provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  const baseUrl = getBaseUrl(config.provider);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM 请求失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
};

export const callLLMVision = async (
  config: LLMConfig,
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> => {
  if (!config.apiKey) throw new Error('未配置 API Key，请在设置中配置 LLM');

  if (config.provider === 'gemini') {
    const genAI = new GoogleGenerativeAI(config.apiKey);
    const model = genAI.getGenerativeModel({ model: config.model });
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { mimeType, data: imageBase64 } },
    ]);
    return result.response.text();
  }

  const baseUrl = getBaseUrl(config.provider);
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LLM 请求失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
};
