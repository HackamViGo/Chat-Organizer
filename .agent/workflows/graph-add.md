---
description: 
---

# Workflow: Add Node to Project Graph

1. Ask: "Which graph? (project / knowledge)"

For PROJECT graph, collect:
   --id       → file path relative to project root (e.g., src/background/message-router.ts)
   --workspace → extension_v3 / extension / dashboard / shared / root
   --type     → module / config / documentation
   --desc     → one sentence responsibility
   --deps     → JSON array of dependency IDs (e.g., '["shared/types.ts", "shared/logger.ts"]')

For KNOWLEDGE graph, collect:
   --id       → concept name (e.g., "gemini-main-bridge-pattern")
   --category → e.g., "Architecture", "External Documentation", "Business Logic"
   --title    → human-readable title
   --desc     → description
   --tags     → JSON array of tags (e.g., '["chrome-extension", "MAIN-world", "injection"]')

2. Run:
   python3 .agent/tools/graph.py add --graph [type] --id "[id]" --desc "[desc]" [other flags]

3. If the node ID already exists → script will error. Use manual edit or implement update command.

4. Confirm: "Successfully added node '[id]' to [graph] graph."
   Show the created node JSON.