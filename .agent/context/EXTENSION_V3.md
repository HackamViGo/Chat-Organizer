# Extension v3 Context

## Overview
This document tracks the architecture and key components of the **Extension v3**.

## Reference
- Full Documentation: [MASTER_DOCUMENT_INDEX.md](file:///home/stefanov/Projects/In%20Progress/Chat%20Organizer%20Cursor/docs/user/New_EXT/MASTER_DOCUMENT_INDEX.md)

## 3-System Architecture
1. **Capture System**: Intercepts tokens, auth headers, and conversation data via `webRequest` and content scripts.
2. **Prompt System**: Manages prompt injection via the content bridge and `PromptSyncManager`.
3. **Sync System**: Handles bidirectional sync between the platforms and the BrainBox Dashboard API.

## 8 Platforms Supported
- Gemini
- ChatGPT
- Claude
- Perplexity
- Mistral
- Grok
- DeepSeek
- HuggingChat (HuggingFace)

## Key Files
- `apps/extension_v3/src/service-worker.ts`: Main entry point, lifecycle management.
- `apps/extension_v3/src/lib/authManager.ts`: Handles session tokens and platform auth.
- `apps/extension_v3/src/lib/messageRouter.ts`: Central hub for cross-context communication.
- `apps/extension_v3/src/lib/platformAdapters/`: Implementation of platform-specific logic.
- `apps/extension_v3/src/lib/normalizers.ts`: Transform raw API responses into standard BrainBox types.

## Dashboard API Integration
- `POST /api/chats`: Save captured conversations.
- `GET /api/folders`: Retrieve folder structure for organization.
- `PATCH /api/chats/[id]`: Update existing chat metadata.
