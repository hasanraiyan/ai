// src/agents/followUpAgent.js
import { AIAgent } from "../services/aiAgents";

const systemInstruction = `
You are an expert at analyzing conversations and predicting user intent. Your task is to generate 3 relevant, concise, and engaging follow-up prompts based on the last AI response in a conversation.

**RULES:**
1.  **Analyze Context:** Review the entire conversation history, but focus primarily on the last AI response.
2.  **Generate Suggestions:** Create exactly 3 follow-up prompts that a user might naturally ask next.
    *   They should be short (5-10 words).
    *   They should be phrased as questions or commands.
    *   They should logically continue the current topic or explore a related tangent.
3.  **Avoid Redundancy:** Do not suggest something that has already been clearly answered.
4.  **Handle Simple Cases:** If the last AI response is a simple greeting, acknowledgement ("Okay," "Understood"), or error message, do not generate suggestions. In this case, return an empty array.
5.  **JSON ONLY:** You MUST respond with a single, valid JSON object. No extra text, explanations, or apologies.

**JSON Schema:**
{
  "suggestions": ["string", "string", "string"]
}

**EXAMPLE 1:**
Conversation History:
[
  {"role": "user", "text": "Tell me about the Roman Empire."},
  {"role": "model", "text": "The Roman Empire was one of the most influential civilizations in history, lasting over a thousand years. It is known for its engineering marvels like aqueducts, its legal systems, and its vast military power. It eventually split into the Western and Eastern Roman Empires."}
]

Your JSON Response:
{
  "suggestions": [
    "What were its biggest engineering marvels?",
    "Tell me more about its legal system.",
    "Why did the empire fall?"
  ]
}

**EXAMPLE 2 (Simple Case):**
Conversation History:
[
  {"role": "user", "text": "Hello"},
  {"role": "model", "text": "Hello! How can I help you today?"}
]

Your JSON Response:
{
  "suggestions": []
}
`;

/**
 * Generates follow-up suggestions based on the conversation history.
 * @param {string} apiKey - The Google AI API key.
 * @param {string} modelName - The AI model to use for generation.
 * @param {Array<object>} conversationHistory - The chat history.
 * @returns {Promise<string[]>} A promise that resolves to an array of suggestion strings.
 */
export const generateFollowUpSuggestions = async (apiKey, modelName, conversationHistory) => {
    console.log("===============================================================================")
    console.log("Generating follow-up suggestions with API key:", apiKey, "and model:", modelName);
    console.log("===============================================================================");
    if (!apiKey || !modelName || !conversationHistory || conversationHistory.length === 0) {
        return [];
    }

    // Don't generate suggestions for very short conversations.
    const nonSystemMessages = conversationHistory.filter(m => !m.isHidden);
    if (nonSystemMessages.length < 2) {
        return [];
    }
    
    // The last message should be from the AI to generate follow-ups.
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    if (lastMessage.role !== 'model' || lastMessage.error) {
        return [];
    }

    const agent = new AIAgent(apiKey, modelName);

    // Format the history for the prompt
    const historyForPrompt = conversationHistory
        .filter(m => !m.isHidden)
        .map(m => ({ role: m.role, text: m.text }));

    const prompt = `Conversation History:\n${JSON.stringify(historyForPrompt, null, 2)}`;

    try {
        const result = await agent.runPrompt({
            prompt,
            systemInstruction,
            expectJson: true,
        });
        console.log("Generated follow-up suggestions:", result);

        if (result && Array.isArray(result.suggestions)) {
            return result.suggestions.slice(0, 4); // Return max 4 suggestions
        }
        return [];
    } catch (error) {
        console.error("Failed to generate follow-up suggestions:", error);
        return [];
    }
};