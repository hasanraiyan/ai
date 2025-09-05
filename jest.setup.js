// Jest setup file

// Define React Native's __DEV__ global variable for the test environment.
// This is necessary because some modules check this variable to alter their behavior,
// and it's not defined by default in Jest's Node environment.
global.__DEV__ = true;

// Add any other global test setup here