import { describe, it, expect, beforeEach } from 'vitest';
import { useImageStore } from '../useImageStore';

describe('useImageStore', () => {
  beforeEach(() => {
    useImageStore.setState({
      images: [],
      selectedImageIds: new Set(),
      isLoading: false,
      uploadQueue: [],
    });
  });

  it('initializes with default state', () => {
    const state = useImageStore.getState();
    expect(state.images).toEqual([]);
    expect(state.selectedImageIds.size).toBe(0);
    expect(state.isLoading).toBe(false);
    expect(state.uploadQueue).toEqual([]);
  });

  it('addImage adds an image', () => {
    const mockImage = { id: '1', title: 'Test', path: 'path', url: 'url', user_id: 'user1', created_at: 'now' };
    useImageStore.getState().addImage(mockImage as any);
    expect(useImageStore.getState().images.length).toBe(1);
    expect(useImageStore.getState().images[0].id).toBe('1');
  });

  it('setLoading sets the loading state', () => {
    useImageStore.getState().setLoading(true);
    expect(useImageStore.getState().isLoading).toBe(true);
  });
});
