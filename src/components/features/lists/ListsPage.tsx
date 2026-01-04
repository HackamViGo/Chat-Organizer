'use client';

import React, { useState, useEffect } from 'react';
import { useListStore } from '@/store/useListStore';
import type { ListWithItems, ListColor, ListItem } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { listSchema, listItemSchema } from '@/lib/validation/list';
import { 
  Plus, Trash2, Check, X, Edit2, GripVertical, 
  CheckSquare, Square, Loader2, MoreVertical, FolderOpen
} from 'lucide-react';

interface ListsPageProps {
  initialLists: ListWithItems[];
}

const colorClasses: Record<ListColor, { bg: string; border: string; text: string; button: string }> = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
    button: 'bg-emerald-500 hover:bg-emerald-600 text-white'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    button: 'bg-blue-500 hover:bg-blue-600 text-white'
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    button: 'bg-purple-500 hover:bg-purple-600 text-white'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    button: 'bg-amber-500 hover:bg-amber-600 text-white'
  },
  rose: {
    bg: 'bg-rose-50 dark:bg-rose-950/20',
    border: 'border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
    button: 'bg-rose-500 hover:bg-rose-600 text-white'
  },
  cyan: {
    bg: 'bg-cyan-50 dark:bg-cyan-950/20',
    border: 'border-cyan-200 dark:border-cyan-800',
    text: 'text-cyan-700 dark:text-cyan-300',
    button: 'bg-cyan-500 hover:bg-cyan-600 text-white'
  }
};

export function ListsPage({ initialLists }: ListsPageProps) {
  const { lists, setLists, addList, updateList, deleteList, selectedListId, selectList, 
          addItemToList, updateItemInList, deleteItemFromList } = useListStore();
  
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListColor, setNewListColor] = useState<ListColor>('emerald');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');
  
  const supabase = createClient() as any;
  
  useEffect(() => {
    setLists(initialLists);
  }, [initialLists, setLists]);
  
  const selectedList = lists.find(l => l.id === selectedListId);
  
  // Create new list
  const handleCreateList = async () => {
    if (!newListTitle.trim()) return;
    
    try {
      const validation = listSchema.parse({ 
        title: newListTitle, 
        color: newListColor 
      });
      
      const { data, error } = await supabase
        .from('lists')
        .insert(validation)
        .select()
        .single();
      
      if (error) throw error;
      
      const newList: ListWithItems = { ...data, items: [] };
      addList(newList);
      setNewListTitle('');
      setNewListColor('emerald');
      setIsCreatingList(false);
      if (process.env.NODE_ENV === 'development') {
        console.log('List created successfully');
      }
    } catch (error) {
      console.error('Failed to create list:', error);
    }
  };
  
  // Update list title
  const handleUpdateListTitle = async (listId: string) => {
    if (!editingTitle.trim()) return;
    
    try {
      const { error } = await supabase
        .from('lists')
        .update({ title: editingTitle })
        .eq('id', listId);
      
      if (error) throw error;
      
      updateList(listId, { title: editingTitle });
      setEditingListId(null);
      setEditingTitle('');
      if (process.env.NODE_ENV === 'development') {
        console.log('List updated successfully');
      }
    } catch (error) {
      console.error('Failed to update list:', error);
    }
  };
  
  // Delete list
  const handleDeleteList = async (listId: string) => {
    if (!confirm('Delete this list and all its items?')) return;
    
    try {
      const { error } = await supabase
        .from('lists')
        .delete()
        .eq('id', listId);
      
      if (error) throw error;
      
      deleteList(listId);
      if (selectedListId === listId) selectList(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('List deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete list:', error);
    }
  };
  
  // Add item to list
  const handleAddItem = async (listId: string) => {
    const text = newItemTexts[listId]?.trim();
    if (!text) return;
    
    try {
      const list = lists.find(l => l.id === listId);
      const maxPosition = list?.items.length || 0;
      
      const validation = listItemSchema.parse({ 
        text, 
        completed: false,
        position: maxPosition
      });
      
      const { data, error } = await supabase
        .from('list_items')
        .insert({ 
          list_id: listId, 
          ...validation 
        })
        .select()
        .single();
      
      if (error) throw error;
      
      addItemToList(listId, data);
      setNewItemTexts(prev => ({ ...prev, [listId]: '' }));
      if (process.env.NODE_ENV === 'development') {
        console.log('Item added successfully');
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };
  
  // Toggle item completion
  const handleToggleItem = async (listId: string, item: ListItem) => {
    const newCompleted = !item.completed;
    
    // Optimistic update
    updateItemInList(listId, item.id, { completed: newCompleted });
    
    try {
      const { error } = await supabase
        .from('list_items')
        .update({ completed: newCompleted })
        .eq('id', item.id);
      
      if (error) throw error;
    } catch (error) {
      // Revert on error
      updateItemInList(listId, item.id, { completed: !newCompleted });
      console.error('Failed to toggle item:', error);
    }
  };
  
  // Update item text
  const handleUpdateItemText = async (listId: string, itemId: string) => {
    if (!editingItemText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('list_items')
        .update({ text: editingItemText })
        .eq('id', itemId);
      
      if (error) throw error;
      
      updateItemInList(listId, itemId, { text: editingItemText });
      setEditingItemId(null);
      setEditingItemText('');
      if (process.env.NODE_ENV === 'development') {
        console.log('Item updated successfully');
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };
  
  // Delete item
  const handleDeleteItem = async (listId: string, itemId: string) => {
    try {
      const { error } = await supabase
        .from('list_items')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
      
      deleteItemFromList(listId, itemId);
      if (process.env.NODE_ENV === 'development') {
        console.log('Item deleted successfully');
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };
  
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar - Lists Overview */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Lists</h2>
            <button
              onClick={() => setIsCreatingList(true)}
              className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          
          {isCreatingList && (
            <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <input
                type="text"
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
                placeholder="List title..."
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                autoFocus
              />
              <div className="flex gap-2">
                {(['emerald', 'blue', 'purple', 'amber', 'rose', 'cyan'] as ListColor[]).map(color => (
                  <button
                    key={color}
                    onClick={() => setNewListColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      newListColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600' : ''
                    } ${colorClasses[color].button}`}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateList}
                  className="flex-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-sm rounded-lg transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreatingList(false);
                    setNewListTitle('');
                    setNewListColor('emerald');
                  }}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {lists.map(list => {
            const isSelected = selectedListId === list.id;
            const colors = colorClasses[list.color as ListColor];
            const completedCount = list.items.filter(item => item.completed).length;
            const totalCount = list.items.length;
            
            return (
              <div
                key={list.id}
                onClick={() => selectList(list.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? `${colors.bg} ${colors.border} shadow-sm` 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingListId === list.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateListTitle(list.id);
                          if (e.key === 'Escape') {
                            setEditingListId(null);
                            setEditingTitle('');
                          }
                        }}
                        onBlur={() => handleUpdateListTitle(list.id)}
                        className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        autoFocus
                      />
                    ) : (
                      <h3 className={`font-semibold text-sm truncate ${
                        isSelected ? colors.text : 'text-slate-900 dark:text-white'
                      }`}>
                        {list.title}
                      </h3>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {completedCount} / {totalCount} completed
                    </p>
                  </div>
                  
                  {isSelected && (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingListId(list.id);
                          setEditingTitle(list.title);
                        }}
                        className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      >
                        <Edit2 size={14} className={colors.text} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteList(list.id);
                        }}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          
          {lists.length === 0 && !isCreatingList && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <CheckSquare size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No lists yet</p>
              <p className="text-xs mt-1">Click + to create your first list</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content - List Items */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedList ? (
          <>
            <div className={`p-6 border-b ${colorClasses[selectedList.color as ListColor].border} ${colorClasses[selectedList.color as ListColor].bg}`}>
              <h1 className={`text-2xl font-bold ${colorClasses[selectedList.color as ListColor].text}`}>
                {selectedList.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {selectedList.items.filter(i => i.completed).length} of {selectedList.items.length} tasks completed
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-3">
                {/* Add new item */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemTexts[selectedList.id] || ''}
                    onChange={(e) => setNewItemTexts(prev => ({ ...prev, [selectedList.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddItem(selectedList.id)}
                    placeholder="Add a new task..."
                    className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => handleAddItem(selectedList.id)}
                    className={`px-4 py-3 rounded-lg transition-colors ${colorClasses[selectedList.color as ListColor].button}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>
                
                {/* List items */}
                {selectedList.items
                  .sort((a, b) => (a.position || 0) - (b.position || 0))
                  .map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                        item.completed
                          ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <button
                        onClick={() => handleToggleItem(selectedList.id, item)}
                        className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                          item.completed
                            ? `${colorClasses[selectedList.color as ListColor].button} border-transparent`
                            : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                      >
                        {item.completed && <Check size={16} className="text-white" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        {editingItemId === item.id ? (
                          <input
                            type="text"
                            value={editingItemText}
                            onChange={(e) => setEditingItemText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateItemText(selectedList.id, item.id);
                              if (e.key === 'Escape') {
                                setEditingItemId(null);
                                setEditingItemText('');
                              }
                            }}
                            onBlur={() => handleUpdateItemText(selectedList.id, item.id)}
                            className="w-full px-2 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            autoFocus
                          />
                        ) : (
                          <p className={`${
                            item.completed
                              ? 'line-through text-slate-400 dark:text-slate-600'
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {item.text}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditingItemText(item.text);
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Edit2 size={14} className="text-slate-500 dark:text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(selectedList.id, item.id)}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950 transition-colors"
                        >
                          <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                
                {selectedList.items.length === 0 && (
                  <div className="text-center py-12 text-slate-400 dark:text-slate-600">
                    <Square size={48} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No tasks yet</p>
                    <p className="text-xs mt-1">Add your first task above</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-slate-600">
            <div className="text-center">
              <CheckSquare size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a list to view tasks</p>
              <p className="text-sm mt-2">or create a new list to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
