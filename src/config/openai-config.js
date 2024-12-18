import { getModelById } from './ai-models';

const getRandomTemperature = () => {
  return 0.5 + Math.random() * 0.5; // Random between 0.5 and 1
};

const getRandomSeed = () => {
  return Math.floor(Math.random() * 1000000); // Random integer between 0 and 999999
};

export const OPENAI_CONFIG = {
  baseURL: import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  getModelConfig: (modelId) => {
    const model = getModelById(modelId);
    return {
      model: model.name,
      temperature: getRandomTemperature(),
      max_tokens: 8192,
      presence_penalty: 0,
      frequency_penalty: 0,
      seed: getRandomSeed(),
      systemMessage: `You are ${model.displayName}, ${model.description}. Focus on: ${model.features.join(', ')}`
    };
  }
};

export const createOpenAIClient = () => {
  if (!OPENAI_CONFIG.apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  const generateChatCompletion = async (messages, modelId, options = {}) => {
    const modelConfig = OPENAI_CONFIG.getModelConfig(modelId);
    
    try {
      const response = await fetch(`${OPENAI_CONFIG.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_CONFIG.apiKey}`
        },
        body: JSON.stringify({
          model: modelConfig.model,
          messages: [
            {
              role: 'system',
              content: options.systemMessage || modelConfig.systemMessage
            },
            ...messages.map(msg => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content
            }))
          ],
          temperature: options.temperature || modelConfig.temperature,
          max_tokens: options.max_tokens || modelConfig.max_tokens,
          presence_penalty: modelConfig.presence_penalty,
          frequency_penalty: modelConfig.frequency_penalty,
          seed: modelConfig.seed
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  };

  return {
    async generateResponse(messages, modelId) {
      return generateChatCompletion(messages, modelId);
    },

    async generateTitle(message, modelId) {
      const response = await generateChatCompletion(
        [{ type: 'user', content: message }],
        modelId,
        {
          systemMessage: "Generate a concise 3-4 word title that captures the essence of this message. Respond with ONLY the title, no quotes or extra text.",
          temperature: 0.5, // Keep title generation more deterministic
          max_tokens: 10
        }
      );
      return response.trim();
    }
  };
};
