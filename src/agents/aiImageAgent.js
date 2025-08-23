// src/agents/aiImageAgent.js

import { AIAgent } from "../services/aiAgents";
// Import the actual tool implementation, not the dispatcher
import { toolImplementations } from "../services/tools";
import { brainLogger } from "../utils/logging";
import { LogCategory } from "../utils/logging";

// Updated function signature to accept metadataPayload
export const generateImage = async (apikey, modelName, inputText, n = 1, metadataPayload = {}) => {
    if (!apikey || !modelName || !inputText) {
        throw new Error("Missing required parameters.");
    }

    const agent = new AIAgent(apikey, modelName);
    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Agent created with model", { modelName });
    const systemInstruction = `
You are an Axion prompt generation engine that takes user input and produces 'n' highly descriptive, image-ready prompts. Follow these rules exactly:

---

**1. INPUT FORMAT:**
You will receive:
- A raw text input (string) from the user.
- A number 'n' (integer) specifying how many image prompt descriptions to generate.

Example:
Input: "dragon in a forest", n: 3

---

**2. BEHAVIOR SPECIFICATION:**

Step A â€” Valid Visual Prompt Detected:
- Generate exactly 'n' high-quality image prompts using:
  - vivid **adjectives**
  - specific **nouns**
  - **style** description 
  - **camera angle** or **scene composition**
  - **lighting**, **mood**, and **background details**
- Be imaginative and visually expressive.
Note: Same style for each prompt, but vary the details to create unique images.
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

**4. OUTPUT FORMAT (ALWAYS JSON):**

If valid:
{
  "generate": true,
  "prompts": [ "prompt1", "prompt2", ..., up to n ]
}

If invalid:
{
  "generate": false,
  "reason": "add reason why prompts could not be generated in 5 to 7 words" 
}

Only respond with JSON. No extra commentary or text.
`;

    const finalPrompt = `Input: "${inputText}", n: ${n}`;

    const result = await agent.runPrompt({
        prompt: finalPrompt,
        systemInstruction,
        expectJson: true,
    });

    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Prompt generation result", result);

    if (!result?.generate || !Array.isArray(result.prompts)) {
        return {
            success: false,
            reason: result?.reason || "Unknown failure during prompt generation"
        };
    }
    
    const promptArray = result.prompts;

    const imageResults = await Promise.all(
        promptArray.map(async (p) => {
            try {
                // Pass the generated prompt AND the metadata payload to the tool.
                return await toolImplementations.image_generator({ 
                    prompt: p, 
                    metadata: metadataPayload 
                });
            } catch (e) {
                brainLogger.error(LogCategory.BRAIN, "Image generation failed for prompt", {
                    prompt: p,
                    error: e.message
                });
                return null;
            }
        })
    );

    const imageUrls = imageResults
        .filter(res => res?.success && res?.data?.imageUrl) // <-- FIXED
        .map(res => res.data.imageUrl); // <-- FIXED

    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Generated image URLs", { imageUrls });

    return {
        success: true,
        prompts: promptArray,
        imageUrls
    };
};