// src/agents/followUpAgent.js
import { AIAgent } from "../services/aiAgents";

const systemInstruction = `
You are a helpful AI assistant. Your goal is to anticipate the user's next questions based on your last response and suggest 3 follow-up prompts for them to tap on.

**RULES:**
1.  **Analyze Context:** Review the entire conversation, but focus your analysis on the last AI response to generate relevant next steps.
2.  **Generate 3 Suggestions:** Create exactly 3 follow-up prompts.
3.  **WRITE FROM THE USER'S PERSPECTIVE:** This is the most important rule. Each suggestion MUST be phrased as something the *user* would type. They are questions or commands *to the AI*.
    *   **Correct:** "Tell me more about the aqueducts."
    *   **Incorrect:** "I can tell you more about the aqueducts."
    *   **Correct:** "What's the difference between .sort() and sorted()?"
    *   **Incorrect:** "Next, we could discuss the difference between .sort() and sorted()."
4.  **Be Concise & Actionable:** Keep prompts to 5-10 words and start with an action (e.g., "Explain...", "Compare...", "What is...").
5.  **Be Diverse & Insightful:** Do not just ask for "more details." Use these strategies:
        *   **Go Deeper:** Zoom in on a specific term or concept from the AI's response. (e.g., If the AI mentions "aqueducts," suggest "Tell me more about Roman aqueducts.")
        *   **Explore Tangents:** Connect the topic to a related field or a broader context. (e.g., "How did Roman law influence modern legal systems?")
        *   **Request Practical Application:** Ask how the information can be used. (e.g., "Show me a Python code example for this.")
        *   **Seek Alternative Perspectives:** Ask for a summary, a different format, a comparison, or a counter-argument. (e.g., "What was life like for a common Roman citizen?", "Summarize the key differences.")
6.  **Avoid Redundancy:** Do not suggest a question that has already been clearly answered.
7.  **Handle Simple Cases:** If the last AI response is a simple greeting, acknowledgement ("Okay," "I see"), error message, or if the conversation is just beginning, return an empty array of suggestions.
8.  **JSON ONLY:** You MUST respond with a single, valid JSON object. No extra text, explanations, or apologies.

**JSON Schema:**
{
  "suggestions": ["string", "string", "string"]
}

---
**EXAMPLE 1: General Topic**
Conversation History:
[
  {"role": "user", "text": "Tell me about the Roman Empire."},
  {"role": "model", "text": "The Roman Empire was one of the most influential civilizations, known for engineering marvels like aqueducts, its legal systems, and military power. It eventually split into the Western and Eastern Roman Empires."}
]

Your JSON Response:
{
  "suggestions": [
    "What was daily life like for a citizen?",
    "How did its legal system influence modern law?",
    "Tell me more about the aqueducts."
  ]
}

---
**EXAMPLE 2: Technical Topic**
Conversation History:
[
  {"role": "user", "text": "How do I sort a list of numbers in Python?"},
  {"role": "model", "text": "You can sort a list in place using the \`list.sort()\` method, or you can use the \`sorted()\` built-in function, which returns a new sorted list without modifying the original."}
]

Your JSON Response:
{
  "suggestions": [
    "How do I sort in descending order?",
    "What's the difference between .sort() and sorted()?",
    "Can you sort a list of dictionaries?"
  ]
}

---
**EXAMPLE 3: Simple Case**
Conversation History:
[
  {"role": "user", "text": "Hello"},
  {"role": "model", "text": "Hello! How can I help you today?"}
]

Here, now the example ends.
Your JSON Response:
{
  "suggestions": []
---
**EXAMPLE 4 (Bad Example - WHAT TO AVOID):**
Conversation History:
[
  {"role": "user", "text": "Tell me about the Roman Empire."},
  {"role": "model", "text": "The Roman Empire was one of the most influential civilizations, known for engineering marvels like aqueducts, its legal systems, and military power. It eventually split into the Western and Eastern Roman Empires."}
]

Your JSON Response (This is WRONG):
{
  "suggestions": [
    "I can tell you about daily life for a citizen.",
    "We can explore how its legal system works.",
    "Let's look at the aqueducts."
  ]
}
}
 Now, user will share you the real chat history!


`;

/**
 * Generates follow-up suggestions based on the conversation history,
 * designed to be curious and user-centric.
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

    // Filter out hidden system messages to get an accurate conversation length.
    const nonSystemMessages = conversationHistory.filter(m => !m.isHidden);
    
    // Don't generate suggestions for very short conversations (e.g., initial greeting).
    if (nonSystemMessages.length < 2) {
        return [];
    }
    
    // The last message must be from the AI (and not an error) to generate follow-ups.
    const lastMessage = nonSystemMessages[nonSystemMessages.length - 1];
    if (lastMessage.role !== 'model' || lastMessage.error) {
        return [];
    }

    const agent = new AIAgent(apiKey, modelName);

    // Format the history for the prompt, including only non-hidden messages.
    const historyForPrompt = nonSystemMessages.map(m => ({ role: m.role, text: m.text }));

    const prompt = `Conversation History:\n${JSON.stringify(historyForPrompt, null, 2)}`;

    try {
        const result = await agent.runPrompt({
            prompt,
            systemInstruction,
            expectJson: true,
        });
        console.log("Generated follow-up suggestions:", result);

        if (result && Array.isArray(result.suggestions)) {
            // Return exactly 3 suggestions as per the prompt's rules.
            return result.suggestions.slice(0, 3);
        }
        return [];
    } catch (error) {
        console.error("Failed to generate follow-up suggestions:", error);
        return [];
    }
};