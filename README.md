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

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![CI Status](https://img.shields.io/badge/CI-passing-brightgreen.svg)](.github/workflows/ci.yml)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 💡 What is Deadline & Why Does It Exist?

Traditional project management software is built around activity tracking: moving tickets across boards, logging hours, and generating endless subtasks. This creates a dangerous illusion of progress while the clock runs down.

**Deadline rejects this paradigm.**

Deadline is designed for students, software engineers, freelancers, founders, and professionals who have hard delivery deadlines. It helps users answer six vital questions:

1. **What do I need to deliver?** (The tangible final deliverable)
2. **What is the deadline?** (The exact cutoff date and time)
3. **What is the minimum acceptable output?** (The fallback MVP to prevent zero-output failure)
4. **How should I approach building it?** (Prototype First, Output Only, or Guided Execution)
5. **What do I need to do to finish it?** (Milestones along the critical path)
6. **Where is my final deliverable?** (The published link, source repository, or document archive)

---

## 🚀 Core Product Experience

### 1. Intuitive 7-Step Deadline Creation Experience

Instead of presenting an overwhelming, generic task form, Deadline guides the user through an intuitive multi-step workflow:

1. **STEP 1 — Define your work:** Define project name, description, and the plain-language expected final output.
2. **STEP 2 — Deliverable selection:** Categorize the deliverable medium (Software/Application, Presentation, College Assignment, Research Paper, Report/Document, Image/Graphic, Video, Other).
3. **STEP 3 — Execution approach selection:**
   - **⚡ Prototype First:** Emphasizes building a minimum working prototype before expanding scope. Proves core functionality and avoids last-minute panic.
   - **🎯 Output Only:** For users who already know what needs to be delivered; focuses directly on the target deliverable, MVP fallback, and final submission.
   - **🧭 Guided Execution:** Structured milestone tracking for multi-part projects and complex assignments.
4. **STEP 4 — Prototype selection architecture:** Modular, registry-driven selection interface allowing users to connect a prototype blueprint or proceed with custom execution.
5. **STEP 5 — Define success (Target vs. Fallback MVP):**
   - **Expected Output:** What the user ultimately aims to deliver.
   - **Minimum Acceptable Output:** The smallest acceptable result if time runs short, preventing catastrophic failure.
6. **STEP 6 — Schedule & priority configuration:** Local calendar date, cutoff time, priority band (`Critical`, `High`, `Medium`, `Low`), and reference links.
7. **STEP 7 — Review and confirm:** Comprehensive summary card with step-jump editing prior to starting execution.

---

## 📱 Primary Demonstration Scenario: College Calculator Application

To experience the core product concept end-to-end:

```
Situation: A student has a college deadline tomorrow at 11:59 PM.
Project: Calculator Application
Deliverable Category: Software / Application
Execution Approach: Prototype First
Expected Output: A working calculator application.
Minimum Acceptable Output: Basic arithmetic calculator.
Deadline: Tomorrow at 11:59 PM (Priority: Critical)
```

Upon creation, Deadline generates a dedicated **Project Workspace** featuring:
- **Visual Focal Point:** The Target Deliverable prominently displayed with high contrast.
- **Urgency Radar:** A real-time ticking countdown (Days, Hours, Minutes, Seconds) with automatic urgency shifts (<24h warning, overdue alert).
- **Execution Approach Protocol:** Prominent *Prototype First* callout highlighting that basic arithmetic operations must be proven before implementing memory registers or graphing.
- **Fallback MVP Guardrail:** Explicit reminder of the minimum acceptable deliverable if time runs short.
- **Milestone Checklist:** Reorderable milestone checkpoints with real-time progress recalculation and pleasant harmonic audio feedback upon completion.
- **Deliverable Submission Gateway:** Distinct portal to submit final repository links, live URLs, or files with verification acceptance notes.
- **Executive Report Generator:** Export clean `.md` status reports for professors, managers, or client handoffs.

---

## 🏗️ Architecture

```
src/
├── core/
│   ├── execution/          # Execution engine (bottlenecks, MVP triage, velocity scoring)
│   └── prototype/          # Dynamic Prototype Registry (type definitions, enable/disable, config schemas)
├── services/
│   └── storage/            # Pluggable persistence layer (IStorageAdapter, LocalStorageAdapter, seedData)
├── store/
│   └── useDeadlineStore.ts # Central Zustand store with async dispatchers and sound feedback
├── types/
│   └── index.ts            # Strict TypeScript models (Deadline, Milestone, Deliverable, ExecutionApproach)
├── components/
│   ├── ui/                 # Reusable UI primitives (Badge, Button, CountdownTimer, ProgressBar, Modal, Input, Textarea)
│   ├── layout/             # Collapsible Sidebar, Header with Instant Search Popover, Mobile Drawer
│   ├── dashboard/          # Velocity Command Dashboard & Urgency Radar
│   ├── deadline/           # 7-Step CreateDeadlineModal, DeadlineCard, MyDeadlinesView
│   ├── workspace/          # Dedicated project workspace, live countdown, milestones, scratchpad, report export
│   ├── deliverables/       # Deliverables Hub & Final Submission Modal
│   ├── analytics/          # Recharts velocity & priority distribution charts
│   └── settings/           # Appearance, JSON backup/import, storage inspection
├── lib/
│   ├── utils.ts            # Time remaining calculation, formatting, markdown report generator
│   └── audio.ts            # Synthesized Web Audio harmonic chimes (no external assets)
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

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- `npm` (v9 or higher)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/deadline.git
   cd deadline
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   # App running at http://localhost:3000
   ```

4. **Run automated test suite:**
   ```bash
   npm test
   # 34 tests across 6 test suites
   ```

5. **Run linter:**
   ```bash
   npm run lint
   ```

6. **Build production bundle:**
   ```bash
   npm run build
   ```

---

## 📌 Current Development Status & Limitations

Deadline is currently an **early-stage, functional open-source prototype (Phase 1 / ~30% foundation)**.

### What is currently implemented:
- Full client-side execution workflow with local persistence (`LocalStorageAdapter`).
- 7-step deadline creation wizard with deliverable categories and execution approaches.
- Dedicated Deadline Workspace with live countdown, milestone reordering, and markdown export.
- Dynamic prototype registry architecture ready for category extensions.
- Deliverable Hub with submission verification records.
- 100% automated test coverage for core workflows, date handling, and prototype selection.

### What is intentionally deferred to later phases:
- Remote database backends (Supabase / PostgreSQL).
- Multi-user authentication & teams.
- Automated code generators, AI agents, and LLM APIs.
- Cloud file storage and production deployment pipelines.

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 **Jeet Satasiya**.
