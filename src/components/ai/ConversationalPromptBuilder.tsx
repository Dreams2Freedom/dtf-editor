'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ChatMessage, ChatMessageProps } from './ChatMessage';
import {
  Send,
  Loader2,
  CheckCircle,
  ArrowRight,
  Edit3,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationState {
  messages: Message[];
  isTyping: boolean;
  isComplete: boolean;
  finalPrompt: string | null;
  progress: { current: number; total: number };
  quickReplies: string[];
}

interface ConversationalPromptBuilderProps {
  onComplete: (prompt: string) => void;
  onCancel?: () => void;
  initialMessage?: string;
}

const STORAGE_KEY = 'ai_conversation_state';

/**
 * ConversationalPromptBuilder Component
 * ChatGPT-style conversational interface for building AI image prompts
 * Features:
 * - Message bubbles (user/AI)
 * - Typing indicator
 * - Quick reply buttons
 * - Progress tracking
 * - Final prompt preview
 * - localStorage persistence
 */
export function ConversationalPromptBuilder({
  onComplete,
  onCancel,
  initialMessage,
}: ConversationalPromptBuilderProps) {
  const [state, setState] = useState<ConversationState>({
    messages: [],
    isTyping: false,
    isComplete: false,
    finalPrompt: null,
    progress: { current: 0, total: 5 },
    quickReplies: [],
  });

  const [userInput, setUserInput] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedFinalPrompt, setEditedFinalPrompt] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  // Use scrollTop instead of scrollIntoView to prevent page scroll
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isTyping]);

  // Load saved conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Only recover if less than 1 hour old
        if (Date.now() - (data.timestamp || 0) < 3600000) {
          setState({
            messages: data.messages || [],
            isTyping: false,
            isComplete: data.isComplete || false,
            finalPrompt: data.finalPrompt || null,
            progress: data.progress || { current: 0, total: 5 },
            quickReplies: data.quickReplies || [],
          });

          toast.success('Conversation restored from previous session');
          return;
        }
      } catch (error) {
        console.error('Failed to load saved conversation:', error);
      }
    }

    // No saved conversation - start fresh with initial greeting
    if (initialMessage) {
      // User provided initial description - send it immediately
      sendMessage(initialMessage);
    } else {
      // Show greeting
      addAIMessage(
        "👋 Hi! I'm your AI prompt assistant. Tell me what image you'd like to create, and I'll ask a few questions to make it perfect!",
        [],
        { current: 0, total: 5 }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (state.messages.length > 0) {
      const dataToSave = {
        messages: state.messages,
        isComplete: state.isComplete,
        finalPrompt: state.finalPrompt,
        progress: state.progress,
        quickReplies: state.quickReplies,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [state]);

  // Add AI message to conversation
  const addAIMessage = (
    content: string,
    quickReplies: string[] = [],
    progress: { current: number; total: number }
  ) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant' as const,
          content,
          timestamp: Date.now(),
        },
      ],
      quickReplies,
      progress,
      isTyping: false,
    }));
  };

  // Add user message to conversation
  const addUserMessage = (content: string) => {
    setState(prev => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `user-${Date.now()}`,
          role: 'user' as const,
          content,
          timestamp: Date.now(),
        },
      ],
      quickReplies: [], // Clear quick replies after user responds
    }));
  };

  // Send message to AI
  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    addUserMessage(message);
    setUserInput('');
    setState(prev => ({ ...prev, isTyping: true }));

    try {
      // Build conversation history for API
      const conversationHistory = state.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call API
      const response = await fetch('/api/generate/conversational-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationHistory,
          userMessage: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get AI response');
      }

      const data = await response.json();

      // Add AI response
      addAIMessage(
        data.message,
        data.quickReplies || [],
        data.progress || state.progress
      );

      // Check if conversation is complete
      if (data.isComplete && data.finalPrompt) {
        setState(prev => ({
          ...prev,
          isComplete: true,
          finalPrompt: data.finalPrompt,
        }));
        setEditedFinalPrompt(data.finalPrompt);
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || 'Failed to get AI response');
      setState(prev => ({ ...prev, isTyping: false }));
    }
  };

  // Handle quick reply button click
  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // Handle "Skip" button
  const handleSkip = () => {
    sendMessage("I'd like to skip this question");
  };

  // Handle "I'm done" button
  const handleDone = () => {
    sendMessage("I'm done, let's generate the image");
  };

  // Handle final prompt confirmation
  const handleConfirmPrompt = () => {
    const promptToUse = isEditingPrompt ? editedFinalPrompt : state.finalPrompt;
    if (promptToUse) {
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      // Call onComplete
      onComplete(promptToUse);
    }
  };

  // Handle edit message (future enhancement)
  const handleEditMessage = (id: string) => {
    // TODO: Implement edit functionality
    toast('Edit feature coming soon!', { icon: '🚧' });
  };

  // Handle reset conversation
  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      messages: [],
      isTyping: false,
      isComplete: false,
      finalPrompt: null,
      progress: { current: 0, total: 5 },
      quickReplies: [],
    });
    setUserInput('');
    // Restart with greeting
    addAIMessage(
      "👋 Hi! I'm your AI prompt assistant. Tell me what image you'd like to create, and I'll ask a few questions to make it perfect!",
      [],
      { current: 0, total: 5 }
    );
  };

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      {state.messages.length > 0 && !state.isComplete && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-purple-900">
              Building Your Prompt
            </span>
            <span className="text-purple-600 font-semibold">
              {state.progress.current} of {state.progress.total} questions
            </span>
          </div>
          <div className="w-full bg-purple-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
              style={{
                width: `${(state.progress.current / state.progress.total) * 100}%`,
              }}
            />
          </div>
        </Card>
      )}

      {/* Chat Messages */}
      <Card
        ref={chatContainerRef}
        className="p-6 min-h-[400px] max-h-[600px] overflow-y-auto bg-white"
      >
        {/* Messages List */}
        <div className="space-y-1">
          {state.messages.map(msg => (
            <ChatMessage
              key={msg.id}
              id={msg.id}
              role={msg.role === 'assistant' ? 'assistant' : 'user'}
              content={msg.content}
              timestamp={msg.timestamp}
              onEdit={handleEditMessage}
              isEditable={!state.isComplete}
            />
          ))}

          {/* Typing Indicator */}
          {state.isTyping && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Final Prompt Preview (when complete) */}
      {state.isComplete && state.finalPrompt && (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-300">
          <div className="flex items-start gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-green-900 text-lg">
                Perfect! Your prompt is ready
              </h3>
              <p className="text-sm text-green-700">
                Based on our conversation, here's what I'll generate:
              </p>
            </div>
          </div>

          {/* Prompt Display/Edit */}
          {isEditingPrompt ? (
            <div className="space-y-3">
              <textarea
                value={editedFinalPrompt}
                onChange={e => setEditedFinalPrompt(e.target.value)}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditingPrompt(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setIsEditingPrompt(false)}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 mb-4 border border-green-200">
              <p className="text-gray-800 leading-relaxed">
                {editedFinalPrompt || state.finalPrompt}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditingPrompt(true)}
              disabled={isEditingPrompt}
            >
              <Edit3 className="w-4 h-4 mr-1" />
              Edit Prompt
            </Button>
            <Button variant="secondary" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Start Over
            </Button>
            <Button
              variant="default"
              size="lg"
              className="flex-1 shadow-lg"
              onClick={handleConfirmPrompt}
            >
              ✨ Generate Image (1 credit)
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Replies */}
      {!state.isComplete &&
        state.quickReplies.length > 0 &&
        !state.isTyping && (
          <div className="flex flex-wrap gap-2">
            {state.quickReplies.map((reply, index) => (
              <button
                key={index}
                onClick={() => handleQuickReply(reply)}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-all hover:shadow-md"
              >
                ⚡ {reply}
              </button>
            ))}
            <button
              onClick={handleSkip}
              className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-full text-sm transition-all"
            >
              Skip
            </button>
            {state.progress.current >= 3 && (
              <button
                onClick={handleDone}
                className="px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-full text-sm font-medium transition-all"
              >
                I'm done, let's generate! ✨
              </button>
            )}
          </div>
        )}

      {/* Input Box (when not complete) */}
      {!state.isComplete && (
        <Card className="p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={e => setUserInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(userInput);
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
              disabled={state.isTyping}
            />
            <Button
              variant="default"
              size="lg"
              onClick={() => sendMessage(userInput)}
              disabled={!userInput.trim() || state.isTyping}
              className="self-end"
            >
              {state.isTyping ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </Card>
      )}

      {/* Cancel Button */}
      {onCancel && (
        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-600 hover:text-gray-900 underline"
          >
            Switch to Upload Image
          </button>
        </div>
      )}
    </div>
  );
}
