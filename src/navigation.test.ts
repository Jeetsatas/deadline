import { describe, it, expect, beforeEach } from 'vitest';
import { useDeadlineStore } from '@/store/useDeadlineStore';

describe('Navigation Tab Switching Suite', () => {
  beforeEach(async () => {
    useDeadlineStore.setState({ activeTab: 'overview', selectedDeadlineId: null });
  });

  it('switches between all navigation tabs correctly', () => {
    const store = useDeadlineStore.getState();
    expect(store.activeTab).toBe('overview');

    store.setActiveTab('my-deadlines');
    expect(useDeadlineStore.getState().activeTab).toBe('my-deadlines');
    expect(useDeadlineStore.getState().selectedDeadlineId).toBeNull();

    store.setActiveTab('upcoming');
    expect(useDeadlineStore.getState().activeTab).toBe('upcoming');

    store.setActiveTab('in-progress');
    expect(useDeadlineStore.getState().activeTab).toBe('in-progress');

    store.setActiveTab('completed');
    expect(useDeadlineStore.getState().activeTab).toBe('completed');

    store.setActiveTab('deliverables');
    expect(useDeadlineStore.getState().activeTab).toBe('deliverables');

    store.setActiveTab('analytics');
    expect(useDeadlineStore.getState().activeTab).toBe('analytics');

    store.setActiveTab('settings');
    expect(useDeadlineStore.getState().activeTab).toBe('settings');
  });

  it('clears selectedDeadlineId when switching tabs', () => {
    useDeadlineStore.setState({ selectedDeadlineId: 'dl_test_123' });
    expect(useDeadlineStore.getState().selectedDeadlineId).toBe('dl_test_123');

    useDeadlineStore.getState().setActiveTab('settings');
    expect(useDeadlineStore.getState().activeTab).toBe('settings');
    expect(useDeadlineStore.getState().selectedDeadlineId).toBeNull();
  });

  it('selects a deadline and returns to overview tab cleanly', () => {
    useDeadlineStore.getState().selectDeadline('dl_sample_1');
    expect(useDeadlineStore.getState().selectedDeadlineId).toBe('dl_sample_1');

    useDeadlineStore.getState().setActiveTab('overview');
    expect(useDeadlineStore.getState().activeTab).toBe('overview');
    expect(useDeadlineStore.getState().selectedDeadlineId).toBeNull();
  });

  it('opens and closes modal without affecting active navigation tab', () => {
    useDeadlineStore.getState().setActiveTab('deliverables');
    expect(useDeadlineStore.getState().activeTab).toBe('deliverables');

    useDeadlineStore.getState().openCreateModal();
    expect(useDeadlineStore.getState().isCreateModalOpen).toBe(true);
    expect(useDeadlineStore.getState().activeTab).toBe('deliverables');

    useDeadlineStore.getState().closeCreateModal();
    expect(useDeadlineStore.getState().isCreateModalOpen).toBe(false);
    expect(useDeadlineStore.getState().activeTab).toBe('deliverables');
  });
});
