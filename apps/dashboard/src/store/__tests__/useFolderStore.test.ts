import { describe, it, expect, beforeEach } from 'vitest';
import { useFolderStore } from '../useFolderStore';

describe('useFolderStore', () => {
  beforeEach(() => {
    useFolderStore.setState({
      folders: [],
      selectedFolderId: null,
      isLoading: false,
    });
  });

  it('initializes with default state', () => {
    const state = useFolderStore.getState();
    expect(state.folders).toEqual([]);
    expect(state.selectedFolderId).toBe(null);
    expect(state.isLoading).toBe(false);
  });

  it('addFolder adds a folder', () => {
    const mockFolder = { id: '1', name: 'Test', color: '#fff', user_id: 'user1', created_at: 'now' };
    useFolderStore.getState().addFolder(mockFolder as any);
    expect(useFolderStore.getState().folders.length).toBe(1);
    expect(useFolderStore.getState().folders[0].id).toBe('1');
  });

  it('setLoading sets the loading state', () => {
    useFolderStore.getState().setLoading(true);
    expect(useFolderStore.getState().isLoading).toBe(true);
  });
});
