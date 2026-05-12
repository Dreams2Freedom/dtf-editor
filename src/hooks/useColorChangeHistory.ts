'use client';

import { useState, useCallback } from 'react';
import { ColorChangeEntry } from '@/types/colorChange';

const MAX_HISTORY = 20;

export function useColorChangeHistory() {
  const [undoStack, setUndoStack] = useState<ColorChangeEntry[]>([]);
  const [redoStack, setRedoStack] = useState<ColorChangeEntry[]>([]);

  const pushChange = useCallback((entry: ColorChangeEntry) => {
    setUndoStack(prev => {
      const next = [...prev, entry];
      if (next.length > MAX_HISTORY) {
        return next.slice(next.length - MAX_HISTORY);
      }
      return next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback((): ColorChangeEntry | null => {
    let entry: ColorChangeEntry | null = null;
    setUndoStack(prev => {
      if (prev.length === 0) return prev;
      entry = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (entry) {
      setRedoStack(prev => [...prev, entry!]);
    }
    return entry;
  }, []);

  const redo = useCallback((): ColorChangeEntry | null => {
    let entry: ColorChangeEntry | null = null;
    setRedoStack(prev => {
      if (prev.length === 0) return prev;
      entry = prev[prev.length - 1];
      return prev.slice(0, -1);
    });
    if (entry) {
      setUndoStack(prev => [...prev, entry!]);
    }
    return entry;
  }, []);

  const removeEntry = useCallback((id: string): ColorChangeEntry | null => {
    let removed: ColorChangeEntry | null = null;
    setUndoStack(prev => {
      const idx = prev.findIndex(e => e.id === id);
      if (idx === -1) return prev;
      removed = prev[idx];
      return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
    });
    return removed;
  }, []);

  const resetAll = useCallback((): ColorChangeEntry[] => {
    let all: ColorChangeEntry[] = [];
    setUndoStack(prev => {
      all = [...prev];
      return [];
    });
    setRedoStack([]);
    return all;
  }, []);

  return {
    changes: undoStack,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    changeCount: undoStack.length,
    pushChange,
    undo,
    redo,
    removeEntry,
    resetAll,
  };
}
