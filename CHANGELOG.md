# Changelog

All notable changes to the **Deadline** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-alpha] - 2026-11-12

### Milestone Release: Product Experience & Prototype Architecture

#### Added
- **Dynamic AI Model Discovery System:**
  - Implemented provider-agnostic `IModelDiscoveryService` and `ModelDiscoveryService` (`src/core/ai/ModelDiscoveryService.ts`) for dynamic model fetching and runtime availability validation.
  - Upgraded Google Gemini provider to query official endpoint `GET https://generativelanguage.googleapis.com/v1beta/models` using the user's `x-goog-api-key`.
  - Removed all hardcoded model fallback lists (`DEFAULT_GEMINI_MODELS` array removed; `getMetadata().availableModels` defaults to empty `[]`).
  - Strict generation capability filtering: only models with `generateContent` in `supportedGenerationMethods` are included; embedding-only models (`text-embedding-004`) are automatically excluded.
  - Consistent model identifier normalization: all returned model names are stripped of the `models/` prefix across discovery and execution.
  - Safe caching of non-sensitive model metadata (id, displayName, token limits, capabilities) in `localStorage` under `deadline_app_discovered_models_v1` so the UI remembers models across page reloads without touching disk for API keys.
  - Model validation before plan generation: verifies key in active memory, verifies selected model exists in discovered list, and throws exact user-facing error if unavailable: *"The selected model is no longer available for this API key. Refresh models and select another model."*
  - Comprehensive UI states in `AIIntegrationsSettings`: `no_key`, `fetching`, `models_loaded`, `no_compatible_models`, `invalid_key`, `quota_exceeded`, and `network_error` with manual "Refresh Models" button and model count indicator.
  - Automated Vitest test suite (`src/core/ai/modelDiscovery.test.ts`) covering 11 critical discovery, filtering, normalization, error handling, and zero-key-leakage scenarios. Total test suite expanded to 79 passing tests across 9 test files.

- **AI Integration Foundation & Live Providers:**
  - Deliverable-agnostic AI provider abstraction and registry (`IAIProvider`, `IAIProviderRegistry`, `AIExecutionService`).
  - **Google Gemini Provider Adapter:** Genuinely functional live integration supporting Gemini 2.0 Flash, Gemini 2.5 Flash, Gemini 2.0 Flash-Lite, Gemini 1.5 Pro, and Gemini 1.5 Flash, featuring live API connection testing, dynamic model discovery (`fetchAvailableModels`), structured JSON execution plan generation, and robust quota/auth error handling.
  - **Anthropic Provider Adapter:** Genuinely functional integration supporting Claude 3.7 Sonnet, Claude 3.5 Sonnet, and Claude 3.5 Haiku, with connection testing, CORS browser handling, and structured execution plan synthesis.
  - **Provider Interface Scaffolding:** Clean interfaces and model metadata prepared for OpenAI and OpenAI-Compatible endpoints (scheduled for Phase 2).
  - **Deliverable-Agnostic AI Context Builder:** Adapts structured context and specialized system prompts across software, presentations, research papers, assignments, reports, designs, and videos.
  - **Session-Only Security Boundary:** `SessionMemoryCredentialStore` keeps credentials strictly in volatile browser memory; zero keys in LocalStorage, zero keys in JSON exports, full UI masking (`AIzaSy••••••••8f2a`), and endpoint URL validation.
  - **AI Integrations Settings View:** Card-based UI with provider status, model selectors, dynamic live model discovery, custom endpoint URLs, connection testing with latency reporting, and session memory alerts.
  - **Expanded Test Suite:** 66 passing tests across 8 test suites verifying security isolation, context building, provider validation, Gemini connection and plan parsing, and date calculations.

- **Core Product Experience & Multi-Step Wizard:**
  - 7-step guided deadline creation workflow:
    - Step 1: Define Your Work (Project name, context description, plain-language expected output).
    - Step 2: Deliverable Category Selection (Software, Presentation, College Assignment, Research Paper, Report, Graphic, Video, Other).
    - Step 3: Execution Approach Selection (`prototype_first`, `output_only`, `guided_execution`).
    - Step 4: Prototype Selection Architecture (Registry-driven with discovery and graceful empty state).
    - Step 5: Define Success (Expected Final Output vs. Minimum Acceptable Output fallback).
    - Step 6: Schedule & Priority (Local calendar date, cutoff time, priority, tags, reference links).
    - Step 7: Review & Confirm with step-jump navigation before starting execution.
- **Prototype Registry Architecture (`src/core/prototype`):**
  - Unique prototype IDs, display names, and descriptions.
  - Deliverable category filtering (`supportedDeliverables` matched to Step 2 selection).
  - Configuration schema definitions (`configSchema`).
  - Enable/disable toggles (`enableType`, `disableType`).
  - Search discovery (`discover({ deliverableType, query })`).
  - Optional future execution adapter interface (`IPrototypeExecutionAdapter` with `adapterId`, `prepare`, `validateSubmission`).
- **Workspace Enhancements (`src/components/workspace`):**
  - Visual focal point on Target Deliverable (Expected Output).
  - Prototype First Protocol Banner highlighting early output proof.
  - Minimum Acceptable Output (MVP Fallback) guardrail card.
  - Interactive milestone reordering controls (▲ / ▼).
  - Web Audio harmonic chimes on milestone completion and final submission.
  - One-click executive Markdown report export (`.md`).
- **Date & Countdown Resilience:**
  - Strict monotonic epoch diff calculations for DST immunity.
  - Local calendar anchoring (`createIsoFromLocal`, `isDueToday`, `isDueTomorrow`).
  - Reference time support in `formatTimeRemaining` for test stability and refresh persistence.
- **Seed Data Scenario:**
  - College Calculator Application scenario due tomorrow at 11:59 PM with Prototype First approach.

- **Dashboard:**
  - Statistics overview (Total, Active, Due Today, Due Tomorrow, Completed, Overdue, and Delivery Rate).
  - Upcoming and active deadlines with live countdown timers.
  - Critical attention radar highlighting high-risk deliverables.
  - Real-time recent activity stream recording milestone and deliverable events.
  - Quick action launcher.

- **Deadline Creation & Management:**
  - Create, edit, and delete deadlines with required plain-language expected output.
  - Minimum acceptable output (MVP) definition support.
  - Priority levels (`Critical`, `High`, `Medium`, `Low`).
  - Dynamic reference links and spec attachments.
  - Filtering by status, priority, deliverable type, and search query.
  - Grid view and compact list view toggle.

- **Deadline Detail Workspace:**
  - Dedicated workspace with live days/hours/minutes/seconds countdown.
  - Visual target deliverable card and fallback MVP card.
  - Interactive milestones checklist with auto-recalculating completion progress.
  - Interactive execution progress slider with preset buttons (0%, 25%, 50%, 75%, 100%).
  - Auto-saving scratchpad for execution notes and architecture specs.
  - Clickable reference links with external navigation.

- **Deliverable Management & Final Submission:**
  - Clear architectural separation between working on a project and submitting the final deliverable.
  - Support for URL submissions, source code repositories, documents, and file references.
  - Deliverables Hub displaying all submitted project outputs with verification notes.

- **Open Source Standards:**
  - MIT License (Copyright (c) 2026 Jeet Satasiya).
  - README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, .env.example, .gitignore.

