'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { promptSchema, type PromptFormData } from '@/lib/validation/prompt';
import { usePromptStore } from '@/store/usePromptStore';
import { createClient } from '@/lib/supabase/client';
import { X, Check } from 'lucide-react';
import { Prompt } from '@/types';

interface CreatePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPrompt?: Prompt | null;
}

const PRESET_COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Lime', hex: '#84cc16' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Sky', hex: '#0ea5e9' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Fuchsia', hex: '#d946ef' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Rose', hex: '#f43f5e' },
];

export function CreatePromptModal({ isOpen, onClose, editingPrompt }: CreatePromptModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addPrompt, updatePrompt } = usePromptStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<PromptFormData>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      title: '',
      content: '',
      color: '#6366f1',
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (editingPrompt) {
      setValue('title', editingPrompt.title);
      setValue('content', editingPrompt.content);
      setValue('color', editingPrompt.color || '#6366f1');
    } else {
      reset();
    }
  }, [editingPrompt, reset, setValue]);

  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: PromptFormData) => {
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('User not authenticated');
        return;
      }

      if (editingPrompt) {
        // Update existing prompt
        const updateData = {
          title: data.title,
          content: data.content,
          color: data.color,
          updated_at: new Date().toISOString(),
        };

        const result = await (supabase as any)
          .from('prompts')
          .update(updateData)
          .eq('id', editingPrompt.id)
          .select()
          .single();

        if (result.error) {
          console.error('Error updating prompt:', result.error);
          return;
        }

        // Update store with returned data
        if (result.data) {
          updatePrompt(editingPrompt.id, result.data);
        }
      } else {
        // Create new prompt
        const newPrompt = {
          user_id: user.id,
          title: data.title,
          content: data.content,
          color: data.color,
        };

        const result = await (supabase as any)
          .from('prompts')
          .insert(newPrompt)
          .select()
          .single();

        if (result.error) {
          console.error('Error creating prompt:', result.error);
          return;
        }

        // Add to store with returned data from Supabase
        if (result.data) {
          addPrompt(result.data);
        }
      }

      reset();
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Title Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-destructive">*</span>
            </label>
            <input
              {...register('title')}
              type="text"
              placeholder="e.g., Code Review Assistant"
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.title && (
              <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Content Field */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Content <span className="text-destructive">*</span>
            </label>
            <textarea
              {...register('content')}
              rows={10}
              placeholder="Enter your prompt here..."
              className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            {errors.content && (
              <p className="text-sm text-destructive mt-1">{errors.content.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {watch('content')?.length || 0} characters
            </p>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Color <span className="text-destructive">*</span>
            </label>
            <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setValue('color', color.hex)}
                  className={`w-10 h-10 rounded-md transition-all ${
                    selectedColor === color.hex
                      ? 'ring-2 ring-offset-2 ring-primary scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                >
                  {selectedColor === color.hex && (
                    <Check className="w-5 h-5 text-white mx-auto drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
            {errors.color && (
              <p className="text-sm text-destructive mt-2">{errors.color.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingPrompt ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
