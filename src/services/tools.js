// src/services/tools.js

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { encode as btoa } from 'base-64';
import { IS_DEBUG } from '../constants';

// --- DATE HELPER FUNCTIONS FOR REPORTING ---
const getPeriodRange = (period) => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period?.toLowerCase()) {
        case 'today':
            return { start: startOfDay, end: endOfDay };
        case 'this week':
            const firstDayOfWeek = new Date(startOfDay);
            firstDayOfWeek.setDate(startOfDay.getDate() - now.getDay());
            return { start: firstDayOfWeek, end: endOfDay };
        case 'this month':
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: firstDayOfMonth, end: endOfDay };
        case 'this year':
            const firstDayOfYear = new Date(now.getFullYear(), 0, 1);
            return { start: firstDayOfYear, end: endOfDay };
        default: // Default to all time if period is unrecognized or null
            return { start: new Date(0), end: now };
    }
};

/**
 * Fetches real-time search suggestions from DuckDuckGo.
 */
export const getSearchSuggestions = async (query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }
  try {
    const response = await axios.get(`https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&format=json`);
    return response.data.map(item => item.phrase).slice(0, 5);
  } catch (error) {
    console.warn("Could not fetch search suggestions:", error);
    return [];
  }
};

/**
 * A collection of tool metadata for discovery.
 */
export const toolMetadata = [
  {
    agent_id: "search_web",
    description: "Performs a web search using the Tavily API for real-time information. ",
    capabilities: ["query"],
    input_format: { query: "string" },
    output_format: { success: "boolean", message: "string", data: { summary: "string" } }
  },
  {
    agent_id: "calculator",
    description: "Evaluates a mathematical expression. Use for calculations.",
    capabilities: ["expression"],
    input_format: { expression: "string" },
    output_format: { success: "boolean", message: "string", data: { result: "number or string" } }
  },
  {
    agent_id: "image_generator",
    description: "Generates an image based on a descriptive prompt and saves it to the device's local storage.",
    capabilities: ["prompt", "metadata"],
    input_format: { prompt: "string", metadata: "object" },
    output_format: { success: "boolean", message: "string", data: { imageUrl: "string", localUri: "string" } }
  },
  {
    agent_id: "add_transaction",
    description: "Adds a new income or expense transaction. Use this to record financial activities. The AI must infer the category (e.g., 'Food', 'Transport', 'Salary', 'Bills', 'Entertainment', 'Other').",
    capabilities: ["type", "amount", "category", "description"],
    input_format: {
        type: "string ('income' or 'expense')",
        amount: "number",
        category: "string",
        description: "string (a brief description of the transaction)"
    },
    output_format: { success: "boolean", message: "string", data: null }
  },
  {
    agent_id: "get_financial_report",
    description: "Generates a financial summary for a given period. Valid periods are 'today', 'this week', 'this month', 'this year', or 'all time'.",
    capabilities: ["period"],
    input_format: { period: "string" },
    output_format: { success: "boolean", message: "string", data: { report: "string (Markdown formatted)" } }
  },
  {
    agent_id: "set_budget",
    description: "Sets a monthly spending budget for a specific category. The AI must use a valid category from this list: 'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Other'.",
    capabilities: ["category", "amount"],
    input_format: { category: "string", amount: "number" },
    output_format: { success: "boolean", message: "string", data: null }
  },
  {
    agent_id: "get_budget_status",
    description: "Retrieves the current status of all set budgets, comparing them against this month's spending. Use this to check how much is left in a budget.",
    capabilities: [],
    input_format: {},
    output_format: { success: "boolean", message: "string", data: { report: "string (Markdown formatted)" } }
  }

];

export const getAvailableTools = () => toolMetadata;

/**
 * Tool Implementations
 */
const tools = {
  search_web: async ({ query }, { tavilyApiKey }) => {
    console.log(`TOOL: Searching Tavily for "${query}"`);
    if (!tavilyApiKey) {
      const errorMsg = "Error: Tavily API key is not configured. Please add it in the settings.";
      console.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
    }
    try {
      const response = await axios.post('https://api.tavily.com/search', {
        api_key: tavilyApiKey,
        query: query,
        search_depth: "basic",
        include_answer: true,
        max_results: 5
      });
      
      const { answer, results } = response.data;
      
      if (IS_DEBUG) {
          console.log("Tavily Search Response:", response.data);
      }
      
      let summary = `**Search Answer:**\n${answer || 'No direct answer found.'}\n\n**Top Results:**\n`;
      if (results && results.length > 0) {
        summary += results.map(res => `- [${res.title}](${res.url}): ${res.content}`).join('\n');
      } else {
        summary += "No web results found.";
      }
      
      return { success: true, message: "Web search completed successfully.", data: { summary } };

    } catch (error) {
      const errorMsg = "Error: Failed to perform web search. The API key might be invalid or the service may be unavailable.";
      console.error("Tavily search failed:", error.response ? error.response.data : error.message);
      return { success: false, message: errorMsg, data: null };
    }
  },

  calculator: async ({ expression }) => {
    console.log(`TOOL: Calculating "${expression}"`);
    try {
      const result = new Function(`return ${expression}`)(); 
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error("Invalid mathematical expression.");
      }
      return { success: true, message: `Calculation result: ${result}`, data: { result } };
    } catch (e) {
      const errorMsg = `Error evaluating expression: ${e.message}`;
      console.error(errorMsg);
      return { success: false, message: errorMsg, data: null };
    }
  },

  image_generator: async ({ prompt, metadata = {} }) => {
    console.log(`TOOL: Generating image for "${prompt}" with metadata:`, metadata);
    const IMAGE_DIR = `${FileSystem.documentDirectory}ai_generated_images/`;

    const dirInfo = await FileSystem.getInfoAsync(IMAGE_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
    }
    
    const { 
      width = 512, 
      height = 512, 
      imageGenModel = 'flux'
    } = metadata;
    
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?enhance=true&nologo=true&width=${width}&height=${height}&model=${imageGenModel}`;

    const uniqueId = Date.now().toString();
    const imageFilename = `${uniqueId}.png`;
    const metadataFilename = `${uniqueId}.json`;
    const fileUri = `${IMAGE_DIR}${imageFilename}`;
    const metadataUri = `${IMAGE_DIR}${metadataFilename}`;

    try {
      const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
      if (downloadResult.status !== 200) throw new Error(`Image download failed with status ${downloadResult.status}`);
      
      const dataToSave = { ...metadata, fullPrompt: prompt, creationTimestamp: Date.now(), size: { width, height }, imageUrl: imageUrl };
      await FileSystem.writeAsStringAsync(metadataUri, JSON.stringify(dataToSave, null, 2));
      
      return { success: true, message: 'Image generated successfully and is now available in the gallery.', data: { imageUrl, localUri: downloadResult.uri } };
    } catch (err) {
      const errorMsg = `Image generation failed: ${err.message}`;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
      await FileSystem.deleteAsync(metadataUri, { idempotent: true });
      return { success: false, message: 'Failed to fetch or save the image.', data: null };
    }
  },

  add_transaction: async (transactionData, { addTransaction }) => {
    console.log(`TOOL: Adding transaction:`, transactionData);
    if (!addTransaction) return { success: false, message: "Internal error: addTransaction function not available.", data: null };
    if (!transactionData.type || !transactionData.amount || !transactionData.category) return { success: false, message: "Transaction failed: Missing required fields (type, amount, category).", data: null };
    
    try {
        addTransaction(transactionData);
        return { success: true, message: "Transaction added successfully.", data: null };
    } catch (e) {
        return { success: false, message: `Failed to add transaction: ${e.message}`, data: null };
    }
  },

  get_financial_report: async ({ period }, { getFinancialReport }) => {
    console.log(`TOOL: Generating financial report for period: ${period}`);
    if (!getFinancialReport) return { success: false, message: "Internal error: getFinancialReport function not available.", data: null };

    try {
        const report = await getFinancialReport(period);
        return { success: true, message: "Financial report generated successfully.", data: { report } };
    } catch (e) {
        return { success: false, message: `Failed to generate financial report: ${e.message}`, data: null };
    }
  },

  set_budget: async ({ category, amount }, { setBudget }) => {
    console.log(`TOOL: Setting budget for ${category} to ${amount}`);
    if (!setBudget) return { success: false, message: "Internal error: setBudget function not available.", data: null };
    try {
      setBudget(category, amount);
      return { success: true, message: `Successfully set budget for ${category} to ${amount}.`, data: null };
    } catch (e) {
      return { success: false, message: `Failed to set budget: ${e.message}`, data: null };
    }
  },
  
  get_budget_status: async (_, { getBudgets, getTransactions }) => {
    console.log(`TOOL: Generating budget status report`);
    if (!getBudgets || !getTransactions) return { success: false, message: "Internal error: Budget functions not available.", data: null };
    
    try {
      const budgets = getBudgets();
      const transactions = getTransactions();

      if (Object.keys(budgets).length === 0) {
        return { success: true, message: "No budgets have been set yet.", data: { report: "You haven't set any budgets. You can set one by saying, for example, 'Set a monthly budget of $500 for Food'." } };
      }
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const expensesThisMonth = transactions.filter(tx => tx.type === 'expense' && new Date(tx.date) >= startOfMonth);
      const spendingByCategory = expensesThisMonth.reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
        return acc;
      }, {});
      
      let report = `# Monthly Budget Status\n\n`;
      for (const [category, budgetAmount] of Object.entries(budgets)) {
        const spent = spendingByCategory[category] || 0;
        const remaining = budgetAmount - spent;
        report += `## ${category}\n- **Budget:** $${budgetAmount.toFixed(2)}\n- **Spent:** $${spent.toFixed(2)}\n- **Remaining:** $${remaining.toFixed(2)}\n\n`;
      }
      return { success: true, message: "Budget status report generated.", data: { report } };
    } catch (e) {
      return { success: false, message: `Failed to generate budget status report: ${e.message}`, data: null };
    }
  }
    
};

export const toolImplementations = tools;

/**
 * Tool Dispatcher
 */
export const toolDispatcher = async ({ toolCall, context = {} }) => {
  const { allowedTools = [] } = context;
  const toolPromises = [];
  const results = {};

  for (const toolName in toolCall) {
    if (toolCall.hasOwnProperty(toolName) && toolName !== 'tools-required') {
      // --- BUG FIX: Enforce tool permissions ---
      if (!allowedTools.includes(toolName) || !tools[toolName]) {
        console.warn(`TOOL REJECTED: Attempted to call unauthorized or non-existent tool "${toolName}"`);
        results[toolName] = { success: false, message: `Error: You are not authorized to use the tool '${toolName}'.`, data: null };
        continue; // Skip to the next tool
      }

      const promise = tools[toolName](toolCall[toolName], context)
        .then(result => { results[toolName] = result; })
        .catch(err => { results[toolName] = { success: false, message: `Tool ${toolName} threw an exception: ${err.message}`, data: null }; });
      toolPromises.push(promise);
    }
  }

  await Promise.all(toolPromises);
  return results;
};