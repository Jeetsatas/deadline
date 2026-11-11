# Contributing to Deadline

Thank you for your interest in contributing to **Deadline**!

Deadline is an open-source execution platform designed to help people finish work and deliver outputs before time runs out. We appreciate all forms of contribution: feature implementations, bug reports, design polish, and documentation improvements.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Development Workflow

### 1. Fork and Clone
```bash
git clone https://github.com/<your-username>/deadline.git
cd deadline
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

The application will run at `http://localhost:3000`.

### 4. Branching Convention
Create a descriptive branch for your work:
- `feature/your-feature-name`
- `fix/issue-description`
- `docs/documentation-update`

### 5. Type Checking and Build Verification
Before submitting a PR, make sure your code builds without TypeScript errors or warnings:
```bash
npm run build
```

---

## Architecture Principles

When contributing to Deadline, please adhere to these core architectural guidelines:

1. **Output Matters Most:** Design features around *producing deliverables*, not just managing arbitrary tasks.
2. **Modular Persistence:** Keep UI components decoupled from database backends. All storage operations must go through `storageService` / `IStorageAdapter`.
3. **No Decorative Bloat:** Avoid unnecessary animations, gratuitous gradients, and cluttered cards. Keep the design minimalist, crisp, and high-craft (Linear/Raycast aesthetic).
4. **Strong Typing:** All domain models must have explicit TypeScript interfaces in `src/types/index.ts`. Avoid `any`.

---

## Pull Request Guidelines

1. Ensure your PR description clearly explains what problem it solves.
2. Link any relevant GitHub issues.
3. Include screenshots or screen recordings for visual UI changes.
4. Keep PRs focused on a single responsibility.

Thank you for helping build Deadline!

