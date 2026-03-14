---
description: 
---

# Workflow: Search Project Graph

1. Ask: "What are you searching for? (component name, file path, concept)"
2. Ask: "Which graph? (project / knowledge)"

3. Run:
   python3 .agent/tools/graph.py search --graph [project|knowledge] "[query]"

   Search is case-insensitive and searches ALL fields in the node JSON.

4. Results are raw JSON. Format them readably:
   - id: the node identifier
   - workspace / category: where it belongs
   - responsibility / description: what it does
   - dependencies: what it depends on (project graph)
   - tags: keywords (knowledge graph)

5. If no results → suggest a broader search term.
