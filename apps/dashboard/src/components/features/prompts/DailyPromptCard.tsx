'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, Bookmark, Zap, Play } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { usePromptStore } from '@/store/usePromptStore';
import './DailyPromptCard.css';

interface DailyPromptCardProps {
  // We can pass current prompts to check if already saved
  userPrompts?: any[];
}

export function DailyPromptCard({ userPrompts = [] }: DailyPromptCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const { setPrompts } = usePromptStore();

  const dailyPromptData = {
    title: "Vibrant 3D Product Shot",
    content: `Create a hyper-realistic 3D commercial-style product shot of a [main bottled beverage or product], floating mid-air with detailed cold condensation on its surface. Surround it with dynamic elements like [splashing elements or garnish], frozen in high-speed motion with vibrant clarity and natural physics. Add sharp droplets, [floating accent ingredient or object], and vivid details to convey freshness and energy. Use [background color or gradient] to amplify the brand tone, and emphasize a clean, luxurious, premium look. Studio-style cinematic lighting with bright highlights, crisp reflections, and high contrast. Product must always be centered, upright or slightly angled in mid-air, casting subtle shadows or reflections.

Aspect ratio: 3:4. Ultra-HD quality. Photographic realism.`,
    imageHint: "/daily-prompt-hint.png"
  };

  useEffect(() => {
    // Check if this specific prompt is already in user's library
    const exists = userPrompts.some(p => p.title === dailyPromptData.title);
    setIsSaved(exists);

    // Initial check for daily flip
    const today = new Date().toDateString();
    const lastFlipped = localStorage.getItem('brainbox_daily_flipped_date');
    if (lastFlipped === today) {
      setIsRevealed(true);
      setIsFlipped(true);
    }
  }, [userPrompts]);

  const handleFlip = () => {
    if (!isRevealed) {
      // First reveal today: unfrost then flip
      setIsRevealed(true);
      const today = new Date().toDateString();
      localStorage.setItem('brainbox_daily_flipped_date', today);
      
      setTimeout(() => {
        setIsFlipped(true);
      }, 1200);
    } else {
      // Already revealed: toggle flip
      setIsFlipped(!isFlipped);
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(dailyPromptData.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToPrompts = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) return;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert('Please login to save prompts');
        return;
      }

      const { data, error } = await (supabase
        .from('prompts') as any)
        .insert({
          user_id: user.id,
          title: dailyPromptData.title,
          content: dailyPromptData.content,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setIsSaved(true);
      
      // Refresh local store
      const { data: allPrompts } = await supabase
        .from('prompts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (allPrompts) {
        setPrompts(allPrompts);
      }
      
    } catch (error) {
      console.error('Error saving prompt:', error);
      alert('Failed to save prompt');
    }
  };

  const formatPrompt = (text: string) => {
    return text.split(/(\[.*?\])/g).map((part, i) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return <span key={i} className="prompt-placeholder">{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`daily-prompt-container ${isRevealed ? 'is-revealed' : ''}`} onClick={handleFlip}>
      <div className={`daily-prompt-card ${isFlipped ? 'is-flipped' : ''}`}>
        {/* Front Side */}
        <div className="daily-prompt-front">
          <div 
            className="daily-prompt-front-bg" 
            style={{ backgroundImage: `url(${dailyPromptData.imageHint})` }}
          />
          <div className="daily-prompt-front-content">
            <div className="daily-prompt-mystery-icon">✨</div>
            <h3>Daily Masterpiece</h3>
            <p>Click to reveal today's premium selection</p>
          </div>
        </div>

        {/* Back Side */}
        <div className="daily-prompt-back">
          <div className="daily-prompt-back-header">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-orange-400" />
              <span>Premium Prompt</span>
            </div>
            <button 
              className={`btn-save-mini ${isSaved ? 'is-saved' : ''}`}
              onClick={handleSaveToPrompts}
              title={isSaved ? "Saved to your library" : "Save to library"}
            >
              <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>
          
          <div className="daily-prompt-back-body">
            <div className="daily-prompt-content-text">
              {formatPrompt(dailyPromptData.content)}
            </div>
          </div>

          <div className="daily-prompt-back-footer">
            <button className="btn-premium w-full justify-center" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={16} />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
