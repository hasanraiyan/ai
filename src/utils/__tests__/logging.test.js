// src/utils/__tests__/logging.test.js

import {
  Logger,
  PerformanceMetrics,
  LogLevel,
  LogCategory,
  createLogger,
  brainLogger,
  handsLogger,
  executorLogger,
  toolsLogger,
  systemLogger,
  conversationLogger,
  logObjectStructure
} from '../logging';

// Mock IS_DEBUG constant
jest.mock('../../constants', () => ({
  IS_DEBUG: true
}));

describe('Logging System', () => {
  describe('PerformanceMetrics', () => {
    let metrics;

    beforeEach(() => {
      metrics = new PerformanceMetrics();
    });

    test('should start and end timers correctly', () => {
      const timerName = 'test-timer';
      const metadata = { operation: 'test' };
      
      metrics.startTimer(timerName, metadata);
      expect(metrics.timers.has(timerName)).toBe(true);
      
      // Wait a bit to ensure duration > 0
      setTimeout(() => {
        const metric = metrics.endTimer(timerName, { additional: 'data' });
        
        expect(metric).toBeDefined();
        expect(metric.name).toBe(timerName);
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.metadata.operation).toBe('test');
        expect(metric.metadata.additional).toBe('data');
        expect(metrics.timers.has(timerName)).toBe(false);
      }, 10);
    });

    test('should handle missing timer gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = metrics.endTimer('non-existent-timer');
      
      expect(result).toBe(null);
      expect(consoleSpy).toHaveBeenCalledWith("Performance timer 'non-existent-timer' not found");
      
      consoleSpy.mockRestore();
    });

    test('should record custom metrics', () => {
      const metric = metrics.recordMetric('test-metric', 42, 'bytes', { source: 'test' });
      
      expect(metric.name).toBe('test-metric');
      expect(metric.value).toBe(42);
      expect(metric.unit).toBe('bytes');
      expect(metric.metadata.source).toBe('test');
      expect(metric.timestamp).toBeGreaterThan(0);
    });

    test('should get metrics by name pattern', () => {
      metrics.recordMetric('api-call-1', 100);
      metrics.recordMetric('api-call-2', 200);
      metrics.recordMetric('db-query', 50);
      
      const apiMetrics = metrics.getMetricsByName('api-call');
      expect(apiMetrics).toHaveLength(2);
      expect(apiMetrics.every(m => m.name.includes('api-call'))).toBe(true);
    });

    test('should cleanup old metrics', () => {
      // Add more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        metrics.recordMetric(`metric-${i}`, i);
      }
      
      expect(metrics.getMetrics().length).toBe(1100);
      
      metrics.cleanup();
      
      expect(metrics.getMetrics().length).toBe(1000);
    });
  });

  describe('Logger', () => {
    let logger;
    let consoleSpy;

    beforeEach(() => {
      logger = new Logger({
        component: 'test',
        enableConsole: false, // Disable console output for tests
        minLevel: LogLevel.DEBUG
      });
      
      consoleSpy = {
        debug: jest.spyOn(console, 'debug').mockImplementation(),
        info: jest.spyOn(console, 'info').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        error: jest.spyOn(console, 'error').mockImplementation()
      };
    });

    afterEach(() => {
      Object.values(consoleSpy).forEach(spy => spy.mockRestore());
    });

    test('should create structured log entries', () => {
      const entry = logger.createLogEntry(
        LogLevel.INFO,
        LogCategory.SYSTEM,
        'Test message',
        { key: 'value' },
        { context: 'test' }
      );
      
      expect(entry.level).toBe(LogLevel.INFO);
      expect(entry.category).toBe(LogCategory.SYSTEM);
      expect(entry.component).toBe('test');
      expect(entry.message).toBe('Test message');
      expect(entry.data.key).toBe('value');
      expect(entry.metadata.context).toBe('test');
      expect(entry.timestamp).toBeGreaterThan(0);
      expect(entry.sessionId).toBeDefined();
    });

    test('should respect log level filtering', () => {
      const warnLogger = new Logger({
        component: 'test',
        enableConsole: false,
        minLevel: LogLevel.WARN
      });
      
      warnLogger.debug(LogCategory.DEBUG, 'Debug message');
      warnLogger.info(LogCategory.SYSTEM, 'Info message');
      warnLogger.warn(LogCategory.SYSTEM, 'Warn message');
      warnLogger.error(LogCategory.ERROR, 'Error message');
      
      const logs = warnLogger.getRecentLogs();
      expect(logs).toHaveLength(2); // Only warn and error
      expect(logs[0].level).toBe(LogLevel.WARN);
      expect(logs[1].level).toBe(LogLevel.ERROR);
    });

    test('should provide convenience methods for different log levels', () => {
      logger.debug(LogCategory.DEBUG, 'Debug message');
      logger.info(LogCategory.SYSTEM, 'Info message');
      logger.warn(LogCategory.SYSTEM, 'Warn message');
      logger.error(LogCategory.ERROR, 'Error message');
      logger.critical(LogCategory.ERROR, 'Critical message');
      
      const logs = logger.getRecentLogs();
      expect(logs).toHaveLength(5);
      expect(logs.map(l => l.level)).toEqual([
        LogLevel.DEBUG,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
        LogLevel.CRITICAL
      ]);
    });

    test('should manage log buffer size', () => {
      const smallLogger = new Logger({
        component: 'test',
        enableConsole: false,
        maxBufferSize: 3
      });
      
      smallLogger.info(LogCategory.SYSTEM, 'Message 1');
      smallLogger.info(LogCategory.SYSTEM, 'Message 2');
      smallLogger.info(LogCategory.SYSTEM, 'Message 3');
      smallLogger.info(LogCategory.SYSTEM, 'Message 4');
      
      const logs = smallLogger.getRecentLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe('Message 2'); // First message was removed
    });

    test('should filter logs by category', () => {
      logger.info(LogCategory.BRAIN, 'Brain message');
      logger.info(LogCategory.HANDS, 'Hands message');
      logger.info(LogCategory.BRAIN, 'Another brain message');
      
      const brainLogs = logger.getLogsByCategory(LogCategory.BRAIN);
      expect(brainLogs).toHaveLength(2);
      expect(brainLogs.every(l => l.category === LogCategory.BRAIN)).toBe(true);
    });

    test('should filter logs by level', () => {
      logger.info(LogCategory.SYSTEM, 'Info message');
      logger.warn(LogCategory.SYSTEM, 'Warn message');
      logger.error(LogCategory.ERROR, 'Error message');
      logger.warn(LogCategory.SYSTEM, 'Another warn message');
      
      const warnLogs = logger.getLogsByLevel(LogLevel.WARN);
      expect(warnLogs).toHaveLength(2);
      expect(warnLogs.every(l => l.level === LogLevel.WARN)).toBe(true);
    });

    test('should handle performance timing', () => {
      const timerName = 'test-operation';
      
      logger.startPerformanceTimer(timerName, { operation: 'test' });
      
      setTimeout(() => {
        const metric = logger.endPerformanceTimer(timerName, { result: 'success' });
        
        expect(metric).toBeDefined();
        expect(metric.name).toBe(timerName);
        expect(metric.duration).toBeGreaterThan(0);
        
        const logs = logger.getRecentLogs();
        expect(logs.some(l => l.message.includes('Started timer'))).toBe(true);
        expect(logs.some(l => l.message.includes('Timer completed'))).toBe(true);
      }, 10);
    });

    test('should record custom metrics', () => {
      const metric = logger.recordMetric('api-calls', 5, 'count', { endpoint: '/test' });
      
      expect(metric.name).toBe('api-calls');
      expect(metric.value).toBe(5);
      expect(metric.unit).toBe('count');
      
      const logs = logger.getLogsByCategory(LogCategory.METRICS);
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain('Metric recorded');
    });

    test('should log conversation flow', () => {
      const userInput = 'Test user input';
      const result = { success: true, response: 'Test response', metadata: { iterationsUsed: 3 } };
      
      logger.logConversationStart(userInput, { context: 'test' });
      logger.logConversationEnd(result, { context: 'test' });
      
      const logs = logger.getLogsByCategory(LogCategory.CONVERSATION);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Conversation started');
      expect(logs[1].message).toBe('Conversation ended');
      expect(logs[1].data.iterationsUsed).toBe(3);
    });

    test('should log brain and hands communication', () => {
      const command = { tool_name: 'test-tool', parameters: { param1: 'value1' } };
      const result = { success: true, metadata: { executionTime: 100 }, data: { result: 'test' } };
      
      logger.logBrainDecision(command, { iteration: 1 });
      logger.logHandsExecution(command, result, { iteration: 1 });
      
      const brainLogs = logger.getLogsByCategory(LogCategory.BRAIN);
      const handsLogs = logger.getLogsByCategory(LogCategory.HANDS);
      
      expect(brainLogs).toHaveLength(1);
      expect(handsLogs).toHaveLength(1);
      expect(brainLogs[0].data.toolName).toBe('test-tool');
      expect(handsLogs[0].data.executionTime).toBe(100);
    });

    test('should export logs with options', () => {
      logger.info(LogCategory.BRAIN, 'Brain message');
      logger.info(LogCategory.HANDS, 'Hands message');
      logger.recordMetric('test-metric', 42);
      
      const export1 = logger.exportLogs();
      expect(export1.sessionId).toBeDefined();
      expect(export1.component).toBe('test');
      expect(export1.logs).toHaveLength(2);
      expect(export1.metrics).toBeUndefined();
      
      const export2 = logger.exportLogs({ 
        category: LogCategory.BRAIN, 
        includeMetrics: true 
      });
      expect(export2.logs).toHaveLength(1);
      expect(export2.logs[0].category).toBe(LogCategory.BRAIN);
      expect(export2.metrics).toBeDefined();
    });

    test('should cleanup logs and metrics', () => {
      // Add many logs
      for (let i = 0; i < 1100; i++) {
        logger.info(LogCategory.SYSTEM, `Message ${i}`);
      }
      
      expect(logger.getRecentLogs().length).toBeGreaterThan(1000);
      
      logger.cleanup();
      
      expect(logger.getRecentLogs().length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Component Loggers', () => {
    test('should create component-specific loggers', () => {
      expect(brainLogger.component).toBe('brain');
      expect(handsLogger.component).toBe('hands');
      expect(executorLogger.component).toBe('executor');
      expect(toolsLogger.component).toBe('tools');
      expect(systemLogger.component).toBe('system');
    });

    test('should create custom logger with factory', () => {
      const customLogger = createLogger('custom', {
        minLevel: LogLevel.WARN,
        enableConsole: false
      });
      
      expect(customLogger.component).toBe('custom');
      expect(customLogger.minLevel).toBe(LogLevel.WARN);
    });
  });

  describe('Conversation Logger Middleware', () => {
    let logger;
    let middleware;

    beforeEach(() => {
      logger = new Logger({ component: 'test', enableConsole: false });
      middleware = conversationLogger(logger);
    });

    test('should log conversation start and end', () => {
      const userInput = 'Test input';
      const context = { apiKey: 'test', modelName: 'test' };
      const result = { success: true, response: 'Test response' };
      
      middleware.logStart(userInput, context);
      middleware.logEnd(result, context);
      
      const logs = logger.getLogsByCategory(LogCategory.CONVERSATION);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Conversation started');
      expect(logs[1].message).toBe('Conversation ended');
    });

    test('should log iteration details', () => {
      const command = { tool_name: 'test-tool', parameters: {} };
      const result = { success: true, data: 'test' };
      
      middleware.logIteration(1, 5, command, result);
      
      const logs = logger.getRecentLogs();
      expect(logs.length).toBeGreaterThan(0);
      
      const iterationLogs = logger.getLogsByCategory(LogCategory.ITERATION);
      expect(iterationLogs.length).toBeGreaterThan(0);
    });
  });

  describe('Utility Functions', () => {
    test('should log object structure in debug mode', () => {
      const logger = new Logger({ component: 'test', enableConsole: false });
      const testObj = { key1: 'value1', key2: [1, 2, 3], key3: { nested: true } };
      
      logObjectStructure(logger, testObj, 'testObject');
      
      const debugLogs = logger.getLogsByCategory(LogCategory.DEBUG);
      expect(debugLogs).toHaveLength(1);
      expect(debugLogs[0].message).toContain('Object structure: testObject');
      expect(debugLogs[0].data.keys).toEqual(['key1', 'key2', 'key3']);
      expect(debugLogs[0].data.type).toBe('object');
    });
  });
});