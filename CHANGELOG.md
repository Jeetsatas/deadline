# Changelog

All notable changes to the **Deadline** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-11-11

### Initial Release (Phase 1 / 30% Foundation)

#### Added
- **Core Platform Architecture:**
  - Scalable React 18 + TypeScript + Vite + Tailwind CSS foundation.
  - Linear/Raycast-inspired design system with dark and light mode support.
  - Clean modular persistence layer (`IStorageAdapter`) with initial `LocalStorageAdapter`.
  - Extensible prototype architecture (`src/core/prototype`) prepared for future category specifications.
  - Execution engine foundation (`src/core/execution`) calculating progress, bottleneck identification, and minimum acceptable output priority.

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
