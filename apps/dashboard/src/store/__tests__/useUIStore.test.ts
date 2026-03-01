import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../useUIStore';

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      isMobileSidebarOpen: false,
      isGlobalBrainOpen: false,
    });
  });

  it('initializes with default state', () => {
    const state = useUIStore.getState();
    expect(state.isMobileSidebarOpen).toBe(false);
    expect(state.isGlobalBrainOpen).toBe(false);
  });

  it('setMobileSidebarOpen modifies state', () => {
    useUIStore.getState().setMobileSidebarOpen(true);
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(true);

    useUIStore.getState().setMobileSidebarOpen(false);
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(false);
  });

  it('toggleMobileSidebar toggles state', () => {
    useUIStore.getState().toggleMobileSidebar();
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(true);

    useUIStore.getState().toggleMobileSidebar();
    expect(useUIStore.getState().isMobileSidebarOpen).toBe(false);
  });

  it('setGlobalBrainOpen modifies state', () => {
    useUIStore.getState().setGlobalBrainOpen(true);
    expect(useUIStore.getState().isGlobalBrainOpen).toBe(true);

    useUIStore.getState().setGlobalBrainOpen(false);
    expect(useUIStore.getState().isGlobalBrainOpen).toBe(false);
  });

  it('toggleGlobalBrain toggles state', () => {
    useUIStore.getState().toggleGlobalBrain();
    expect(useUIStore.getState().isGlobalBrainOpen).toBe(true);

    useUIStore.getState().toggleGlobalBrain();
    expect(useUIStore.getState().isGlobalBrainOpen).toBe(false);
  });
});
