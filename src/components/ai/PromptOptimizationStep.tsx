'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransparentBackgroundBadge } from './TransparentBackgroundBadge';
import { CheckCircle, Edit3, Sparkles, Loader2 } from 'lucide-react';
import type { OptimizedPrompt } from './PromptWizard';

interface PromptOptimizationStepProps {
  optimizedPrompts: OptimizedPrompt[];
  selectedIndex: number;
  onSelectPrompt: (index: number) => void;
  editedPrompt: string;
  onEditPrompt: (prompt: string) => void;
  originalDescription: string;
  isOptimizing: boolean;
  onRegenerateFromEdit?: (editedText: string) => void;
}

/**
 * Step 2: Choose from AI-optimized prompts or use original description
 * Allows inline editing of selected prompt
 */
export function PromptOptimizationStep({
  optimizedPrompts,
  selectedIndex,
  onSelectPrompt,
  editedPrompt,
  onEditPrompt,
  originalDescription,
  isOptimizing,
  onRegenerateFromEdit,
}: PromptOptimizationStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editBuffer, setEditBuffer] = useState('');

  const handleStartEdit = () => {
    const currentPrompt =
      selectedIndex === -1
        ? originalDescription
        : optimizedPrompts[selectedIndex]?.text || '';
    setEditBuffer(editedPrompt || currentPrompt);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    onEditPrompt(editBuffer);
    setIsEditing(false);
  };

  const handleRegenerateFromEdit = () => {
    if (onRegenerateFromEdit && editBuffer.trim()) {
      onRegenerateFromEdit(editBuffer.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditBuffer('');
  };

  if (isOptimizing) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Generating Optimized Prompts...
          </h3>
          <p className="text-sm text-gray-600 max-w-md">
            Our AI is analyzing your description and creating multiple
            variations optimized for vibrant, print-ready images with
            transparent backgrounds.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-purple-900 mb-1">
              Choose Your Optimized Prompt
            </h3>
            <p className="text-sm text-purple-700">
              Select the variation that best matches your vision, or use your
              original description. You can also edit any prompt to fine-tune
              it.
            </p>
          </div>
        </div>
      </Card>

      {/* Optimized Prompts */}
      {optimizedPrompts.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI-Optimized Variations
          </h4>

          {optimizedPrompts.map((prompt, index) => (
            <Card
              key={index}
              className={`p-4 cursor-pointer transition-all border-2 ${
                selectedIndex === index && !editedPrompt
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => {
                onSelectPrompt(index);
                onEditPrompt(''); // Clear any edits when selecting a new prompt
                setIsEditing(false);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedIndex === index && !editedPrompt
                        ? 'border-primary-500 bg-primary-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedIndex === index && !editedPrompt && (
                      <CheckCircle className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                        Variation {index + 1}
                      </span>
                      <TransparentBackgroundBadge size="sm" />
                    </div>
                    {prompt.focus && (
                      <span className="text-xs text-gray-600 italic whitespace-nowrap">
                        Focus: {prompt.focus}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-800 leading-relaxed">
                    {prompt.text}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Original Description Option */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">
          Or Use Your Original Description
        </h4>
        <Card
          className={`p-4 cursor-pointer transition-all border-2 ${
            selectedIndex === -1 && !editedPrompt
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          onClick={() => {
            onSelectPrompt(-1);
            onEditPrompt('');
            setIsEditing(false);
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedIndex === -1 && !editedPrompt
                    ? 'border-primary-500 bg-primary-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedIndex === -1 && !editedPrompt && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                  Original
                </span>
                <TransparentBackgroundBadge size="sm" />
              </div>
              <p className="text-sm text-gray-800 leading-relaxed">
                {originalDescription}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Edit Section */}
      {!isEditing && (
        <Card className="p-4 bg-gray-50 border-dashed">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleStartEdit}
            disabled={selectedIndex === -2} // No selection yet
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Selected Prompt
          </Button>
          <p className="text-xs text-gray-600 mt-2">
            Want to fine-tune the selected prompt? Click to edit and customize
            it.
          </p>
        </Card>
      )}

      {isEditing && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-blue-900">
                Edit Your Prompt
              </h4>
              <TransparentBackgroundBadge size="sm" />
            </div>

            <textarea
              value={editBuffer}
              onChange={e => setEditBuffer(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={4000}
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-gray-600">
                {editBuffer.length}/4000 characters
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                {onRegenerateFromEdit && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerateFromEdit}
                    disabled={!editBuffer.trim()}
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Re-Generate
                  </Button>
                )}
                <Button variant="default" size="sm" onClick={handleSaveEdit}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Use This
                </Button>
              </div>
            </div>

            {onRegenerateFromEdit && (
              <p className="text-xs text-blue-700 mt-2">
                <strong>Tip:</strong> Click "Re-Generate" to get 4 new
                AI-optimized variations based on your edits, or "Use This" to
                use your edited prompt as-is.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Edited Prompt Display */}
      {editedPrompt && !isEditing && (
        <Card className="p-4 bg-success-50 border-success-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-sm font-semibold text-success-900">
                  Your Custom Prompt
                </h4>
                <TransparentBackgroundBadge size="sm" />
              </div>
              <p className="text-sm text-gray-800 leading-relaxed mb-2">
                {editedPrompt}
              </p>
              <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                <Edit3 className="w-3 h-3 mr-1" />
                Edit Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* What Happens Next */}
      <Card className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h4 className="font-semibold text-purple-900 mb-1">
              Next: Configure & Generate
            </h4>
            <p className="text-sm text-purple-700">
              Choose your image size, quality level, and style. Then generate
              your image with transparent background - perfect for DTF printing!
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
