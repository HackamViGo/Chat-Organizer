export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          content: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          is_archived: boolean | null
          platform: string | null
          summary: string | null
          tasks: Json | null
          title: string
          updated_at: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          platform?: string | null
          summary?: string | null
          tasks?: Json | null
          title: string
          updated_at?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          is_archived?: boolean | null
          platform?: string | null
          summary?: string | null
          tasks?: Json | null
          title?: string
          updated_at?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string | null
          folder_id: string | null
          id: string
          mime_type: string | null
          name: string | null
          path: string
          size: number | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string | null
          path: string
          size?: number | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          name?: string | null
          path?: string
          size?: number | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      list_items: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          list_id: string
          position: number | null
          text: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          list_id: string
          position?: number | null
          text: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          list_id?: string
          position?: number | null
          text?: string
        }
        Relationships: []
      }
      lists: {
        Row: {
          color: string | null
          created_at: string | null
          folder_id: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          folder_id?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          color: string | null
          content: string
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          content: string
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          content?: string
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
