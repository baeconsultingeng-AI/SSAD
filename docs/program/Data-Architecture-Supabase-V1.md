# Data Architecture - Supabase (Version 1)

## Purpose

Define relational data model required for V1 BS workflows with deterministic replay.

## Core Tables

1. users
- id (uuid, pk)
- email (text, unique)
- full_name (text)
- tier (text: free, trial, pro)
- created_at (timestamptz)
- updated_at (timestamptz)

2. projects
- id (uuid, pk)
- user_id (uuid, fk -> users.id)
- name (text)
- description (text)
- status (text)
- created_at (timestamptz)
- updated_at (timestamptz)

3. elements
- id (uuid, pk)
- project_id (uuid, fk -> projects.id)
- element_type (text)
- element_name (text)
- code (text)
- version (text)
- metadata (jsonb)
- created_at (timestamptz)
- updated_at (timestamptz)

4. calculation_runs
- id (uuid, pk)
- project_id (uuid, fk -> projects.id)
- element_id (uuid, fk -> elements.id)
- request_id (text, unique)
- module (text)
- code (text)
- version (text)
- status (text)
- normalized_inputs (jsonb)
- result_payload (jsonb)
- warnings (jsonb)
- checks (jsonb)
- created_by (uuid, fk -> users.id)
- created_at (timestamptz)

5. report_artifacts
- id (uuid, pk)
- calculation_run_id (uuid, fk -> calculation_runs.id)
- artifact_type (text: report, detailing, drawing)
- storage_key (text)
- checksum (text)
- created_at (timestamptz)

6. audit_events
- id (uuid, pk)
- user_id (uuid, fk -> users.id)
- project_id (uuid, fk -> projects.id)
- calculation_run_id (uuid, fk -> calculation_runs.id)
- event_type (text)
- event_payload (jsonb)
- created_at (timestamptz)

## Indexing

1. projects(user_id, updated_at desc)
2. elements(project_id, element_type)
3. calculation_runs(project_id, created_at desc)
4. calculation_runs(request_id)
5. audit_events(project_id, created_at desc)

## Row-Level Security (RLS)

1. users can access only their own projects.
2. project-linked records are accessible only to project owner.
3. service role can perform administrative or migration actions.

## Replay Contract

1. calculation_runs.normalized_inputs stores canonical request snapshot.
2. calculation_runs.result_payload stores canonical deterministic output.
3. request_id + module + code + version uniquely identify compute context.

## Retention

1. calculation payloads retained for audit and reproducibility.
2. artifact metadata retained in database; binary files retained in R2.
