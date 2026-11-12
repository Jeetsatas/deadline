import { Deadline, DeliverableType } from '@/types';
import { AIContext, IAIContextBuilder } from './types';

/**
 * Deliverable Category Intelligence Profiles
 * Defines the core execution philosophy for each medium.
 * Deadline is NOT just for software — it empowers presentations, research papers,
 * videos, designs, assignments, and reports with the exact same rigor.
 */
const CATEGORY_PROFILES: Record<
  DeliverableType,
  {
    role: string;
    focusAreas: string;
    criticalOutputConstraint: string;
    milestoneGuidance: string;
  }
> = {
  software: {
    role: 'Senior Software Architect and Execution Engineer',
    focusAreas: 'Clean architecture, unit testing, minimal dependencies, operational MVP verification',
    criticalOutputConstraint: 'A running application/feature deployed to a reachable environment with verification tests.',
    milestoneGuidance: '1. Scaffold core logic & verify minimal viable operations. 2. Build UI/key workflows. 3. Deploy & verify against acceptance tests.',
  },
  prototype: {
    role: 'Rapid Prototyping Lead and Systems Designer',
    focusAreas: 'Fast validation, proving core hypothesis, elimination of zero-output failure risk',
    criticalOutputConstraint: 'A functioning prototype proving the core interaction/operation before scope expansion.',
    milestoneGuidance: '1. Implement minimum viable operational prototype. 2. Validate core capability. 3. Polish user-facing deliverable.',
  },
  presentation: {
    role: 'Executive Communications Director & Keynote Presentation Strategist',
    focusAreas: 'Compelling narrative structure, slide pacing, high-contrast visual hierarchy, concise executive takeaway',
    criticalOutputConstraint: 'A complete slide deck (PowerPoint, Keynote, or PDF) delivering a clear message with zero placeholder slides.',
    milestoneGuidance: '1. Define core narrative & slide outline. 2. Draft content for key slides & proof points. 3. Finalize visuals, layout & speaker notes.',
  },
  research_paper: {
    role: 'Principal Academic Researcher & Peer Review Editor',
    focusAreas: 'Scholarly rigor, structured methodology, cited literature, clear discussion and empirical validation',
    criticalOutputConstraint: 'A formatted manuscript/paper (LaTeX or PDF) containing complete abstract, methodology, results, and citations.',
    milestoneGuidance: '1. Formulate problem statement & literature foundation. 2. Detail methodology and empirical findings. 3. Draft abstract, discussion & citations.',
  },
  assignment: {
    role: 'Academic Advisor and Assignment Evaluation Specialist',
    focusAreas: 'Grading rubric compliance, prompt completeness, solution verification, academic clarity',
    criticalOutputConstraint: 'A submitted assignment meeting all rubric grading criteria and problem statement requirements.',
    milestoneGuidance: '1. Deconstruct prompt & grading rubric checkpoints. 2. Draft complete solutions/deliverables. 3. Review against rubric criteria.',
  },
  report: {
    role: 'Senior Management Consultant & Technical Writer',
    focusAreas: 'Actionable executive summary, data-backed findings, clear recommendations, structured appendices',
    criticalOutputConstraint: 'A polished business or technical report with executive summary and actionable conclusions.',
    milestoneGuidance: '1. Synthesize executive summary & core findings. 2. Author detailed sections with supporting data. 3. Format final document & appendices.',
  },
  design: {
    role: 'Design Director & Brand Systems Lead',
    focusAreas: 'Design systems, typography, color harmony, user empathy, production-ready export assets',
    criticalOutputConstraint: 'A complete set of design deliverables (Figma, PNG/SVG, or prototype) ready for review or engineering handoff.',
    milestoneGuidance: '1. Establish visual concept, mood board & hierarchy. 2. Produce core screens/assets. 3. Finalize component specs & design export.',
  },
  video: {
    role: 'Creative Producer & Video Production Director',
    focusAreas: 'Hook, pacing, clear storytelling, visual cues, sound design, output format compliance',
    criticalOutputConstraint: 'A rendered, exported video file (MP4/MOV) ready for publication with audio sync.',
    milestoneGuidance: '1. Finalize script & storyboard scenes. 2. Produce raw footage / recordings / animations. 3. Edit, color grade, sync audio & render final cut.',
  },
  other: {
    role: 'Execution & Delivery Specialist',
    focusAreas: 'Clear tangible output, boundary definition, risk mitigation, verification before cutoff',
    criticalOutputConstraint: 'The tangible deliverable as defined in the expected final output.',
    milestoneGuidance: '1. Clarify deliverable scope & minimal acceptable output. 2. Produce core components. 3. Verify and assemble final deliverable.',
  },
};

export class DefaultAIContextBuilder implements IAIContextBuilder {
  buildContext(deadline: Deadline, customInstructions?: string): AIContext {
    return {
      deadlineId: deadline.id,
      title: deadline.title,
      description: deadline.description || '',
      deliverableType: deadline.deliverableType || 'other',
      expectedOutput: deadline.expectedOutput,
      minimumAcceptableOutput: deadline.minimumAcceptableOutput,
      executionApproach: deadline.executionApproach || 'prototype_first',
      selectedPrototypeId: deadline.selectedPrototypeId,
      priority: deadline.priority,
      deadlineDate: deadline.deadlineDate,
      deadlineTime: deadline.deadlineTime,
      dueDateTime: deadline.dueDateTime,
      milestones: (deadline.milestones || []).map((m) => ({
        id: m.id,
        title: m.title,
        isCompleted: m.isCompleted,
        order: m.order,
      })),
      referenceLinks: (deadline.referenceLinks || []).map((r) => ({
        title: r.title,
        url: r.url,
      })),
      customInstructions: customInstructions?.trim() || undefined,
    };
  }

  buildSystemPrompt(category: DeliverableType): string {
    const profile = CATEGORY_PROFILES[category] || CATEGORY_PROFILES.other;

    return `You are an expert AI Execution Copilot for the Deadline platform.
Role: ${profile.role}
Domain Focus: ${profile.focusAreas}

PLATFORM PHILOSOPHY:
"The output matters more than the activity."
Deadline rejects endless task tracking and focuses relentlessly on the final deliverable.

CORE PRINCIPLES:
1. Focus on the Tangible Deliverable: Help the user deliver before their deadline. ${profile.criticalOutputConstraint}
2. Distinguish Target Goal vs. Minimum Acceptable Output: If time becomes short, the Minimum Acceptable Output (MVP) MUST be achieved to prevent zero-output failure.
3. Keep Execution Lean: Break work into 3 to 5 critical path milestones. Do not invent bureaucratic sub-tasks.
4. Output Format: Return a structured execution plan that empowers the user to immediately start working.`;
  }

  buildUserPrompt(context: AIContext): string {
    const profile = CATEGORY_PROFILES[context.deliverableType] || CATEGORY_PROFILES.other;

    const sections: string[] = [
      `### DEADLINE EXECUTION BRIEF`,
      `**Project Title:** ${context.title}`,
      `**Deliverable Category:** ${context.deliverableType.toUpperCase()} (${profile.role})`,
      `**Due Date & Time:** ${context.deadlineDate} at ${context.deadlineTime} (Cutoff: ${context.dueDateTime})`,
      `**Priority:** ${context.priority.toUpperCase()}`,
      `**Execution Approach:** ${context.executionApproach || 'prototype_first'}`,
    ];

    if (context.description) {
      sections.push(`\n**Project Context:**\n${context.description}`);
    }

    sections.push(
      `\n**TARGET EXPECTED OUTPUT (The Output That Matters):**\n${context.expectedOutput}`
    );

    if (context.minimumAcceptableOutput) {
      sections.push(
        `\n**MINIMUM ACCEPTABLE OUTPUT (Emergency MVP Fallback):**\n${context.minimumAcceptableOutput}`
      );
    }

    if (context.selectedPrototypeId) {
      sections.push(
        `\n**Selected Blueprint/Prototype:** ${context.selectedPrototypeId}`
      );
    }

    if (context.milestones && context.milestones.length > 0) {
      sections.push(`\n**Current User Milestones:**`);
      context.milestones.forEach((m) => {
        sections.push(
          `- [${m.isCompleted ? 'X' : ' '}] (${m.order}) ${m.title}`
        );
      });
    }

    if (context.referenceLinks && context.referenceLinks.length > 0) {
      sections.push(`\n**Reference Materials & Rubrics:**`);
      context.referenceLinks.forEach((r) => {
        sections.push(`- ${r.title}: ${r.url}`);
      });
    }

    if (context.customInstructions) {
      sections.push(
        `\n**User Custom Instructions:**\n${context.customInstructions}`
      );
    }

    sections.push(
      `\n### INSTRUCTIONS FOR YOUR EXECUTION PLAN:`,
      `1. Provide a concise "Task Understanding" confirming the deliverable to be produced.`,
      `2. Outline a recommended "Execution Strategy" tailored to this ${context.deliverableType} deliverable.`,
      `3. Generate 3 to 5 actionable "Suggested Milestones" that lead directly to the final deliverable.`,
      `4. Detail the "First Actionable Step" the user can execute right now in under 15 minutes.`,
      `5. Provide "Deliverable Guidance" specific to ${context.deliverableType} (e.g. tools, structure, or export checks).`
    );

    return sections.join('\n');
  }
}

export const aiContextBuilder = new DefaultAIContextBuilder();
