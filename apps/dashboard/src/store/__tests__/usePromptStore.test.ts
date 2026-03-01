import { describe, it, expect, beforeEach } from 'vitest';
import { usePromptStore } from '../usePromptStore';

describe('usePromptStore', () => {
  beforeEach(() => {
    usePromptStore.setState({
      prompts: [],
      selectedPromptIds: [],
      isLoading: false,
    });
  });

  it('initializes with default state', () => {
    const state = usePromptStore.getState();
    expect(state.prompts).toEqual([]);
    expect(state.selectedPromptIds).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it('addPrompt adds a prompt', () => {
    const mockPrompt = { id: '1', title: 'Test Prompt', content: '...', user_id: 'user1', created_at: 'now' };
    usePromptStore.getState().addPrompt(mockPrompt as any);
    expect(usePromptStore.getState().prompts.length).toBe(1);
    expect(usePromptStore.getState().prompts[0].id).toBe('1');
  });

  it('setLoading sets the loading state', () => {
    usePromptStore.getState().setLoading(true);
    expect(usePromptStore.getState().isLoading).toBe(true);
  });
});
