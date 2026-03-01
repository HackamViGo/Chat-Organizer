import { describe, it, expect, beforeEach } from 'vitest';
import { useListStore } from '../useListStore';

describe('useListStore', () => {
  beforeEach(() => {
    useListStore.setState({
      lists: [],
      selectedListId: null,
      isLoading: false,
    });
  });

  it('initializes with default state', () => {
    const state = useListStore.getState();
    expect(state.lists).toEqual([]);
    expect(state.selectedListId).toBe(null);
    expect(state.isLoading).toBe(false);
  });

  it('addList adds a list', () => {
    const mockList = { id: '1', title: 'Test List', items: [], user_id: 'user1', created_at: 'now' };
    useListStore.getState().addList(mockList as any);
    expect(useListStore.getState().lists.length).toBe(1);
    expect(useListStore.getState().lists[0].id).toBe('1');
  });

  it('setLoading sets the loading state', () => {
    useListStore.getState().setLoading(true);
    expect(useListStore.getState().isLoading).toBe(true);
  });
});
