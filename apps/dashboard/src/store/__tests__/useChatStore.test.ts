import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatStore } from '../useChatStore';

// Helper: minimal valid Chat shape
const makeChat = (override = {}) => ({
  id: 'chat-1',
  title: 'Test Chat',
  platform: 'chatgpt',
  messages: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 'user-1',
  ...override,
} as any);

describe('useChatStore — Optimistic Updates & Rollback', () => {
  beforeEach(() => {
    useChatStore.setState({ chats: [], selectedChatId: null, selectedChatIds: new Set(), isLoading: false });
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // deleteChat
  // ─────────────────────────────────────────────────────────────

  describe('deleteChat', () => {
    it('optimistically removes chat from list', async () => {
      useChatStore.setState({ chats: [makeChat({ id: '1' }), makeChat({ id: '2' })] });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      await useChatStore.getState().deleteChat('1');

      expect(useChatStore.getState().chats).toHaveLength(1);
      expect(useChatStore.getState().chats[0].id).toBe('2');
    });

    it('rolls back if API call fails', async () => {
      useChatStore.setState({ chats: [makeChat({ id: '1' })] });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      await expect(useChatStore.getState().deleteChat('1')).rejects.toThrow();

      // State is restored
      expect(useChatStore.getState().chats).toHaveLength(1);
      expect(useChatStore.getState().chats[0].id).toBe('1');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteChats (bulk)
  // ─────────────────────────────────────────────────────────────

  describe('deleteChats', () => {
    it('optimistically removes multiple chats', async () => {
      useChatStore.setState({
        chats: [makeChat({ id: '1' }), makeChat({ id: '2' }), makeChat({ id: '3' })],
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));

      await useChatStore.getState().deleteChats(['1', '2']);

      expect(useChatStore.getState().chats).toHaveLength(1);
      expect(useChatStore.getState().chats[0].id).toBe('3');
    });

    it('rolls back all on API failure', async () => {
      useChatStore.setState({
        chats: [makeChat({ id: '1' }), makeChat({ id: '2' })],
      });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      await expect(useChatStore.getState().deleteChats(['1', '2'])).rejects.toThrow();

      expect(useChatStore.getState().chats).toHaveLength(2);
    });

    it('is a no-op for empty array', async () => {
      useChatStore.setState({ chats: [makeChat()] });
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      await useChatStore.getState().deleteChats([]);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(useChatStore.getState().chats).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // updateChat
  // ─────────────────────────────────────────────────────────────

  describe('updateChat', () => {
    it('optimistically updates the chat title', async () => {
      useChatStore.setState({ chats: [makeChat({ id: '1', title: 'Old Title' })] });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => makeChat({ id: '1', title: 'New Title' }),
      }));

      await useChatStore.getState().updateChat('1', { title: 'New Title' });

      expect(useChatStore.getState().chats[0].title).toBe('New Title');
    });

    it('rolls back title change on API failure', async () => {
      useChatStore.setState({ chats: [makeChat({ id: '1', title: 'Original' })] });

      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));

      await expect(useChatStore.getState().updateChat('1', { title: 'Changed' })).rejects.toThrow();

      expect(useChatStore.getState().chats[0].title).toBe('Original');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Selection helpers
  // ─────────────────────────────────────────────────────────────

  describe('chat selection', () => {
    it('toggles selection state', () => {
      useChatStore.setState({ chats: [makeChat({ id: '1' })] });
      useChatStore.getState().toggleChatSelection('1');
      expect(useChatStore.getState().selectedChatIds.has('1')).toBe(true);

      useChatStore.getState().toggleChatSelection('1');
      expect(useChatStore.getState().selectedChatIds.has('1')).toBe(false);
    });

    it('selectAllChats populates selectedChatIds', () => {
      useChatStore.setState({ chats: [makeChat({ id: '1' }), makeChat({ id: '2' })] });
      useChatStore.getState().selectAllChats();
      expect(useChatStore.getState().selectedChatIds.size).toBe(2);
    });

    it('deselectAllChats clears selection', () => {
      useChatStore.setState({
        chats: [makeChat({ id: '1' })],
        selectedChatIds: new Set(['1']),
      });
      useChatStore.getState().deselectAllChats();
      expect(useChatStore.getState().selectedChatIds.size).toBe(0);
    });
  });
});
