import { useState, useCallback, useRef } from 'react';
import { FlowNode, FlowEdge } from '@/components/tree-editor/flow/types';

interface HistoryState {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

interface UseEditorHistoryReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  pushState: (state: HistoryState) => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;

export function useEditorHistory(): UseEditorHistoryReturn {
  const [pastStates, setPastStates] = useState<HistoryState[]>([]);
  const [futureStates, setFutureStates] = useState<HistoryState[]>([]);
  const isUndoRedoRef = useRef(false);

  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const pushState = useCallback((state: HistoryState) => {
    // Don't push if this is part of an undo/redo operation
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    setPastStates(prev => {
      const newPast = [...prev, state];
      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        return newPast.slice(-MAX_HISTORY_SIZE);
      }
      return newPast;
    });
    // Clear future when new action is performed
    setFutureStates([]);
  }, []);

  const undo = useCallback((): HistoryState | null => {
    if (pastStates.length === 0) return null;

    const previousState = pastStates[pastStates.length - 1];
    const currentState: HistoryState = {
      nodes: [],
      edges: [],
    };

    isUndoRedoRef.current = true;
    
    setPastStates(prev => prev.slice(0, -1));
    setFutureStates(prev => [currentState, ...prev]);

    return previousState;
  }, [pastStates]);

  const redo = useCallback((): HistoryState | null => {
    if (futureStates.length === 0) return null;

    const nextState = futureStates[0];
    
    isUndoRedoRef.current = true;
    
    setFutureStates(prev => prev.slice(1));
    setPastStates(prev => [...prev, nextState]);

    return nextState;
  }, [futureStates]);

  const clearHistory = useCallback(() => {
    setPastStates([]);
    setFutureStates([]);
  }, []);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    pushState,
    clearHistory,
  };
}
