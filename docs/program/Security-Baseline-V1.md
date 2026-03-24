# Security Baseline - Version 1

## Scope

Baseline controls for frontend, backend API, data layer, and artifact storage.

## Authentication and Authorization

1. Use authenticated user identity for all project operations.
2. Enforce project ownership at API and database RLS layers.
3. Deny-by-default for unauthorized resource access.

## API Security

1. Validate all request payloads against schemas.
2. Reject unknown fields for deterministic endpoints.
3. Add rate limiting for AI and calc execution endpoints.
4. Return structured errors without sensitive internals.

## Data Security

1. Apply Supabase RLS to project-linked tables.
2. Encrypt data in transit (TLS) and at rest.
3. Restrict service-role keys to backend only.

## Storage Security (R2)

1. Store artifacts with private object access by default.
2. Use short-lived signed URLs for downloads.
3. Track artifact checksum and creator metadata.

## Secrets and Configuration

1. Store secrets in secure environment configuration.
2. Never expose backend keys in frontend bundles.
3. Rotate keys on schedule and incident response.

## Logging and Audit

1. Log auth events, calculation execution metadata, and failures.
2. Avoid storing sensitive raw secrets in logs.
3. Keep audit trail tied to user and project IDs.

## Dependency and Supply Chain

1. Pin dependency versions for reproducibility.
2. Add CI vulnerability checks for frontend and backend.
3. Block release if critical vulnerabilities remain unresolved.

## Security Acceptance for V1 Release

1. RLS access tests pass.
2. Unauthorized API access tests pass.
3. Secret exposure checks pass.
4. Artifact access control checks pass.
