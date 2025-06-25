// src/agents/descriptionAgent.js

import { AIAgent } from "../services/aiAgents";

export const improveDescription = async (apiKey, modelName, inputText) => {
    console.log(apiKey)
    console.log(modelName)
    console.log(inputText)
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

Input: "rent"
Output:
{
  "improve": true,
  "description": "Monthly apartment rent"
}

Input: "stuff"
Output:
{
  "improve": false,
  "description": "stuff"
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

Input: "ola ka paisa"
Output:
{
  "improve": true,
  "description": "Payment for Ola ride"
}

Input: "bhai ka gift"
Output:
{
  "improve": true,
  "description": "Gift for brother"
}

Input: "khana ghar se"
Output:
{
  "improve": true,
  "description": "Home-cooked food"
}

Input: "faltu"
Output:
{
  "improve": false,
  "description": "faltu"
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