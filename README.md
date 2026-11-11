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

An open-source deadline execution platform built on the fundamental philosophy:  
**The output matters more than the activity.**

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

---

## 💡 The Philosophy

Traditional task management platforms drown users in endless to-do lists, sub-tasks, and activity metrics that generate a false sense of productivity.

**Deadline rejects this paradigm.**

Deadline exists to help individuals, students, engineers, founders, and professionals execute deliverables before time runs out.

- **Activity** is attending meetings, moving tickets, reorganizing backlogs.
- **Output** is the working calculator prototype, the 8-page IEEE conference paper, the deployed feature, the investor pitch deck.

Users define what they must deliver, when it is due, and execute systematically toward that tangible result.

---

## ✨ Features (Phase 1 / 30% Foundation)

### 1. High-Craft Dashboard
- **Statistics & Urgency Radar:** Live metrics tracking Total, Active, Due Today, Due Tomorrow, Overdue, and On-Time Delivery Rate.
- **Active Work Feed:** Instant visibility into projects currently in flight.
- **Live Countdown Timers:** Precision millisecond-aware countdowns displaying days, hours, minutes, and seconds with urgency color shifts (Overdue red, <24h warning, on-time emerald).
- **Recent Activity Audit:** Real-time log tracking milestone completions, progress adjustments, and deliverable submissions.

### 2. Rapid Deadline Creation & Management
- Fast, streamlined creation workflow without forcing unnecessary subtasks.
- Plain-language **Target Output** specification.
- Optional **Minimum Acceptable Output (MVP)** definition for high-pressure triage.
- Priority levels: `Critical`, `High`, `Medium`, `Low`.
- Deliverable classifications: `Working Prototype`, `Software Feature`, `Presentation`, `Research Paper`, `Assignment`, `Report`, `Design Assets`, etc.
- Dynamic reference links and spec attachments.
- Full editing and deletion support.

### 3. Dedicated Deadline Detail Workspace
- **Target Deliverable Callout:** Constant visual anchor on the expected output.
- **Execution Progress Engine:** Dynamic percentage tracking computed from milestone completions or manual slider overrides with quick presets (0%, 25%, 50%, 75%, 100%).
- **Interactive Milestones Checklist:** Add milestones, set target dates, toggle completion with auto-recalculation.
- **Execution Scratchpad:** Auto-saving technical notes and architectural specs with local persistence status.
- **Reference Links & Assets Hub:** Direct clickable repository, documentation, and asset links.

### 4. Distinct Final Submission Protocol
- Clean architectural separation between *working on a deliverable* and *submitting the final deliverable*.
- Submissions support:
  - Live URLs (Vercel, preview deployments, demo links)
  - Source Code Repositories (GitHub, GitLab)
  - Documents & Papers (PDFs, Overleaf links)
  - File Reference Archives & Metadata
- Submission verification and acceptance notes.
- Ability to reopen execution if revisions are requested.

### 5. Deliverables Hub
- Cross-project deliverable repository with status tabs ("Delivered Outputs" vs "Awaiting Output").
- Quick links to inspect source repositories, deployed apps, and verification notes.

### 6. Analytics & Execution Velocity
- Delivery success rate percentage.
- Deadlines by priority distribution (Recharts).
- Deliverable medium breakdown (Prototypes, Software, Papers, Decks).

### 7. Modular Persistence Layer
- Pluggable `IStorageAdapter` architecture.
- Ships with `LocalStorageAdapter` for zero-setup local persistence.
- Ready for seamless plug-in of Supabase / PostgreSQL in Phase 2 without rewriting UI components.
- Data export (JSON backup), data import, and sample data restoration.

---

## 🏗️ Architecture

```
src/
├── core/
│   ├── execution/          # Execution engine (bottlenecks, velocity, MVP calculation)
│   └── prototype/          # Extensible prototype registry and category hooks
├── services/
│   └── storage/            # Modular persistence layer (IStorageAdapter, LocalStorageAdapter, seedData)
├── store/
│   └── useDeadlineStore.ts # Zustand global store (navigation, deadlines, user, actions)
├── types/
│   └── index.ts            # Clean TypeScript domain models (Deadline, Milestone, Deliverable, User)
├── components/
│   ├── ui/                 # Minimalist design system primitives (Button, Input, Modal, Badge, CountdownTimer, ProgressBar)
│   ├── layout/             # Collapsible Sidebar, Header, Mobile Drawer
│   ├── dashboard/          # Dashboard overview, stats, critical attention radar
│   ├── deadline/           # DeadlineCard, CreateDeadlineModal, MyDeadlinesView
│   ├── workspace/          # Dedicated project workspace, countdown, milestones, scratchpad
│   ├── deliverables/       # DeliverablesView, SubmitDeliverableModal
│   ├── analytics/          # Execution velocity and Recharts analytics
│   └── settings/           # Theme switcher, JSON export/import, persistence status
├── lib/
│   └── utils.ts            # Formatting, time calculation, cn helper
├── App.tsx                 # Root application shell & keyboard routing
└── main.tsx                # DOM entrypoint
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|:---|:---|
| <kbd>N</kbd> or <kbd>⌘</kbd>+<kbd>N</kbd> | Open New Deadline Modal |
| <kbd>⌘</kbd>+<kbd>K</kbd> | Focus Global Search Bar |
| <kbd>Esc</kbd> | Close Active Modal / Drawer |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- `npm`, `pnpm`, or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/deadline.git
   cd deadline
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview production build:**
   ```bash
   npm run preview
   ```

---

## 🎨 Design Direction

The UI is inspired by the craftsmanship of **Linear**, **Raycast**, **Notion**, **Vercel**, and **Apple**:
- Minimalist, distraction-free aesthetic.
- Monospace typography for time calculations and status codes.
- High-contrast Dark Mode and crisp Light Mode.
- Restrained color semantics:
  - 🔴 **Red:** Critical / Overdue
  - 🟠 **Orange:** In Progress / Deadline Brand Accent
  - 🟡 **Amber:** High Priority / Due Soon (<24h)
  - 🔵 **Blue:** Medium Priority
  - 🟢 **Emerald:** Low Priority / Delivered & Verified

---

## 🗺️ Roadmap

- [x] **Phase 1 (Current - 30%): Foundation & Core Execution**
  - Application foundation & design system
  - Dashboard with live statistics and countdowns
  - Deadline creation, editing, and deletion
  - Dedicated deadline detail workspace
  - Milestone checklist with progress recalculation
  - Final deliverable submission interface
  - Deliverable Hub
  - Extensible prototype architecture
  - Modular storage abstraction with LocalStorageAdapter
  - Export / Import data capability
- [ ] **Phase 2: Remote Persistence & Collaboration**
  - Supabase / PostgreSQL backend integration
  - Multi-user authentication & teams
  - Prototype categories expansion
  - Webhook notifications for approaching deadlines
- [ ] **Phase 3: Autonomous Execution Agents**
  - AI Execution copilot for breaking complex deliverables into critical paths
  - Automated prototype sanity checks
  - Submission preflight validation

---

## 🤝 Contributing

Contributions are warmly welcomed! Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

Copyright (c) 2026 **Jeet Satasiya**.
