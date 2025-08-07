'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { enhancePromptForDTF, getPromptSuggestions } from '@/utils/promptHelpers';

interface PromptBuilderProps {
  onPromptChange: (prompt: string) => void;
  initialPrompt?: string;
}

export function PromptBuilder({ onPromptChange, initialPrompt = '' }: PromptBuilderProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedCategory, setSelectedCategory] = useState<
    'general' | 'fashion' | 'sports' | 'nature' | 'abstract' | 'vintage'
  >('general');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const categories = [
    { id: 'general', label: 'General', icon: '🎨' },
    { id: 'fashion', label: 'Fashion', icon: '👗' },
    { id: 'sports', label: 'Sports', icon: '⚽' },
    { id: 'nature', label: 'Nature', icon: '🌿' },
    { id: 'abstract', label: 'Abstract', icon: '🌀' },
    { id: 'vintage', label: 'Vintage', icon: '📻' },
  ] as const;

  const suggestions = getPromptSuggestions(selectedCategory);

  const handlePromptChange = (value: string) => {
    setPrompt(value);
    onPromptChange(value);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handlePromptChange(suggestion);
    setShowSuggestions(false);
  };

  const enhancePrompt = () => {
    const enhanced = enhancePromptForDTF(prompt);
    handlePromptChange(enhanced);
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium mb-2">
          Describe Your Image
        </label>
        <div className="relative">
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            placeholder="Enter a detailed description of the image you want to generate..."
            className="w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            rows={4}
            maxLength={4000}
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {prompt.length}/4000
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={enhancePrompt}
          disabled={!prompt}
        >
          Enhance for DTF Printing
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          {showSuggestions ? 'Hide' : 'Show'} Suggestions
        </Button>
        {prompt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePromptChange('')}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Category Selection and Suggestions */}
      {showSuggestions && (
        <Card className="p-4">
          <h3 className="font-medium mb-3">Prompt Suggestions</h3>
          
          {/* Categories */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>

          {/* Suggestions List */}
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Prompt Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-blue-900 mb-1">Tips for Better Results:</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Be specific about colors, style, and composition</li>
          <li>• Mention if you want vector, realistic, or cartoon style</li>
          <li>• Include details about the background (or specify "white background")</li>
          <li>• For DTF printing, mention "high contrast" and "clean edges"</li>
        </ul>
      </div>
    </div>
  );
}