# Deadline

<div align="center">

```
  ██████╗ ███████╗ █████╗ ██████╗ ██╗     ██╗███╗   ██╗███████╗
  ██╔══██╗██╔════╝██╔══██╗██╔══██╗██║     ██║████╗  ██║██╔════╝
  ██║  ██║█████╗  ███████║██║  ██║██║     ██║██╔██╗ ██║█████╗  
  ██║  ██║██╔══╝  ██╔══██║██║  ██║██║     ██║██║╚██╗██║██╔══╝  
  ██████╔╝███████╗██║  ██║██████╔╝███████╗██║██║ ╚████║███████╗
  ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝╚══════╝
```

### **Work. Build. Deliver.**

An early-stage, open-source deadline execution platform built on the fundamental philosophy:  
**The output matters more than the activity.**

[![Version](https://img.shields.io/badge/version-0.1.0--alpha-blue.svg)](package.json)
[![Status](https://img.shields.io/badge/status-early--stage%20functional%20prototype-orange.svg)](#-development-status)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![CI](https://github.com/your-username/deadline/actions/workflows/ci.yml/badge.svg)](.github/workflows/ci.yml)

</div>

---

> [!IMPORTANT]
> **Version:** `0.1.0-alpha`  
> **Status:** Early-stage functional prototype (~30% initial foundation).  
> **Subsequent Development:** Prepared for next-stage enhancement with Claude Code.  
> *Do not expect full platform services (cloud databases, authentication, AI generators) in this release.*

---

## 💡 What is Deadline & Why Does It Exist?

Traditional project management software is built around **activity tracking**: moving cards across Kanban columns, logging hours, tagging subtasks, and generating endless burndown charts. This creates an illusion of productivity while the clock runs down.

**Deadline rejects this paradigm.**

The output matters more than the activity.

Deadline is designed for students, software engineers, freelancers, founders, and professionals who have hard delivery deadlines. It helps users answer six vital questions:

1. **What do I need to deliver?** (The tangible final output)
2. **What is the deadline?** (The exact cutoff date and time)
3. **What is the minimum acceptable output?** (The fallback MVP to prevent zero-output failure)
4. **How should I approach building it?** (Prototype First, Output Only, or Guided Execution)
5. **What do I need to do to finish it?** (Milestones along the critical path)
6. **Where is my final deliverable?** (The published URL, source repository, or document archive)

---

## 🧠 Core Conceptual Framework

To maintain absolute clarity, Deadline establishes precise distinctions between core concepts:

| Concept | Purpose | Example |
|:---|:---|:---|
| **Deliverable Category** | The medium of the output | `Software / Application`, `Presentation`, `College Assignment`, `Research Paper`, `Report`, `Design`, `Video` |
| **Execution Approach** | The tactical delivery strategy | `Prototype First` (prove working prototype before expanding), `Output Only` (direct focus), `Guided Execution` (phased milestones) |
| **Prototype Type** | Blueprint from the extensible prototype registry | Registry-driven templates (with future category-specific scaffold generators) |
| **Expected Output** | The primary goal ("What done looks like") | *"A working calculator application deployed to Vercel with clean operations."* |
| **Minimum Acceptable Output** | The emergency fallback MVP | *"Basic arithmetic calculator supporting +, -, \*, / without crashing."* |

---

## 🖥️ Visual Interface Overview

### 1. Velocity Command Dashboard & Urgency Radar

```
+-----------------------------------------------------------------------------------------+
| DEADLINE  [⌘K Search...]                   [☀️/🌙] [Export .md] [+ New Deadline (N)]     |
+-----------------------------------------------------------------------------------------+
| ACTIVE DEADLINES: 3    | DUE TODAY: 0    | DUE TOMORROW: 1    | DELIVERY RATE: 80%      |
+-----------------------------------------------------------------------------------------+
| CRITICAL ATTENTION RADAR                                                                |
| [!] Calculator Application                                           DUE TOMORROW 23:59 |
|     Target: A working calculator application.                        [ 23h 24m left ]   |
|     Fallback MVP: Basic arithmetic calculator.                       Progress: [||||..] |
|     Approach: Prototype First (Proving core operations first)        Priority: CRITICAL |
+-----------------------------------------------------------------------------------------+
| ACTIVE WORKSPACES                                     | VELOCITY & PRIORITY CHARTS      |
| • Calculator Application (Software)    75% [|||||.]   | Critical: 1   High: 1  Med: 1   |
| • Series Seed Slide Deck (Pres)        40% [|||...]   | Completion Rate: 80%            |
+-----------------------------------------------------------------------------------------+
```

### 2. 7-Step Guided Creation Experience

```
STEP 1: Define Work         --> STEP 2: Category             --> STEP 3: Approach
(Name, Context, Output)         (Software, Deck, Paper...)       (Prototype First / Guided)
                                                                            │
STEP 6: Schedule & Cutoff   <-- STEP 5: Success Criteria     <-- STEP 4: Prototype Blueprint
(Calendar, Time, Priority)      (Target Output vs. Fallback MVP) (Registry Discovery / Empty State)
         │
         ▼
STEP 7: Review & Confirm    --> START EXECUTION (Generate Workspace)
```

### 3. Dedicated Project Workspace

```
+-----------------------------------------------------------------------------------------+
| < Back to List   [CRITICAL] [IN PROGRESS] [PROTOTYPE FIRST]      [Export .md] [Submit]  |
+-----------------------------------------------------------------------------------------+
| Calculator Application                                       LIVE COUNTDOWN TIMER       |
| Due Nov 12, 2026 at 23:59 • Software                         [  23h 24m 12s left  ]     |
+-----------------------------------------------------------------------------------------+
| ⚡ PROTOTYPE FIRST PROTOCOL ACTIVE                                                      |
| Objective: Build the minimum working prototype before adding bells and whistles.        |
+-----------------------------------------------------------------------------------------+
| 🎯 TARGET OUTPUT (PRIMARY GOAL)          | ⚠️ MINIMUM ACCEPTABLE OUTPUT (MVP FALLBACK)  |
| "A working calculator application        | "Basic arithmetic calculator supporting       |
|  deployed with arithmetic shortcuts."    |  +, -, *, / without crash." (Prevents 0-output) |
+-----------------------------------------------------------------------------------------+
| CRITICAL PATH MILESTONES [Reorder ▲/▼]   | EXECUTION SCRATCHPAD (Auto-Saving)           |
| [x] 1. Scaffold arithmetic core logic    | "Architecture notes: Keyboard event listener |
| [x] 2. Build responsive keypad UI        |  handles Keypad 0-9 and operators..."        |
| [ ] 3. Deploy live prototype to Vercel   |                                              |
| Progress: 75% [==================....]   | Harmonic audio chime on milestone check!     |
+-----------------------------------------------------------------------------------------+
```

---

## 📱 Primary Demonstration Scenario: College Calculator Application

To experience the core product concept end-to-end:

```
Scenario: A university student has an urgent deadline due tomorrow at 11:59 PM.
Project: Calculator Application
Deliverable Category: Software / Application
Execution Approach: Prototype First
Expected Output: A working calculator application.
Minimum Acceptable Output: Basic arithmetic calculator.
Deadline: Tomorrow at 23:59 (Priority: Critical)
```

### How to reproduce this scenario:
1. Launch the application (`npm run dev`).
2. The dashboard loads pre-seeded demonstration data highlighting the **Calculator Application** with 23h+ remaining.
3. Click into the **Calculator Application** workspace:
   - Notice the **Target Output** visual focal point.
   - Observe the **Minimum Acceptable Output (MVP Fallback)** guardrail card.
   - Check off milestone **3. Deploy live prototype to Vercel** (enjoy the harmonic Web Audio completion chime).
   - Click **Submit Deliverable** to enter the deployment URL (`https://calculator-demo.vercel.app`) and acceptance notes.
   - Verify the deliverable in the **Deliverables Hub**.
   - Click **Export Report (.md)** to download a formatted Markdown status report.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|:---|:---|
| **Framework & Language** | [React 18.3](https://react.dev/), [TypeScript 5.6](https://www.typescriptlang.org/), [Vite 5.4](https://vitejs.dev/) |
| **Styling & Design System** | [Tailwind CSS 3.4](https://tailwindcss.com/), Linear/Raycast/Apple minimal aesthetic, Dark & Light modes |
| **State Management** | [Zustand 5.0](https://github.com/pmndrs/zustand) with async store dispatchers |
| **Visualizations** | [Recharts 2.13](https://recharts.org/) (Delivery velocity and priority distribution) |
| **Icons & Animation** | [Lucide React](https://lucide.dev/), [Framer Motion 11.11](https://www.framer.com/motion/) |
| **Audio Feedback** | Native Web Audio API synthesized harmonics (zero external audio files or network requests) |
| **Persistence Layer** | Modular `IStorageAdapter` interface with robust `LocalStorageAdapter` and JSON export/import |
| **Quality & CI** | [Vitest 2.1](https://vitest.dev/), [ESLint 10](https://eslint.org/), GitHub Actions CI |

---

## 🏛️ Codebase Architecture

```
src/
├── core/
│   ├── execution/          # Execution engine (bottlenecks, MVP triage, velocity scoring)
│   └── prototype/          # Extensible Prototype Registry (IDs, schemas, enable/disable, discovery)
├── services/
│   └── storage/            # Pluggable persistence layer (IStorageAdapter, LocalStorageAdapter, seedData)
├── store/
│   └── useDeadlineStore.ts # Central Zustand store with audio feedback and async dispatchers
├── types/
│   └── index.ts            # Domain models (Deadline, Deliverable, Milestone, ExecutionApproach)
├── components/
│   ├── ui/                 # Reusable UI primitives (Badge, Button, CountdownTimer, ProgressBar, Modal, Input, Textarea)
│   ├── layout/             # Collapsible Sidebar, Command Header, Quick Search Popover, Mobile Drawer
│   ├── dashboard/          # Velocity Command Dashboard & Urgency Radar
│   ├── deadline/           # 7-Step CreateDeadlineModal, DeadlineCard, MyDeadlinesView
│   ├── workspace/          # Dedicated project workspace, live countdown, milestones, scratchpad, report export
│   ├── deliverables/       # Deliverables Hub & Final Submission Modal
│   ├── analytics/          # Recharts velocity & priority distribution charts
│   └── settings/           # Appearance toggle, JSON backup/import, storage inspection
├── lib/
│   ├── utils.ts            # Date handling, formatTimeRemaining (DST-safe), Markdown report generator
│   └── audio.ts            # Synthesized Web Audio harmonic chimes
├── App.tsx                 # Root application shell & keyboard routing
└── main.tsx                # React 18 DOM mount
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| <kbd>N</kbd> or <kbd>⌘</kbd>+<kbd>N</kbd> | Open 7-Step Deadline Creator |
| <kbd>⌘</kbd>+<kbd>K</kbd> | Focus Instant Search |
| <kbd>Esc</kbd> | Close Active Modal / Popover |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (`v18.0.0` or higher)
- `npm` (`v9.0.0` or higher)

### Setup & Development

```bash
# 1. Clone the repository
git clone https://github.com/your-username/deadline.git
cd deadline

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
# Open http://localhost:3000 in your browser

# 4. Run automated test suite (36 tests)
npm test

# 5. Run linter
npm run lint

# 6. Check TypeScript types
npx tsc -b

# 7. Build production bundle
npm run build
```

---

## 🗺️ Product Roadmap

```
PHASE 1 (Completed — 0.1.0-alpha)
├── Core Execution Engine & Velocity Calculations
├── 7-Step Guided Creation Experience
├── Prototype Registry Architecture & Category Discovery
├── Dedicated Workspace with Target Output Visual Focal Point
├── Fallback MVP Guardrail Card & Milestone Reordering
├── Web Audio Harmonic Chimes & Markdown Report Export
└── LocalStorage Persistence & Full JSON Backup/Restore

PHASE 2 (Claude Code / Upcoming)
├── Deliverable-Specific Prototype Blueprints (User-Defined Categories)
├── Interactive Code/Prototype Sandbox Integration
├── Automated Scaffolding Adapters
└── Template Library Expansion

PHASE 3 (Future Vision)
├── Remote Cloud Persistence (Supabase / PostgreSQL)
├── Multi-User Authentication & Teams
└── Notification Integrations (Calendar / Webhooks / Discord / Slack)
```

---

## 📌 Development Status & Scope Guardrails

Deadline is in **`v0.1.0-alpha`**. This release delivers approximately the first **30% of the platform** to establish a rock-solid, production-grade foundation.

### What is fully implemented:
- Complete frontend application and user experience.
- Full 7-step deadline creation wizard.
- LocalStorage persistence with seed data and JSON export/import.
- Dynamic prototype registry architecture with discovery and category filtering.
- Milestone reordering, auto-saving notes, deliverable submission portal, and Markdown report generator.
- 100% automated test coverage across 6 test suites (36 passing tests).

### What is intentionally deferred:
- Cloud databases (Supabase / PostgreSQL) — *the persistence adapter layer is fully isolated for seamless future swapping*.
- Multi-user authentication & user accounts.
- Automated code generators, AI APIs, and LLM integrations.
- Hardcoded prototype blueprint catalogs (categories will be supplied by the user in Phase 2).

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 **Jeet Satasiya**.
