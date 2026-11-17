import type { Activity, Deadline, ExecutionSession } from '@/types';
import type { EnvironmentVerificationReport, ProjectConfiguration } from '@/core/project/ProjectTypes';
import type { WorkspaceChangesResult } from '@/core/ide/types';
import type { AgentTranscript } from './agentTranscript';
import { formatTranscriptMarkdown } from './agentTranscript';

const clean = (value?: string | null) => value?.trim() || 'Not recorded';
const dateLabel = (value?: string) => value ? new Date(value).toLocaleString() : 'Not recorded';

export interface CrisisIntelligenceContext {
  deadline: Deadline;
  activities: Activity[];
  projectPath?: string;
  session?: ExecutionSession;
  projectConfig?: ProjectConfiguration;
  environment?: EnvironmentVerificationReport;
  changes?: WorkspaceChangesResult;
  conversations?: AgentTranscript[];
  includeConversationBodies?: boolean;
}

export function buildCrisisReport(context: CrisisIntelligenceContext): string {
  const { deadline, activities, projectPath, session, projectConfig, environment, changes, conversations = [], includeConversationBodies = true } = context;
  const attachedConversation = conversations[0];
  const lastConversationMessage = attachedConversation?.messages.at(-1);
  const sortedActivities = [...activities]
    .filter((activity) => activity.deadlineId === deadline.id)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const milestones = [...deadline.milestones].sort((a, b) => a.order - b.order);
  const completed = milestones.filter((milestone) => milestone.isCompleted).length;
  const risk = deadline.status === 'completed'
    ? 'Delivered'
    : new Date(deadline.dueDateTime).getTime() < Date.now()
      ? 'Overdue'
      : deadline.progress < 25 && new Date(deadline.dueDateTime).getTime() - Date.now() < 24 * 60 * 60 * 1000
        ? 'Critical: due within 24 hours with under 25% progress'
        : 'Monitor against due date and remaining milestones';

  const lines = [
    `# Crisis Intelligence: ${deadline.title}`,
    '',
    `> Generated ${new Date().toLocaleString()} from Deadline records. Missing execution evidence is labeled “Not recorded”; no agent actions are inferred.`,
    '',
    '## Situation',
    `- **Status:** ${deadline.status.replace(/_/g, ' ')}`,
    `- **Risk snapshot:** ${risk}`,
    `- **Priority:** ${deadline.priority}`,
    `- **Due:** ${deadline.deadlineDate} at ${deadline.deadlineTime}`,
    `- **Deadline progress:** ${deadline.progress}%`,
    `- **Milestone progress:** ${milestones.length ? `${completed}/${milestones.length} complete (${Math.round(completed / milestones.length * 100)}%)` : 'No milestones recorded'}`,
    `- **Deliverable type:** ${deadline.deliverableType.replace(/_/g, ' ')}`,
    `- **Execution approach:** ${(deadline.executionApproach || 'prototype_first').replace(/_/g, ' ')}`,
    '',
    '## Objective and acceptance target',
    `- **Required output:** ${clean(deadline.expectedOutput)}`,
    `- **Minimum acceptable output:** ${clean(deadline.minimumAcceptableOutput)}`,
    `- **Description:** ${clean(deadline.description)}`,
    '',
    '## Build environment and agent trace',
    `- **IDE/agent:** ${clean(session?.providerId || deadline.aiConfig?.providerId || attachedConversation?.providerId)}`,
    `- **Agent session status:** ${clean(session?.status || (attachedConversation ? 'Conversation imported; process status not captured' : undefined))}`,
    `- **Project path:** ${clean(projectPath || session?.projectPath || projectConfig?.projectPath)}`,
    `- **Session started:** ${dateLabel(session?.startedAt || attachedConversation?.startedAt)}`,
    `- **Session ended:** ${dateLabel(session?.endedAt || lastConversationMessage?.timestamp)}`,
    `- **Changed files reported by session:** ${session?.changedFilesCount ?? changes?.totalChanges ?? 'Not recorded'}`,
    `- **Project setup:** ${projectConfig ? `${projectConfig.projectType}, ${projectConfig.language}, ${projectConfig.packageManager}` : 'Not recorded'}`,
    `- **Environment verified:** ${environment ? `${environment.isReady ? 'Ready' : 'Issues found'} on ${dateLabel(environment.verifiedAt)}` : 'Not recorded'}`,
    ...(environment?.issues.length ? [`- **Environment issues:** ${environment.issues.join('; ')}`] : []),
    ...(session?.errorMessage ? [`- **Session error:** ${session.errorMessage}`] : []),
    '',
    '## Approved execution plan',
    ...(deadline.approvedPlan ? [
      `- **Provider/model:** ${deadline.approvedPlan.providerId} / ${deadline.approvedPlan.modelId}`,
      `- **Plan version/status:** v${deadline.approvedPlan.version} / ${deadline.approvedPlan.approvalStatus}`,
      `- **Task understanding:** ${deadline.approvedPlan.taskUnderstanding}`,
      `- **Approach:** ${deadline.approvedPlan.suggestedApproach}`,
      `- **First action:** ${deadline.approvedPlan.firstActionableStep}`,
      ...deadline.approvedPlan.suggestedMilestones.map((milestone) => `- **Plan step ${milestone.order}${milestone.isCriticalPath ? ' (critical path)' : ''}:** ${milestone.title} — ${milestone.description}`),
    ] : ['No approved AI execution plan recorded.']),
    '',
    '## Milestone record',
    ...(milestones.length ? milestones.map((milestone) =>
      `- [${milestone.isCompleted ? 'x' : ' '}] ${milestone.title}${milestone.description ? ` — ${milestone.description}` : ''}${milestone.completedAt ? ` (completed ${dateLabel(milestone.completedAt)})` : ''}`
    ) : ['No milestones recorded.']),
    '',
    '## IDE execution events',
    ...(session?.executionEvents?.length
      ? session.executionEvents.map((event) => `- **${dateLabel(event.timestamp)} · ${event.type}:** ${event.message}`)
      : ['No IDE execution events recorded for this session.']),
    '',
    '## Full IDE conversations',
    ...(conversations.length
      ? conversations.map((conversation) => includeConversationBodies
        ? `### ${conversation.providerId} · ${conversation.sourceName} · ${dateLabel(conversation.startedAt)}\n\n${formatTranscriptMarkdown(conversation)}`
        : `### ${conversation.providerId} · ${conversation.sourceName} · ${dateLabel(conversation.startedAt)}\n\n${conversation.messages.length} conversation entries are attached. The complete transcript and tool actions are included in the exported Markdown report.`)
      : ['No full IDE conversation has been attached to this deadline yet.']),
    '',
    '## Changed workspace files',
    ...(changes?.totalChanges
      ? [
          `- **Repository:** ${changes.isGitRepo ? 'Git repository' : 'Not detected as a Git repository'}`,
          ...changes.modifiedFiles.map((file) => `- Modified: \`${file}\``),
          ...changes.untrackedFiles.map((file) => `- Added: \`${file}\``),
          ...changes.deletedFiles.map((file) => `- Deleted: \`${file}\``),
          `- **Summary:** ${changes.summary}`,
        ]
      : ['No changed-file inspection recorded.']),
    '',
    '## Manual build notes',
    clean(deadline.crisisImplementationNotes),
    '',
    '## Activity timeline',
    ...(sortedActivities.length
      ? sortedActivities.map((activity) => `- **${dateLabel(activity.timestamp)} · ${activity.type}:** ${activity.title}${activity.description ? ` — ${activity.description}` : ''}`)
      : ['No activity entries recorded.']),
    '',
    '## Final deliverable',
    ...(deadline.finalDeliverable ? [
      `- **Title:** ${deadline.finalDeliverable.title}`,
      `- **Summary:** ${clean(deadline.finalDeliverable.summary)}`,
      `- **Location:** ${deadline.finalDeliverable.resourceUri}`,
      `- **Submitted:** ${dateLabel(deadline.finalDeliverable.submittedAt)}`,
      `- **Verification notes:** ${clean(deadline.finalDeliverable.verificationNotes)}`,
    ] : ['No final deliverable submission recorded.']),
    '',
    '## References',
    ...(deadline.referenceLinks.length
      ? deadline.referenceLinks.map((link) => `- [${link.title}](${link.url})${link.description ? ` — ${link.description}` : ''}`)
      : ['No reference links recorded.']),
    '',
  ];

  return lines.join('\n');
}

export function buildReusableAgentPrompt(deadline: Deadline): string {
  const milestones = [...deadline.milestones].sort((a, b) => a.order - b.order);
  const approvedPlan = deadline.approvedPlan;
  return `# Reusable build instruction for: ${deadline.title}

Use this as a task-specific system/instruction prompt in Codex, Claude Code, Antigravity, Cursor, Windsurf, or another coding agent. It is generated from Deadline project data; it is not a vendor's hidden system prompt.

## Role and operating rules
You are a senior, delivery-focused product engineer. Your job is to complete the specific deadline below with the smallest reliable implementation that meets its acceptance target.

1. Inspect the existing project, repository instructions, current state, and available scripts before changing files. Preserve existing work and project conventions.
2. Convert the acceptance target into a short, ordered plan. Start with the smallest end-to-end vertical slice that proves the core output.
3. Prioritize working output over speculative refactoring, polish, or unrelated features. Keep changes focused on this deadline.
4. Reuse existing architecture and dependencies. Do not add dependencies unless they materially reduce risk or implementation time.
5. Verify the core flow using the project's existing checks or a direct manual run. Do not claim tests, builds, or behaviors that you did not verify.
6. If blocked, state the exact blocker and the smallest next action. Never invent credentials, environment values, test results, or completed work.
7. Do not overwrite existing special files or user work. Keep secrets out of source files, logs, and generated documentation.
8. At completion, report what changed, how to run it, verification evidence, known gaps, and the final deliverable location.

## Deadline brief
- **Title:** ${deadline.title}
- **Description:** ${clean(deadline.description)}
- **Required output:** ${clean(deadline.expectedOutput)}
- **Minimum acceptable output:** ${clean(deadline.minimumAcceptableOutput)}
- **Type:** ${deadline.deliverableType.replace(/_/g, ' ')}
- **Priority:** ${deadline.priority}
- **Due:** ${deadline.deadlineDate} at ${deadline.deadlineTime}
- **Execution approach:** ${(deadline.executionApproach || 'prototype_first').replace(/_/g, ' ')}
- **Project notes:** ${clean(deadline.crisisImplementationNotes)}

## Acceptance target
Deliver: ${clean(deadline.expectedOutput)}

Minimum viable fallback if time is short: ${clean(deadline.minimumAcceptableOutput)}

## Ordered milestones
${milestones.length ? milestones.map((milestone, index) => `${index + 1}. ${milestone.title}${milestone.description ? ` — ${milestone.description}` : ''}${milestone.isCompleted ? ' (already marked complete; verify before relying on it)' : ''}`).join('\n') : '1. Inspect the project and define the smallest milestone sequence needed to deliver the target.'}

## Approved plan guidance
${approvedPlan ? `- **Approach:** ${approvedPlan.suggestedApproach}\n- **First action:** ${approvedPlan.firstActionableStep}\n${approvedPlan.suggestedMilestones.map((milestone) => `- **Step ${milestone.order}:** ${milestone.title} — ${milestone.description}`).join('\n')}` : 'No approved AI plan is attached. Make a brief plan from the acceptance target, then begin immediately.'}

## References
${deadline.referenceLinks.length ? deadline.referenceLinks.map((link) => `- ${link.title}: ${link.url}${link.description ? ` — ${link.description}` : ''}`).join('\n') : 'No references supplied.'}

Begin by inspecting the repository and identifying the fastest safe path to the minimum working deliverable. Then build it, verify the core behavior, and return the completion report described above.`;
}
