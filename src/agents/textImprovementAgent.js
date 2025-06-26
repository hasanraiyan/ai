// src/agents/textImprovementAgent.js

import { AIAgent } from "../services/aiAgents";

export const improveDescription = async (apiKey, modelName, inputText) => {
    if (!apiKey || !modelName || !inputText) {
        throw new Error("Missing required parameters for description agent.");
    }

    const agent = new AIAgent(apiKey, modelName);

    const systemInstruction = `
You are a "Transaction Description Enhancer" AI. Your task is to take a short, vague, or code-mixed (e.g., Hinglish) transaction description and make it more specific and meaningful — without inventing facts.

You must support **English, Hindi, and Hinglish** input.

---

**GUIDELINES:**

1. **Understand the Intent**: Translate and interpret the meaning, whether in English, Hindi, or Hinglish.
2. **Enhance, Don't Hallucinate**: Add helpful context only if it's reasonable. Don't make things up.
3. **Be Concise**: Output should be short — ideally 3 to 7 words.
4. **If Too Vague**: If the input has no meaningful content, return it unchanged with \`"improve": false\`.
5. **Respond in PURE JSON.** No explanations.

---

**RESPONSE FORMAT:**

{
  "improve": boolean,
  "description": "string"
}

---

**EXAMPLES – ENGLISH:**

Input: "uber"
Output:
{
  "improve": true,
  "description": "Uber ride payment"
}

Input: "coffee"
Output:
{
  "improve": true,
  "description": "Morning coffee from Starbucks"
}

---

**EXAMPLES – HINDI / HINGLISH:**

Input: "mujhe papa ne bheja"
Output:
{
  "improve": true,
  "description": "Money sent by father"
}

Input: "didi ke liye shopping"
Output:
{
  "improve": true,
  "description": "Shopping for sister"
}
`;


    const finalPrompt = `User Input: "${inputText}"`;

    const result = await agent.runPrompt({
        prompt: finalPrompt,
        systemInstruction,
        expectJson: true,
    });

    console.log("Description improvement result:", result);

    if (result?.improve && typeof result.description === "string") {
        return {
            success: true,
            description: result.description,
        };
    }

    return {
        success: false,
        reason: result?.reason || "Failed to improve description.",
    };
};


export const improvePrompt = async (apikey, modelName, inputText) => {
    if (!apikey || !modelName || !inputText) {
        throw new Error("Missing required parameters.");
    }

    const agent = new AIAgent(apikey, modelName);

    const systemInstruction = `
You are an AI prompt enhancer that takes a single raw image prompt and upgrades it to a more visually rich, highly descriptive version suitable for advanced image generation. Follow these strict rules:

---

**BEHAVIOR**
1. Analyze the input for **visual intent**. If not visual, respond with \`{"improve": false, "reason": "no image intent"}\`.
2. If valid, enhance by adding: vivid adjectives, specific nouns, camera angle, lighting, mood, or context.
3. Output must be visually expressive and imaginative.

---

**EXAMPLES**

Input: "a car on a highway"  
Output: {
  "improve": true,
  "prompt": "a sleek red sports car speeding along a wet mountain highway at dusk, dramatic lighting, cinematic shot"
}

Input: "how to debug javascript"  
Output: {
  "improve": false,
  "reason": "no image intent"
}

---

**OUTPUT FORMAT (JSON ONLY)**
If valid: \`{"improve": true, "prompt": "enhanced prompt"}\`
If invalid: \`{"improve": false, "reason": "reason"}\`
`;

    const finalPrompt = `Input: "${inputText}"`;

    const result = await agent.runPrompt({
        prompt: finalPrompt,
        systemInstruction,
        expectJson: true,
    });

    console.log("Improved prompt result:", result);

    if (!result?.improve || typeof result.prompt !== "string") {
        return {
            success: false,
            reason: result?.reason || "Unknown failure during prompt improvement"
        };
    }

    return {
        success: true,
        prompt: result.prompt
    };
};