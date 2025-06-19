// src/agents/aiImageAgent.js

import { AIAgent } from "../services/aiAgents";
// Import the actual tool implementation, not the dispatcher
import { toolImplementations } from "../services/tools";

export const generateImage = async (apikey, modelName, inputText, n = 1) => {
    if (!apikey || !modelName || !inputText) {
        throw new Error("Missing required parameters.");
    }

    const agent = new AIAgent(apikey, modelName);
    console.log("Agent created with model ", modelName);
    const systemInstruction = `
You are an AI prompt generation engine that takes user input and produces 'n' highly descriptive, image-ready prompts. Follow these rules exactly:

---

**1. INPUT FORMAT:**
You will receive:
- A raw text input (string) from the user.
- A number 'n' (integer) specifying how many image prompt descriptions to generate.

Example:
Input: "dragon in a forest", n: 3

---

**2. BEHAVIOR SPECIFICATION:**

Step A — Valid Visual Prompt Detected:
- Generate exactly 'n' high-quality image prompts using:
  - vivid **adjectives**
  - specific **nouns**
  - **style** (e.g. "digital painting", "realistic render", "cinematic frame", "oil on canvas")
  - **camera angle** or **scene composition**
  - optional **lighting**, **mood**, and **background details**
- Be imaginative and visually expressive.

---

**3. FEW-SHOT EXAMPLES:**

Input: "a robot in the desert", n: 3  
Output:
{
  "generate": true,
  "prompts": [
    "a lone humanoid robot walking through a vast, sun-scorched desert, heat waves rising, cinematic shot",
    "a rusty robot with glowing eyes buried in desert sand, wide angle, digital painting style",
    "a futuristic mech patrolling an arid wasteland at dusk, orange sky, dramatic lighting, concept art"
  ]
}



Input: "how do I fix a 404 error?", n: 3  
Output:
{
  "generate": false,
  "reason": "no image intent"
}

---

**4. OUTPUT FORMAT (ALWAYS JSON):**

If valid:
{
  "generate": true,
  "prompts": [ "prompt1", "prompt2", ..., up to n ]
}

If invalid:
{
  "generate": false,
  "reason": "unsafe content" | "no image intent"
}

Only respond with JSON. No extra commentary or text.
`;

    const finalPrompt = `Input: "${inputText}", n: ${n}`;

    const result = await agent.runPrompt({
        prompt: finalPrompt,
        systemInstruction,
        expectJson: true,
    });

    console.log("Prompt generation result:", result);

    if (!result?.generate || !Array.isArray(result.prompts)) {
        return {
            success: false,
            reason: result?.reason || "Unknown failure during prompt generation"
        };
    }
    
    const promptArray = result.prompts;

    const imageResults = await Promise.all(
        promptArray.map(async (prompt) => {
            try {
                // Call the tool directly
                return await toolImplementations.image_generator({ prompt });
            } catch (e) {
                console.error("Image generation failed for prompt:", prompt, e);
                return null;
            }
        })
    );

    const imageUrls = imageResults
        .filter(res => res?.image_generated && res?.imageUrl)
        .map(res => res.imageUrl);

    console.log("Generated image URLs:", imageUrls);

    return {
        success: true,
        prompts: promptArray,
        imageUrls
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

**INPUT FORMAT**
- A single string prompt (e.g. "a cat on a roof")

---

**BEHAVIOR**
1. Analyze the input for **visual intent**.
   - If the prompt is not related to a visual scene or has no meaningful visual elements:
     → Return:
     {
       "improve": false,
       "reason": "no image intent"
     }

2. If valid, enhance the prompt by adding:
   - vivid **adjectives**
   - specific **nouns**
   - a **visual style** (e.g. "cyberpunk", "realistic render", "watercolor", etc.)
   - optional **camera angle**, **lighting**, **mood**, or **environmental context**

3. Output should be visually expressive, imaginative, and ready for AI image generation.

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

**OUTPUT FORMAT**
If valid:
{
  "improve": true,
  "prompt": "enhanced visual prompt"
}

If invalid:
{
  "improve": false,
  "reason": "no image intent"
}

Only respond with JSON. No extra commentary.
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