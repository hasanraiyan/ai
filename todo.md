# TODO - Items for Review

This file lists items that were identified during the codebase analysis and may require further review or action.

### Unused or Placeholder Files

-   `src/components/ImageGalleryModal.js`: This file is currently empty. It should be reviewed to determine if it's a placeholder for a future feature or if it can be safely removed.

### Experimental Features

-   **Brain-Hands Agent System:** The following files are part of a new, experimental "Brain-Hands" agent architecture. Their usage is controlled by the `USE_NEW_AGENT_SYSTEM` feature flag in `src/constants/index.js`.
    -   `src/prompts/masterPrompt.js`
    -   `src/services/agentExecutor.js`
    -   `src/services/brainService.js`
    -   `src/services/handsService.js`
    -   `src/services/enhancedTools.js`
    -   `src/services/toolCompatibilityAdapter.js`
    -   **Action:** Review the status of this feature. If it's stable, consider removing the feature flag and the legacy system. If it's deprecated, these files could be removed.

### Developer Notes & Debug Code

-   **`src/services/TOOL_COMPATIBILITY_SUMMARY.md`**: This file appears to be a developer note. Review its contents and decide if it should be moved to project documentation or removed.
-   **`console.log` statements**: There are several `console.log` statements throughout the codebase, particularly in the `src/agents/` and `src/services/` directories. These should be replaced with the structured logger from `src/utils/logging.js` or removed for production builds.

### Potential Duplication

-   **JSON Extraction**: There are two `extractJson` functions, one in `src/utils/extractJson.js` and a static method in `src/services/aiAgents.js`. The one in `aiAgents.js` is just a wrapper. This is not a major issue, but for consistency, all parts of the app should use the utility from `src/utils/extractJson.js`. The static method could be removed to avoid confusion.
