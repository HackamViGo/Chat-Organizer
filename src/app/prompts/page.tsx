'use client';

import { useEffect, useState } from 'react';
import { usePromptStore } from '@/store/usePromptStore';
import { PromptCard } from '@/components/features/prompts/PromptCard';
import { CreatePromptModal } from '@/components/features/prompts/CreatePromptModal';
import { createClient } from '@/lib/supabase/client';
import { FileEdit, Plus, Search, ArrowUpDown } from 'lucide-react';
import { Prompt } from '@/types';

type SortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'title-desc';

export default function PromptsPage() {
  const { prompts, setPrompts } = usePromptStore();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching prompts:', error);
        } else {
          setPrompts(data || []);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrompts();
  }, [setPrompts]);

  // Filter and sort prompts
  const filteredAndSortedPrompts = prompts
    .filter((prompt) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        prompt.title.toLowerCase().includes(query) ||
        prompt.content.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'date-asc':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingPrompt(null);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-56 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileEdit className="w-8 h-8" />
            Prompts Library
          </h1>
          <p className="text-muted-foreground">
            Save and organize your AI prompts for quick reuse
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Prompt
        </button>
      </div>

      {/* Search and Sort */}
      {prompts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full sm:w-48 pl-10 pr-4 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      {/* Results Count */}
      {prompts.length > 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          {filteredAndSortedPrompts.length} {filteredAndSortedPrompts.length === 1 ? 'prompt' : 'prompts'}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      )}

      {/* Empty State */}
      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileEdit className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No prompts yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first prompt to get started
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create Prompt
          </button>
        </div>
      ) : filteredAndSortedPrompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No prompts found</h3>
          <p className="text-muted-foreground mb-6">
            Try adjusting your search query
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedPrompts.map((prompt) => (
            <PromptCard key={prompt.id} prompt={prompt} onEdit={handleEdit} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreatePromptModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        editingPrompt={editingPrompt}
      />
    </div>
  );
}
