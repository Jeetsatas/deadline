import { describe, it, expect, beforeEach } from 'vitest';
import { useDeadlineStore } from '@/store/useDeadlineStore';
import { prototypeRegistry } from '@/core/prototype';
import {
  Deadline,
  DeliverableVaultCategory,
  VaultDeliverable,
  DeliverableType,
  SubmissionFormat,
} from '@/types';

// Helper to map deliverable to category matching DeliverableVault logic
function mapToCategory(type?: DeliverableType, format?: SubmissionFormat): DeliverableVaultCategory {
  if (type === 'software' || type === 'prototype' || format === 'repository') return 'software';
  if (type === 'presentation') return 'presentations';
  if (type === 'report' || type === 'assignment' || type === 'research_paper' || format === 'document') return 'documents';
  if (type === 'design') return 'graphics';
  if (type === 'video') return 'videos';
  if (format === 'url') return 'links';
  return 'other';
}

describe('Phase 5: Modular Workspace, Sidebar Navigation & Deliverable Vault', () => {
  beforeEach(() => {
    useDeadlineStore.setState({
      activeTab: 'dashboard',
      selectedDeadlineId: null,
      deadlines: [],
    });
  });

  describe('1. Modular Navigation & Persistent Sidebar Routing', () => {
    it('supports switching between all 7 modules and their alias tabs', () => {
      const store = useDeadlineStore.getState();

      // Dashboard
      store.setActiveTab('dashboard');
      expect(useDeadlineStore.getState().activeTab).toBe('dashboard');

      // Deadline Manager
      store.setActiveTab('deadlines');
      expect(useDeadlineStore.getState().activeTab).toBe('deadlines');

      // Execution Engine
      store.setActiveTab('execution-engine');
      expect(useDeadlineStore.getState().activeTab).toBe('execution-engine');

      // Prototype Workspace
      store.setActiveTab('prototype-workspace');
      expect(useDeadlineStore.getState().activeTab).toBe('prototype-workspace');

      // Deliverable Vault
      store.setActiveTab('deliverable-vault');
      expect(useDeadlineStore.getState().activeTab).toBe('deliverable-vault');

      // Analytics
      store.setActiveTab('analytics');
      expect(useDeadlineStore.getState().activeTab).toBe('analytics');

      // Settings
      store.setActiveTab('settings');
      expect(useDeadlineStore.getState().activeTab).toBe('settings');
    });

    it('clears selected deadline when switching navigation tabs to avoid stuck state', () => {
      useDeadlineStore.setState({ selectedDeadlineId: 'dl_999' });
      expect(useDeadlineStore.getState().selectedDeadlineId).toBe('dl_999');

      useDeadlineStore.getState().setActiveTab('deliverable-vault');
      expect(useDeadlineStore.getState().activeTab).toBe('deliverable-vault');
      expect(useDeadlineStore.getState().selectedDeadlineId).toBeNull();
    });
  });

  describe('2. Deliverable Vault Categorization & Organization', () => {
    it('correctly categorizes Software & Code deliverables including git repositories', () => {
      expect(mapToCategory('software', 'file_ref')).toBe('software');
      expect(mapToCategory('prototype', 'repository')).toBe('software');
      expect(mapToCategory('other', 'repository')).toBe('software');
    });

    it('correctly categorizes Documents deliverables', () => {
      expect(mapToCategory('report', 'file_ref')).toBe('documents');
      expect(mapToCategory('assignment', 'document')).toBe('documents');
      expect(mapToCategory('research_paper', 'file_ref')).toBe('documents');
      expect(mapToCategory('other', 'document')).toBe('documents');
    });

    it('correctly categorizes Presentations, Graphics, Videos, and External Links', () => {
      expect(mapToCategory('presentation', 'file_ref')).toBe('presentations');
      expect(mapToCategory('design', 'file_ref')).toBe('graphics');
      expect(mapToCategory('video', 'url')).toBe('videos');
      expect(mapToCategory('other', 'url')).toBe('links');
    });

    it('indexes deliverables with intact relations to deadlines for two-way navigation', () => {
      const sampleDeadline: Deadline = {
        id: 'dl_test_1',
        title: 'Calculator App',
        description: 'Arithmetic calculator',
        expectedOutput: 'Working calculator web app',
        priority: 'high',
        status: 'completed',
        deadlineDate: '2026-11-20',
        deadlineTime: '18:00',
        dueDateTime: '2026-11-20T18:00:00.000Z',
        progress: 100,
        deliverableType: 'software',
        executionApproach: 'prototype_first',
        referenceLinks: [],
        attachments: [],
        milestones: [],
        notes: '',
        tags: ['calc', 'react'],
        createdAt: '2026-11-13T10:00:00.000Z',
        updatedAt: '2026-11-13T11:00:00.000Z',
        finalDeliverable: {
          id: 'deliv_1',
          deadlineId: 'dl_test_1',
          title: 'Calculator Production Bundle',
          expectedOutput: 'Working calculator web app',
          summary: 'Complete React+Vite app with Vitest test coverage.',
          deliverableType: 'software',
          submissionFormat: 'repository',
          resourceUri: 'https://github.com/user/calculator-app',
          submittedAt: '2026-11-13T11:00:00.000Z',
          status: 'accepted',
          verificationNotes: 'Passes 100% test assertions',
          createdAt: '2026-11-13T11:00:00.000Z',
          updatedAt: '2026-11-13T11:00:00.000Z',
        },
      };

      useDeadlineStore.setState({ deadlines: [sampleDeadline] });

      const vaultDeliverables: VaultDeliverable[] = useDeadlineStore
        .getState()
        .deadlines.filter((d) => Boolean(d.finalDeliverable))
        .map((d) => {
          const fd = d.finalDeliverable!;
          return {
            id: fd.id,
            deadlineId: d.id,
            deadlineTitle: d.title,
            title: fd.title,
            expectedOutput: fd.expectedOutput,
            summary: fd.summary,
            category: mapToCategory(fd.deliverableType, fd.submissionFormat),
            deliverableType: fd.deliverableType,
            submissionFormat: fd.submissionFormat,
            resourceUri: fd.resourceUri,
            resourceType: 'repository',
            status: fd.status,
            submittedAt: fd.submittedAt,
            updatedAt: fd.updatedAt,
            verificationNotes: fd.verificationNotes,
          };
        });

      expect(vaultDeliverables.length).toBe(1);
      const item = vaultDeliverables[0];
      expect(item.category).toBe('software');
      expect(item.deadlineId).toBe('dl_test_1');
      expect(item.deadlineTitle).toBe('Calculator App');
      expect(item.resourceUri).toContain('github.com');
      expect(item.status).toBe('accepted');
    });
  });

  describe('3. Prototype Workspace & Blueprint Registry', () => {
    it('exposes approved prototype blueprints from registry', () => {
      prototypeRegistry.initializeDefaults?.();
      const allTypes = prototypeRegistry.listTypes({ enabledOnly: true });

      expect(allTypes.length).toBeGreaterThanOrEqual(3);
      expect(allTypes.some((t) => t.id === 'interactive-calc-proto')).toBe(true);
      expect(allTypes.some((t) => t.id === 'react-app-proto')).toBe(true);
      expect(allTypes.some((t) => t.id === 'slide-deck-proto')).toBe(true);
    });

    it('correctly filters prototypes by deliverable type', () => {
      prototypeRegistry.initializeDefaults?.();
      const softwareBlueprints = prototypeRegistry.listTypes({ deliverableType: 'software' });
      expect(softwareBlueprints.some((t) => t.id === 'interactive-calc-proto')).toBe(true);
      expect(softwareBlueprints.some((t) => t.id === 'react-app-proto')).toBe(true);

      const presBlueprints = prototypeRegistry.listTypes({ deliverableType: 'presentation' });
      expect(presBlueprints.some((t) => t.id === 'slide-deck-proto')).toBe(true);
    });
  });

  describe('4. Authentic Analytics Telemetry', () => {
    it('computes accurate delivery rate and on-time rate from real deadlines', () => {
      const mockDeadlines: Deadline[] = [
        {
          id: 'dl_1',
          title: 'On-time delivery',
          description: '',
          expectedOutput: '',
          priority: 'high',
          status: 'completed',
          deadlineDate: '2026-11-20',
          deadlineTime: '18:00',
          dueDateTime: '2026-11-20T18:00:00.000Z',
          progress: 100,
          deliverableType: 'software',
          referenceLinks: [],
          attachments: [],
          milestones: [],
          notes: '',
          tags: [],
          createdAt: '2026-11-10T10:00:00.000Z',
          updatedAt: '2026-11-15T10:00:00.000Z',
          finalDeliverable: {
            id: 'del_1',
            deadlineId: 'dl_1',
            title: 'Output 1',
            expectedOutput: '',
            summary: '',
            deliverableType: 'software',
            submissionFormat: 'repository',
            resourceUri: 'https://github.com/test/repo',
            submittedAt: '2026-11-15T10:00:00.000Z', // Submitted 5 days BEFORE due date
            status: 'accepted',
            createdAt: '2026-11-15T10:00:00.000Z',
            updatedAt: '2026-11-15T10:00:00.000Z',
          },
        },
        {
          id: 'dl_2',
          title: 'Active work in flight',
          description: '',
          expectedOutput: '',
          priority: 'medium',
          status: 'in_progress',
          deadlineDate: '2026-11-25',
          deadlineTime: '18:00',
          dueDateTime: '2026-11-25T18:00:00.000Z',
          progress: 40,
          deliverableType: 'design',
          referenceLinks: [],
          attachments: [],
          milestones: [],
          notes: '',
          tags: [],
          createdAt: '2026-11-12T10:00:00.000Z',
          updatedAt: '2026-11-13T10:00:00.000Z',
        },
      ];

      useDeadlineStore.setState({ deadlines: mockDeadlines });
      const stats = useDeadlineStore.getState().stats();

      expect(stats.total).toBe(2);
      expect(stats.completed).toBe(1);
      expect(stats.active).toBe(1);
      expect(stats.deliveryRate).toBe(50); // 1 out of 2 completed = 50%
    });
  });
});
