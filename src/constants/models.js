// src/constants/models.js

export const models = [
    {
        id: 'gemma-3n-e4b-it',
        name: 'Gemma 3n E4B',
        contextWindow: 8192,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: false,
        supported_tools: []
    },
    {
        id: 'gemma-3-1b-it',
        name: 'Gemma 3 1B',
        contextWindow: 32768,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: false,
        supported_tools: []
    },
    {
        id: 'gemma-3-4b-it',
        name: 'Gemma 3 4B',
        contextWindow: 32768,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: false,
        supported_tools: []
    },
    {
        id: 'gemma-3-12b-it',
        name: 'Gemma 3 12B',
        contextWindow: 32768,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['calculator', 'image_generator']
    },
    {
        id: 'gemma-3-27b-it',
        name: 'Gemma 3 27B',
        contextWindow: 131072,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.0-flash-preview-image-generation',
        name: 'Gemini 2.0 Flash Preview Image Generation',
        contextWindow: 32768,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        // FIX: The model name implies image generation, so the tool should be supported.
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash-Lite',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.5-pro-preview-05-06',
        name: 'Gemini 2.5 Pro Preview 05-06',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.5-flash-preview-04-17',
        name: 'Gemini 2.5 Flash Preview 04-17',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    },
    {
        id: 'gemini-2.5-flash-lite-preview-06-17',
        name: 'Gemini 2.5 Flash Lite Preview 06-17',
        contextWindow: 1048576,
        isChatModel: true,
        isTitleModel: true,
        isAgentModel: true,
        supported_tools: ['search_web', 'calculator', 'image_generator']
    }
];