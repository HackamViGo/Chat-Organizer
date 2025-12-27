# BrainBox Tests

## Structure

```
tests/
├── unit/           - Unit tests for functions
├── integration/    - API and database integration tests
└── e2e/            - End-to-end tests
```

## Running Tests

```bash
npm test              # Run all tests
npm test:unit         # Unit tests only
npm test:integration  # Integration tests only
npm test:e2e          # E2E tests only
```

## Writing Tests

Each test file should be in its own subdirectory:
```
tests/unit/chat-utils/
  ├── formatChat.test.ts
  └── validateChat.test.ts
```
