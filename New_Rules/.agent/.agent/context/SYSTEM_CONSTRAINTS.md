# System Constraints

## 1. Browser Extension

- Must follow Manifest V3 standards.
- Content scripts must be minimal and non-intrusive.
- Communications must be secure and encrypted.

## 2. Platform Adapters

- Must implement `BasePlatformAdapter` interface.
- Must handle platform-specific rate limits gracefully.
- Must support 8+ simultaneous AI platforms.

## 3. Database

- Must use Supabase (PostgreSQL).
- RLS must be enabled on all tables.
- Vector search (pgvector) must be used for semantic operations.
