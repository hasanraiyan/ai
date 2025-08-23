export const IS_DEBUG = __DEV__ || process.env.NODE_ENV === 'development';

// Feature flags for agent system
export const FEATURE_FLAGS = {
  // Enable new Brain-Hands agent architecture
  USE_NEW_AGENT_SYSTEM: false,
  
  // Enable debug logging for agent system transitions
  DEBUG_AGENT_COMPATIBILITY: false,
  
  // Fallback to old system on new system errors
  FALLBACK_ON_ERROR: true
};