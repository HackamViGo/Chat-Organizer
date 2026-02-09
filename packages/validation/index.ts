/**
 * @brainbox/validation
 * Centralized Zod validation schemas for the BrainBox monorepo
 */

// Chat schemas
export {
  createChatSchema,
  updateChatSchema,
  type CreateChatInput,
  type UpdateChatInput,
} from './schemas/chat';

// Prompt schemas
export {
  createPromptSchema,
  updatePromptSchema,
  type CreatePromptInput,
  type UpdatePromptInput,
} from './schemas/prompt';

// Legacy aliases for backward compatibility
export { createPromptSchema as promptSchema } from './schemas/prompt';
export type { CreatePromptInput as PromptFormData } from './schemas/prompt';

// Folder schemas
export {
  folderTypeEnum,
  createFolderSchema,
  updateFolderSchema,
  type FolderType,
  type CreateFolderInput,
  type UpdateFolderInput,
} from './schemas/folder';

// List schemas
export {
  listSchema,
  updateListSchema,
  listItemSchema,
  updateListItemSchema,
  type ListFormData,
  type ListItemFormData,
} from './schemas/list';

// Privacy schemas
export {
  PrivacyConfigSchema,
  type PrivacyConfig,
} from './schemas/privacy';
