# TODO List

## Bugs to Fix

### Chat Card Modal Editor - Selection Issue
**Location:** `src/components/features/chats/ChatCard.tsx` - `insertFormatting()` function
**Problem:** Toolbar buttons (Bold, Italic, Highlight, etc.) add formatting markers but cursor jumps to end of text instead of staying on the formatted selection.
**Expected:** After clicking toolbar button, the formatted text should remain selected/highlighted.
**Status:** Not working
