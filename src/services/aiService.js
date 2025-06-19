import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';
import { toolDispatcher } from './tools'; // toolDispatcher already exists
import  {extractJson}  from '../utils/extractJson'; // Assuming you have a utility to extract JSON from text

export const sendMessageToAI = async (apiKey, modelName, historyMessages, newMessageText, isAgentMode, onToolCall) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  // The chat history needs to potentially include the system prompt,
  // but exclude the agent-thinking messages and tool-results for the AI's perspective
  const chatHistory = historyMessages
    .filter(m => !m.error && m.role !== 'tool-result' && m.role !== 'agent-thinking')
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(newMessageText);
  let responseText = await result.response.text();

  if (isAgentMode) {
    const toolCall = extractJson(responseText);
    if (toolCall && toolCall['tools-required']) {
      // It's a tool call, execute it

      // Callback to display agent's intended action in the UI
      if (onToolCall) {
        onToolCall(toolCall);
      }

      // Execute the tool call(s)
      const toolResults = await toolDispatcher(toolCall);

      // Format the results back to the AI
      const toolResultText = `Context from tool calls:\n${JSON.stringify(toolResults, null, 2)}`;

      // Send the tool result back to the AI for a final response
      const finalResult = await chat.sendMessage(toolResultText);
      responseText = await finalResult.response.text();
    }
  }

  return responseText;
};

// --- NEW HELPER FUNCTION FOR IMAGE TOOL ---
export const callImageTool = async (apiKey, prompt, url=true) => {
    if (!apiKey) {
        throw new Error("API Key Missing. Please set your API Key in Settings.");
    }

    // Construct the specific tool call payload for image_generator
    // Note: This bypasses the agent model's reasoning and directly invokes the tool dispatcher.
    // This is suitable for a dedicated "Generate Image" screen.
    const toolCallPayload = {
        "tools-required": true, // Indicate tools are required
        "image_generator": { // Specify the tool
            "prompt": prompt,
            "url": true 
        }
    };

    console.log("Attempting to dispatch image_generator tool:", toolCallPayload);

    // Directly call the tool dispatcher
    const toolResults = await toolDispatcher(toolCallPayload);

    // Return the specific result from the image_generator tool
    // toolResults will be an object like { image_generator: { image_generated: ..., message: ... } }
    return toolResults?.image_generator;
};
// --- END NEW HELPER FUNCTION ---

