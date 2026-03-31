import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const PROVIDER_CONFIG = {
  anthropic: {
    validate(key) {
      if (!key || !key.startsWith('sk-ant-')) {
        return 'APIキーが無効です。sk-ant- で始まるAnthropicのAPIキーを入力してください。';
      }
      return null;
    },
    async call(apiKey, prompt) {
      const client = new Anthropic({ apiKey });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content?.[0]?.text || '';
    },
    extractError(err) {
      return err?.error?.error?.message || err?.message || 'Anthropic APIエラーが発生しました';
    },
  },

  openai: {
    validate(key) {
      if (!key || !key.startsWith('sk-') || key.startsWith('sk-ant-')) {
        return 'APIキーが無効です。sk- で始まるOpenAIのAPIキーを入力してください。';
      }
      return null;
    },
    async call(apiKey, prompt) {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices?.[0]?.message?.content || '';
    },
    extractError(err) {
      return err?.message || 'OpenAI APIエラーが発生しました';
    },
  },

  gemini: {
    validate(key) {
      if (!key || !key.startsWith('AIza')) {
        return 'APIキーが無効です。AIza で始まるGoogle AI StudioのAPIキーを入力してください。';
      }
      return null;
    },
    async call(apiKey, prompt) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
      const result = await model.generateContent(prompt);
      return result.response.text() || '';
    },
    extractError(err) {
      return err?.message || 'Google Gemini APIエラーが発生しました';
    },
  },
};
