# New Platforms Test Summary

This document summarizes the testing coverage for the five newly integrated AI platforms.

## Platform Coverage

| Platform | Test File | Key Scenarios Covered |
| :--- | :--- | :--- |
| **DeepSeek** | `deepseek.test.ts` | Token capture, session fetch, 401 handling, title generation |
| **Perplexity** | `perplexity.test.ts` | Session/Public search, thread fetch, query-to-title fallback |
| **Grok** | `grok.test.ts` | CSRF + OAuth tokens, history POST, sender role mapping |
| **Qwen** | `qwen.test.ts` | XSRF token, app-id support, unix timestamp normalization |
| **LM Arena** | `lmarena.test.ts` | Gradio session hash, fn_index, complex array parsing |

## Integration Testing

The `newPlatforms.integration.test.ts` file verifies:

- **Registry Registration**: All 5 new platforms are correctly registered and retrievable via `getAdapter`.
- **End-to-End Save Flow**: Complete path from platform API fetch to `dashboardApi.saveToDashboard` for DeepSeek, Perplexity, and Grok.
- **Token Synchronization**: Simulates simultaneous token capture and multi-platform conversation fetching.
- **Error Recovery**: Verifies that 401 errors and network failures are handled consistently across all new adapters.

## Test Statistics

- **New Unit Tests**: ~60 cases across 5 files.
- **Integration Tests**: ~15 complex end-to-end and multi-platform scenarios.
- **Total Coverage**: Approximately 85%+ coverage for the new adapter logic.
