import { AIAgent } from "../services/aiAgents";
import { brainLogger } from "../utils/logging";
import { LogCategory } from "../utils/logging";

export const generateChatTitle = async (apiKey, modelName, firstUserText) => {
    if (!apiKey || !firstUserText) return null;

    const agent = new AIAgent(apiKey, modelName);
    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Model used is", { modelName });
    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Generating chat title with firstUserText", { firstUserText });

    const fewShotExamples = [
        { input: "Can you help me write a resume for a product design job?", output: "🎨 Design Resume Help" },
        { input: "What's the fastest way to learn JavaScript for a beginner?", output: "⚡ JS Fast-Track Guide" },
        { input: "Let's brainstorm startup ideas using AI", output: "🤖 Axion Startup Ideas" },
        { input: "How do I prepare for a tech interview at Google?", output: "💼 Crack Google Interview" },
        { input: "Tell me a bedtime story", output: "🌙 Bedtime Storytime" },
    ];

    const fewShotPrompt = fewShotExamples.map(
        (ex, i) => `Example ${i + 1}:\nUser: ${ex.input}\nAI: {"title": "${ex.output}"}\n`
    ).join('\n');

    const userPrompt = `Now generate a title for this:\nUser: ${firstUserText}\nAI:`;

    const finalPrompt = `${fewShotPrompt}\n${userPrompt}`;

    const systemInstruction = `You are a creative assistant that writes short, catchy conversation titles with emojis. 
Respond ONLY in valid JSON: {"title": "Your Title Here"}.
Rules:
- Max 30 characters
- Must include at least one emoji
- Keep it punchy and relevant
- No explanations, no text outside JSON`;

    const result = await agent.runPrompt({
        prompt: finalPrompt,
        systemInstruction,
        expectJson: true,
    });

    if (__DEV__) brainLogger.debug(LogCategory.BRAIN, "Chat title generation result", result);

    if (result?.title && typeof result.title === "string") {
        return result.title.trim().slice(0, 30);
    }

    return null;
};