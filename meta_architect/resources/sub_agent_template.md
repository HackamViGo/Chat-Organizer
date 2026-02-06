# ============================================================================
# SUB-AGENT TEMPLATE (Builder Agent Configuration)
# Version: 3.1 - Production Standard (2024-2026)
# Protocol: MCP + Graph-RAG + Zero-Info Rule + Tool Belts
# ============================================================================

# This template defines the standard configuration for all Builder agents
# in the Superior Meta-Architect+ ecosystem. Each agent operates in a
# "sandbox" with strict knowledge boundaries enforced by the Meta-Architect.

# ============================================================================
# AGENT IDENTITY
# ============================================================================

agent_metadata:
  template_version: "3.1"
  created_by: "meta_architect"
  last_updated: "2026-02-06T00:00:00Z"
  
  # This will be populated when spawned
  agent_id: "${GENERATED_AT_RUNTIME}"
  role: "${ASSIGNED_ROLE}"  # frontend_specialist | backend_specialist | etc.
  
  # Operational status (managed by Meta-Architect)
  status: "IDLE"  # IDLE | ACTIVE | WAITING | BLOCKED | COMPLETED | FAILED
  
  # Runtime configuration
  model:
    provider: "anthropic"
    name: "claude-sonnet-4-20250514"
    temperature: 0.2  # Low for consistency, higher than Meta-Architect for creativity
    max_tokens: 8000
    thinking_mode: "standard"  # Only Meta-Architect uses "extended"
    
  # Security constraints
  sandbox:
    read_only_graph: true  # Cannot write to knowledge_graph.json
    file_system_root: "./project/"  # Cannot access files outside this
    mcp_tools_restricted: true  # Only uses tools granted by Meta-Architect
    
# ============================================================================
# CORE IDENTITY & MISSION (System Prompt)
# ============================================================================

system_prompt: |
  # 🤖 ACTIVATING SUB-AGENT: {{ROLE_NAME}}

  **Parent Process:** Meta-Architect v3.1
  **Mission ID:** {{MISSION_ID}}

  ## 1. YOUR IDENTITY
  You are the **{{ROLE_NAME}}**.
  *   **Role:** {{DESCRIPTION}}
  *   **Thinking Mode:** {{THINKING_MODE}} (Temp: {{TEMPERATURE}})

  ## 2. ACTIVE TOOL BELT (LAZY LOADED)
  You have restricted access to the following MCP Servers. 
  **Using tools outside this list is a Protocol Violation.**

  ✅ **ACTIVE SERVERS:**
  {{ALLOWED_MCP_SERVERS}}

  🚫 **BLOCKED SERVERS:**
  {{BLOCKED_MCP_SERVERS}}

  **KNOWLEDGE HIERARCHY (Doc-First):**
  1.  **LOCAL:** Search `docs/` and `knowledge_graph.json` first.
  2.  **LINKED:** Follow file paths found in Step 1.
  3.  **EXTERNAL:** Use Web Search ONLY if Local sources are empty.

  ## 3. FILE SYSTEM PERMISSIONS
  *   **Read/Write:** {{ALLOWED_FILES}}
  *   **READ ONLY:** {{READ_ONLY_FILES}}
  *   **FORBIDDEN:** {{FORBIDDEN_FILES}}

  ## 4. MISSION CONSTRAINTS
  {{CONSTRAINTS}}

  ## 5. CURRENT MISSION
  {{MISSION_DESCRIPTION}}

  **EXECUTE MISSION.**

# ============================================================================
# OPERATIONAL CONFIGURATION
# ============================================================================

capabilities:
  # What this agent CAN do
  can_read_files: true
  can_write_files: true
  can_execute_commands: true  # Within sandbox
  can_call_mcp_tools: true    # Only approved tools
  can_update_state: true
  can_escalate: true
  
  # What this agent CANNOT do
  cannot_modify_graph: true
  cannot_approve_escalations: true
  cannot_change_identity_locked_nodes: true
  cannot_access_system_files: true
  cannot_merge_pull_requests: true

constraints:
  # Technical constraints
  max_file_size_mb: 10
  max_concurrent_operations: 3
  checkpoint_interval_seconds: 300  # Force checkpoint every 5 min
  
  # Behavioral constraints
  must_cite_sources: true
  must_use_context_package: true
  must_escalate_on_unknown: true
  
  # Security constraints
  sandbox_escape_protection: true
  code_execution_timeout_seconds: 60
  mcp_tool_rate_limit: "10/minute"

# TOOL BELTS (MCP Server Configuration)
# ============================================================================

tooling_config:
  # Explicitly allowed MCP servers. If a server is NOT in this list,
  # it cannot be used even if its tools are in the 'tools' permission.
  allowed_mcp_servers: "${ALLOWED_SERVERS}"
  
  # Explicitly blocked MCP servers (Security Gate).
  blocked_mcp_servers: "${BLOCKED_SERVERS}"

# legacy configuration block - to be deprecated in v4.0
mcp_tools:
  filesystem:
    enabled: true
    config:
      root_directory: "./project/"
      allowed_extensions: [".js", ".jsx", ".ts", ".tsx", ".py", ".json", ".yaml", ".md"]
      forbidden_paths: ["node_modules", ".git", ".env"]
      max_file_size_mb: 10
      
  web_search:
    enabled: false  # Only enabled by Meta-Architect when needed
    config:
      allowed_domains:
        - "*.anthropic.com"
        - "*.openai.com"
        - "react.dev"
        - "nextjs.org"
        - "developer.mozilla.org"
      max_results: 5
      
  github:
    enabled: false  # Only for specific tasks
    config:
      allowed_actions: ["read_issue", "read_pr", "comment"]
      forbidden_actions: ["merge", "close", "delete"]

# ============================================================================
# STATE MANAGEMENT
# ============================================================================

state_file:
  path: "./agent_states/${AGENT_ID}.yml"
  format: "yaml"
  auto_save: true
  backup_on_checkpoint: true
  
state_schema:
  agent_id: "string"
  role: "enum[frontend_specialist, backend_specialist, ...]"
  status: "enum[IDLE, ACTIVE, WAITING, BLOCKED, COMPLETED, FAILED]"
  assigned_task:
    id: "string"
    description: "string"
    started_at: "datetime"
    completed_at: "datetime|null"
  context_injection:
    last_update: "datetime"
    package_path: "string"
    graph_nodes: "list[string]"
  checkpoints: "list[checkpoint_object]"
  escalations: "list[escalation_object]"
  output_artifacts: "list[artifact_object]"

# ============================================================================
# MONITORING & LOGGING
# ============================================================================

logging:
  level: "INFO"
  format: "json"
  output: "./logs/${AGENT_ID}.log"
  include_timestamps: true
  include_context_refs: true
  
metrics:
  track_checkpoints: true
  track_escalations: true
  track_mcp_calls: true
  track_file_operations: true
  
alerts:
  on_escalation: "notify_meta_architect"
  on_blocked_status: "immediate_notification"
  on_3_failed_attempts: "suggest_reassignment"

# ============================================================================
# LIFECYCLE HOOKS
# ============================================================================

lifecycle:
  on_spawn:
    - "load_context_package"
    - "validate_context_integrity"
    - "initialize_state_file"
    - "log_agent_ready"
    
  on_task_assign:
    - "update_state_status_to_ACTIVE"
    - "record_task_start_time"
    - "verify_context_package_current"
    
  on_checkpoint:
    - "backup_current_state"
    - "update_state_file"
    - "validate_output_artifacts"
    
  on_escalation:
    - "update_state_status_to_BLOCKED"
    - "notify_meta_architect"
    - "await_resolution"
    
  on_complete:
    - "update_state_status_to_COMPLETED"
    - "generate_completion_report"
    - "archive_state_file"
    
  on_failure:
    - "update_state_status_to_FAILED"
    - "capture_error_context"
    - "escalate_to_meta_architect"

# ============================================================================
# TESTING & VALIDATION
# ============================================================================

validation_rules:
  before_execution:
    - "context_package_exists"
    - "context_package_not_empty"
    - "all_required_nodes_present"
    - "mcp_tools_available"
    
  during_execution:
    - "no_unauthorized_file_access"
    - "no_identity_locked_modifications"
    - "all_decisions_cited"
    
  after_execution:
    - "output_matches_requirements"
    - "all_files_valid_syntax"
    - "state_file_consistent"

# ============================================================================
# EXAMPLES OF TYPICAL WORKFLOWS
# ============================================================================

example_workflows:
  
  frontend_feature:
    role: "frontend_specialist"
    steps:
      - "Read context package (React, Next.js, Tailwind docs)"
      - "Validate UI requirements against package"
      - "Create component structure (checkpoint)"
      - "Implement logic with cited patterns (checkpoint)"
      - "Add tests if testing framework in package (checkpoint)"
      - "Mark COMPLETED or ESCALATE if blocked"
    
  backend_api:
    role: "backend_specialist"
    steps:
      - "Read context package (Express/FastAPI, DB ORM docs)"
      - "Design API routes per package patterns"
      - "Implement endpoints with error handling (checkpoint)"
      - "Add input validation per package guidelines (checkpoint)"
      - "Verify against API spec if provided (checkpoint)"
      - "Mark COMPLETED or ESCALATE if schema missing"
    
  database_migration:
    role: "db_architect"
    steps:
      - "Read context package (PostgreSQL/MySQL docs, ORM)"
      - "ESCALATE if attempting to modify identity-locked schema"
      - "Design migration script (checkpoint)"
      - "Test migration in sandbox (checkpoint)"
      - "Mark COMPLETED or ESCALATE if conflicts detected"

# ============================================================================
# VERSION CONTROL & AUDIT
# ============================================================================

audit:
  log_all_actions: true
  log_all_escalations: true
  log_all_mcp_calls: true
  log_context_package_access: true
  retention_days: 90

versioning:
  last_updated: "2026-01-24"
  changelog:
    - version: "3.1"
      date: "2026-02-06"
      changes:
        - "Implemented Tool Belts (Allowed/Blocked MCP servers)"
        - "Upgraded to Triad Architecture standard"
    - version: "2.0"
      date: "2026-01-24"
      changes:
        - "Added Zero-Info Rule enforcement"
        - "Added identity lock verification"
        - "Enhanced escalation protocol"
        - "Integrated MCP 2025-11-25 spec"

# ============================================================================
# END OF SUB-AGENT TEMPLATE
# ============================================================================
