'use client';

import React from 'react';
import { Edit2, User, Sparkles } from 'lucide-react';

export interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  onEdit?: (id: string) => void;
  isEditable?: boolean;
}

/**
 * ChatMessage Component
 * Displays individual message bubbles in the conversational interface
 * - User messages: right-aligned, blue background
 * - AI messages: left-aligned, gray background
 */
export function ChatMessage({
  id,
  role,
  content,
  timestamp,
  onEdit,
  isEditable = false,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-purple-500 text-white'
        }`}
      >
        {isUser ? (
          <User className="w-5 h-5" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
      </div>

      {/* Message Bubble */}
      <div
        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[80%]`}
      >
        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-blue-500 text-white rounded-tr-sm'
              : 'bg-gray-100 text-gray-900 rounded-tl-sm'
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {content}
          </p>
        </div>

        {/* Metadata Row */}
        <div
          className={`flex items-center gap-2 mt-1 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
          <span className="text-xs text-gray-500">{formattedTime}</span>

          {/* Edit Button (only for user messages) */}
          {isUser && isEditable && onEdit && (
            <button
              onClick={() => onEdit(id)}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
              aria-label="Edit message"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
