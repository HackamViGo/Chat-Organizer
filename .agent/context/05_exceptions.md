# 05 — Exceptions Protocol

Priority: CRITICAL — Rules for bending the rules.

## Emergency Override
Use ONLY for: production outages or security vulnerabilities.

1. Branch: `hotfix/...`
2. Bypass verify score: `git commit --no-verify`
3. Log in `.agent/logs/violations.json`:
```json
{
  "date": "YYYY-MM-DD",
  "role": "YOUR_ROLE",
  "rule_bypassed": "RULE_NAME",
  "reason": "...",
  "risk": "...",
  "normalization_plan": "ticket #123"
}
```
4. An exception is NEVER permanent — create a follow-up task immediately.

## Legacy Migration
- Old code severely violating typing rules → quarantine it, document technical debt.
- Don't blow scope to rewrite everything at once.
