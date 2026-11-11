# Changelog

All notable changes to the **Deadline** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0-alpha] - 2026-11-12

### Milestone Release: Product Experience & Prototype Architecture

#### Added
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

