import { GoogleGenerativeAI } from '@google/generative-ai';
import { safetySettings } from '../constants/safetySettings';

export const generateChatTitle = async (apiKey, modelName, firstUserText) => {
  if (!apiKey) return null;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const prompt = `Generate a short chat title summarizing: "${firstUserText}". Respond only in JSON with a "title" field.`;
    // Using a lightweight model for title generation
    const model = genAI.getGenerativeModel({ model:modelName , safetySettings });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const match = responseText.match(/\{[^]*\}/);
    if (match) {
      const obj = JSON.parse(match[0]);
      if (obj.title) {
        return obj.title.trim().slice(0, 30);
      }
    }
  } catch (error) {
    console.error("Error generating title:", error);
    // Silently fail or handle error as needed
  }
  return null;
};

export const shouldPerformSearch = async (apiKey, modelName, query) => {
  if (!apiKey) return { web_search: false, query: '' };
  console.log("Performing search triage for query:", query);
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // This is the improved, more stringent prompt for the triage model.
    const prompt = `You are a highly efficient decision-making agent. Your primary goal is to determine if a user's query can be answered sufficiently with your existing knowledge, which has a cutoff in early 2023. You must decide whether to use an external web search tool. Your default behavior is to AVOID using the tool unless it's absolutely necessary.

    CRITERIA FOR WEB SEARCH (web_search: true):
    - The query asks for information about events, news, or developments that occurred AFTER early 2023.
    - The query asks for real-time data that changes frequently (e.g., stock prices, weather, sports scores).
    - The query asks about a very specific, niche, or non-famous entity that is unlikely to be in your training data.

    CRITERIA TO AVOID WEB SEARCH (web_search: false):
    - The query is about general knowledge, historical facts, or scientific concepts (e.g., "Who was Shakespeare?", "Explain black holes").
    - The query is a creative request (e.g., "Write a story about a dragon").
    - The query involves math, logic, or coding help.

    Analyze the following user query based on these criteria.

    User Query: "${query}"

    Respond ONLY with a single, valid JSON object and nothing else.
    If a search is needed, provide an optimized search query string.
    If no search is needed, the query field must be an empty string.

    Example 1:
    User Query: "What were the main announcements at the last Apple event?"
    Your Response: {"web_search": true, "query": "Apple event 2024 announcements summary"}

    Example 2:
    User Query: "What is the capital of France?"
    Your Response: {"web_search": false, "query": ""}`;

    const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("Triage response:", responseText);
    // Use a more robust regex to find the JSON object
    const match = responseText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const parsedJson = JSON.parse(match[0]);
        // Final validation to ensure the structure is correct
        if (typeof parsedJson.web_search === 'boolean') {
          return parsedJson;
        }
      } catch (e) {
        console.error("Error parsing triage JSON:", e, "Raw response:", responseText);
      }
    }
  } catch (error) {
    console.error("Error in search triage:", error);
  }
  // Default to no search if anything fails
  return { web_search: false, query: '' };
};

export const performWebSearch = async (query) => {
  console.log(`Performing web search for: "${query}"`);
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&pretty=1&no_html=1&skip_disambig=1`;
    const response = await fetch(searchUrl);
    if (!response.ok) {
      throw new Error(`DuckDuckGo API request failed with status ${response.status}`);
    }
    const data = await response.json();

    let results = [];
    if (data.AbstractText) {
      results.push(`- Summary: ${data.AbstractText}`);
    }
    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      data.RelatedTopics.slice(0, 3).forEach(topic => { // Limit to 3 related topics
        if (topic.Text) {
          results.push(`- Related: ${topic.Text} (Source: ${topic.FirstURL || 'N/A'})`);
        }
      });
    }

    if (results.length === 0) {
      return "No direct answer or related topics found on DuckDuckGo.";
    }

    console.log("Web search results:", results.join('\n'));
    return results.join('\n');
  } catch (error) {
    console.error("Error performing web search:", error);
    return "An error occurred while searching the web.";
  }
};

export const sendMessageToAI = async (apiKey, modelName, historyMessages, newMessageText) => {
  if (!apiKey) {
    throw new Error("API Key Missing. Please set your API Key in Settings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelName, safetySettings });

  const chatHistory = historyMessages
    .filter(m => !m.error) // Exclude previous error messages from history
    .map(m => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(newMessageText);
  const responseText = await result.response.text();
  return responseText;
};