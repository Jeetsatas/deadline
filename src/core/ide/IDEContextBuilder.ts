import { IDEExecutionContext, IDEProviderId } from './types';

export class IDEContextBuilder {
  /**
   * Generates canonical, universal DEADLINE_CONTEXT.md document.
   * Free of API keys, preserving approved plan, expectations, milestones, and fallback MVP.
   */
  static buildDeadlineContextMarkdown(context: IDEExecutionContext): string {
    const timestamp = new Date().toISOString();
    const plan = context.approvedPlan;
    const approachLabel =
      context.executionApproach === 'prototype_first'
        ? 'Prototype First Protocol (Build working core MVP before expanding)'
        : context.executionApproach === 'output_only'
        ? 'Output Only Protocol (Laser-focused on final deliverable, zero fluff)'
        : 'Guided Execution Protocol (Step-by-step sequential milestones)';

    const milestonesList =
      context.milestones && context.milestones.length > 0
        ? context.milestones
            .map(
              (m) =>
                `- [${m.isCompleted ? 'x' : ' '}] **Milestone ${m.order}: ${m.title}**${
                  m.isCriticalPath ? ' *(Critical Path)*' : ''
                }\n  ${m.description || 'Deliver concrete operational verification.'}`
            )
            .join('\n')
        : '- [ ] **Milestone 1: Scaffold & Implement Core Functionality**\n  Verify minimal viable operational state.';

    const resourcesList =
      context.requiredResources && context.requiredResources.length > 0
        ? context.requiredResources.map((r) => `- ${r}`).join('\n')
        : '- Standard development environment';

    return `# DEADLINE EXECUTION CONTEXT

> **Product:** Deadline | *Work. Build. Deliver.*  
> **Core philosophy:** The output matters more than the activity.  
> **Document:** Canonical Execution Package  
> **Generated:** ${timestamp}  
> **Deadline ID:** \`${context.deadlineId}\`

---

## 1. Project & Deliverable Overview

- **Project Name:** ${context.deadlineTitle}
- **Deliverable Category:** \`${context.deliverableCategory}\`
- **Priority:** **${context.priority.toUpperCase()}**
- **Due Date:** ${context.dueDate}${context.dueTime ? ` at ${context.dueTime}` : ''}
- **Execution Protocol:** ${approachLabel}

### Target Deliverable (Expected Output)
${context.expectedOutput}

### Minimum Acceptable Output (Fallback MVP)
${context.minimumAcceptableOutput || context.expectedOutput}
${context.userInstructions ? `\n### Developer Focus & Custom Instructions\n${context.userInstructions}\n` : ''}
---

## 2. Tactical Understanding & Suggested Approach

### Task Understanding
${plan?.taskUnderstanding || context.description || 'Execute deliverable specifications with production quality.'}

### Suggested Technical Approach
${plan?.suggestedApproach || 'Construct minimal viable core first, test operations, then build complete deliverable interface.'}

---

## 3. Execution Milestones & Acceptance Criteria

${milestonesList}

---

## 4. Required Resources & Tooling

${resourcesList}

---

## 5. FIRST ACTIONABLE STEP (Immediate Execution Trigger)

> ⚡ **${plan?.firstActionableStep || context.firstActionableStep || 'Initialize core file structure and write first operational unit test.'}**

---

## 6. Execution Rules for Coding Agents & IDEs

1. **Focus on the Deliverable:** Do not get trapped in speculative refactoring. Keep changes tight and verified.
2. **Preserve Repository Integrity:** Do not remove or overwrite existing documentation, \`CLAUDE.md\`, \`.cursorrules\`, or configuration files without explicit developer instructions.
3. **Verify Before Completion:** After completing code changes, run the test suite or verify that the deliverable satisfies the acceptance criteria above.
4. **Mark Deliverable Done in Deadline:** Once work is ready, return to the Deadline workspace to verify changes and record completion.

---
*Generated automatically by Deadline. API keys and credentials are never stored in project files.*
`;
  }

  /**
   * Crafts an initial execution prompt suited for the specific coding agent / IDE.
   */
  static buildInitialPrompt(context: IDEExecutionContext, providerId: IDEProviderId): string {
    const firstStep = context.approvedPlan?.firstActionableStep || context.firstActionableStep || 'Scaffold the project';
    switch (providerId) {
      case 'claude_code':
        return `Please read DEADLINE_CONTEXT.md. Our goal is to deliver "${context.deadlineTitle}". Start immediately with the first actionable step: "${firstStep}".`;
      case 'codex':
        return `Read DEADLINE_CONTEXT.md. Execute deadline "${context.deadlineTitle}". First actionable step: "${firstStep}".`;
      case 'antigravity':
        return `Review DEADLINE_CONTEXT.md for "${context.deadlineTitle}". Focus on first actionable step: "${firstStep}".`;
      case 'cursor':
        return `Review DEADLINE_CONTEXT.md to begin executing "${context.deadlineTitle}".`;
      case 'windsurf':
        return `Follow DEADLINE_CONTEXT.md to implement "${context.deadlineTitle}".`;
      default:
        return `Review DEADLINE_CONTEXT.md for project "${context.deadlineTitle}".`;
    }
  }
}
