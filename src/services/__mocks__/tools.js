// src/services/__mocks__/tools.js

// Mock implementations for testing
export const toolImplementations = {
  search_web: jest.fn(),
  calculator: jest.fn(),
  get_weather: jest.fn(),
  // Add other tools as needed
};

export const toolMetadata = [
  {
    agent_id: 'search_web',
    description: 'Search the web',
    input_format: { query: 'string' },
    output_format: { results: 'array' }
  },
  {
    agent_id: 'calculator',
    description: 'Perform calculations',
    input_format: { expression: 'string' },
    output_format: { result: 'number' }
  }
];