import { Database } from '@brainbox/shared/types/database';

export type Chat = Database['public']['Tables']['chats']['Row'];
export type ChatInsert = Database['public']['Tables']['chats']['Insert'];
export type ChatUpdate = Database['public']['Tables']['chats']['Update'];

export type Folder = Database['public']['Tables']['folders']['Row'];
export type FolderInsert = Database['public']['Tables']['folders']['Insert'];
export type FolderUpdate = Database['public']['Tables']['folders']['Update'];

export type Prompt = Database['public']['Tables']['prompts']['Row'];
export type PromptInsert = Database['public']['Tables']['prompts']['Insert'];
export type PromptUpdate = Database['public']['Tables']['prompts']['Update'];

export type Image = Database['public']['Tables']['images']['Row'];
export type ImageInsert = Database['public']['Tables']['images']['Insert'];
export type ImageUpdate = Database['public']['Tables']['images']['Update'];

export type User = Database['public']['Tables']['users']['Row'];
export type UserInsert = Database['public']['Tables']['users']['Insert'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type List = Database['public']['Tables']['lists']['Row'];
export type ListInsert = Database['public']['Tables']['lists']['Insert'];
export type ListUpdate = Database['public']['Tables']['lists']['Update'];

export type ListItem = Database['public']['Tables']['list_items']['Row'];
export type ListItemInsert = Database['public']['Tables']['list_items']['Insert'];
export type ListItemUpdate = Database['public']['Tables']['list_items']['Update'];

// Helper type с nested items
export interface ListWithItems extends List {
  items: ListItem[];
}

export type ListColor = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'cyan';

// Platform enum
export enum Platform {
  ChatGPT = 'chatgpt',
  Claude = 'claude',
  Gemini = 'gemini',
  Other = 'other',
}

export type ViewMode = 'grid' | 'list';

export interface UploadItem {
  id: string;
  name: string;
  progress: number;
  status: 'uploading' | 'converting' | 'completed' | 'error';
  error?: string;
  file?: File;
}
