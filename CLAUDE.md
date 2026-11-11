# CLAUDE.md — DEADLINE DEVELOPMENT GUIDE & HANDOVER

> **Product:** Deadline  
> **Version:** `v0.1.0-alpha`  
> **Founder:** Jeet Satasiya  
> **License:** MIT  
> **Tagline:** *Work. Build. Deliver.*  
> **Core Philosophy:** *"The output matters more than the activity."*

---

## 1. Project Overview & Philosophy

Deadline is an execution-first, open-source productivity platform designed to help students, developers, freelancers, and professionals deliver tangible outputs before their cutoff date.

Traditional project management tools focus on tickets, boards, and activity tracking. Deadline focuses relentlessly on the **final output**.

Every deadline answers six fundamental questions:
1. **What do I need to deliver?** (Tangible expected output)
2. **What is the deadline?** (Hard cutoff date and time)
3. **What is the minimum acceptable output?** (The emergency fallback MVP to prevent zero-output failure)
4. **How should I approach building it?** (Prototype First, Output Only, or Guided Execution)
5. **What do I need to do to finish it?** (Milestones on the critical path)
6. **Where is my final deliverable?** (Submitted URL, repository, or archive)

---

## 2. Instructions for Claude Code

### ⚠️ Rules of Engagement
1. **Do NOT rewrite existing code:** Do not rewrite or replace working components, stores, utilities, or architectures without an explicit engineering requirement.
2. **Inspect before modifying:** Read and understand the existing codebase, domain types, Zustand store, storage adapters, and tests before making changes.
3. **Preserve backward compatibility:** Keep all existing domain models, storage interfaces, and 7-step wizard workflows functional.
4. **DO NOT invent prototype categories:** The prototype registry architecture is fully prepared, but the concrete prototype categories and specs will be provided separately by the founder (**Jeet Satasiya**). Do not speculate or invent category schemas.
5. **Incremental development:** Write automated tests (`Vitest`) and update documentation (`CHANGELOG.md`, `README.md`) for every significant feature.
6. **Provider-independence:** The platform must remain open-source, vendor-neutral, and capable of running completely offline without mandatory third-party accounts.

---

## 3. Technology Stack & Quality Standards

- **Frontend:** React 18.3, TypeScript 5.6 (strict mode), Vite 5.4.
- **Styling:** Tailwind CSS 3.4, minimal Linear/Raycast/Apple aesthetic, dark/light theme support.
- **State Management:** Zustand 5.0 (`src/store/useDeadlineStore.ts`).
- **Persistence:** Modular `IStorageAdapter` interface (`src/services/storage/IStorageAdapter.ts`) implemented via `LocalStorageAdapter`.
- **Audio Feedback:** Synthesized Web Audio API harmonic chords (`src/lib/audio.ts`) with zero external assets.
- **Testing:** Vitest 2.1 (`npm test` — 36 tests passing across 6 suites).
- **Linter & CI:** ESLint 10 (`npm run lint`), GitHub Actions (`.github/workflows/ci.yml`).

---

## 4. Key CLI Commands

```bash
# Start local development server (port 3000)
npm run dev

# Run automated tests
npm test

# Run ESLint check
npm run lint

# TypeScript strict type check
npx tsc -b

# Production build
npm run build
```

---

## 5. Architectural Map

```
src/
├── core/
│   ├── execution/
│   │   ├── index.ts                  # Execution engine (bottlenecks, velocity scoring, triage)
│   │   └── execution.test.ts         # Execution engine unit tests
│   └── prototype/
│       ├── index.ts                  # Extensible Prototype Registry (IPrototypeRegistry, PrototypeTypeDefinition, IPrototypeExecutionAdapter)
│       ├── prototype.test.ts         # Basic registry test
│       └── productExperience.test.ts # Comprehensive product flow, filtering, adapter, and export tests
├── services/
│   └── storage/
│       ├── IStorageAdapter.ts        # Pluggable persistence contract (get, save, delete, export, import)
│       ├── LocalStorageAdapter.ts    # Robust LocalStorage implementation with versioning
│       ├── seedData.ts               # Realistic initial state (Calculator App demo scenario)
│       └── functionalFlows.test.ts   # LocalStorage & full lifecycle tests
├── store/
│   └── useDeadlineStore.ts           # Central Zustand store with async dispatchers and audio chimes
├── types/
│   └── index.ts                      # Strict TypeScript types (Deadline, Deliverable, Milestone, ExecutionApproach)
├── components/
│   ├── ui/                           # Primitives (Badge, Button, CountdownTimer, ProgressBar, Modal, Input, Textarea)
│   ├── layout/                       # Collapsible Sidebar, Command Header, Quick Search, Mobile Drawer
│   ├── dashboard/                    # Velocity Command Dashboard & Urgency Radar
│   ├── deadline/
│   │   ├── CreateDeadlineModal.tsx   # 7-Step Deadline Creation Wizard
│   │   ├── DeadlineCard.tsx          # Card component with countdown, tags, and progress
│   │   └── MyDeadlinesView.tsx       # Filtering, sorting, and view toggle (grid vs list)
│   ├── workspace/
│   │   └── DeadlineWorkspace.tsx     # Dedicated workspace (target output focal point, MVP card, milestones, scratchpad)
│   ├── deliverables/
│   │   ├── DeliverablesHub.tsx       # Hub showing completed outputs with verification notes
│   │   └── SubmitDeliverableModal.tsx# Final delivery submission gateway
│   ├── analytics/
│   │   └── AnalyticsView.tsx         # Recharts delivery velocity and priority charts
│   └── settings/
│       └── SettingsView.tsx          # Dark/light theme, JSON backup/restore, storage inspection
├── lib/
│   ├── utils.ts                      # Date handling (DST-safe epoch diffs), formatTimeRemaining, Markdown report generator
│   ├── utils.test.ts                 # Utility function tests
│   ├── dateValidation.test.ts        # Comprehensive timezone and DST tests
│   └── audio.ts                      # Synthesized Web Audio harmonic feedback
├── App.tsx                           # Application shell, view routing, keyboard shortcuts
└── main.tsx                          # React 18 DOM mount
```

---

## 6. Current Implementation Status

### Implemented Features (Phase 1 / ~30% Foundation)
1. **Velocity Command Dashboard**: Statistics (Active, Due Today, Due Tomorrow, Completed, Overdue, Delivery Rate) and Urgency Radar.
2. **7-Step Deadline Creation Experience**:
   - Step 1: Define Work (Name, Context, Plain-language expected output).
   - Step 2: Deliverable Category (`software`, `presentation`, `assignment`, `research_paper`, `report`, `design`, `video`, `other`).
   - Step 3: Execution Approach (`prototype_first`, `output_only`, `guided_execution`).
   - Step 4: Prototype Selection Architecture (Registry-driven with category filtering and empty state).
   - Step 5: Define Success (Expected Final Output vs. Minimum Acceptable Output MVP fallback).
   - Step 6: Schedule & Priority (Local calendar date, cutoff time, priority, tags, reference links).
   - Step 7: Review & Confirm with step-jump editing.
3. **Dedicated Workspace**: Target Output focal point, Prototype First banner, Fallback MVP card, live monotonic countdown, milestone checklist with <kbd>▲</kbd>/<kbd>▼</kbd> reordering, auto-saving scratchpad, and Markdown report export.
4. **Deliverable Submission Gateway**: Distinct submission flow for live URLs, repos, and files with verification notes.
5. **Data Resilience**: Full JSON backup and restore, LocalStorage versioning, DST-safe date calculations.

### Current Limitations (Next Phases)
- Concrete prototype blueprints have not yet been registered (intentionally deferred until the founder provides specifications).
- No automated scaffold generators or sandbox execution runners.
- No AI provider integrations.
- No remote cloud databases (persistence is LocalStorage; `IStorageAdapter` is ready for Supabase).
- No user authentication or multi-tenant team collaboration.

---

## 7. Product Direction for Claude Code

When the founder supplies the prototype category specifications:
1. **Register Prototype Blueprints**: Hook new blueprint definitions into `prototypeRegistry` (`src/core/prototype/index.ts`) matching deliverable categories.
2. **Prototype Workflows**: Expand the `IPrototypeExecutionAdapter` to support interactive scaffolding, guidance, and verification.
3. **Output Generation**: Build structured output generators and verification checks.
4. **Optional AI Integrations**: Design provider-agnostic execution assistance (OpenAI, Anthropic, Gemini, local models) with user-provided API keys.
5. **Deliverable Verification**: Enhance submission validation to confirm that artifacts satisfy the Expected Output and MVP criteria.
