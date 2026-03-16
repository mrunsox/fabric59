import { useState, useCallback, useRef } from 'react';

interface Position {
  x: number;
  y: number;
}

interface ConnectionDrawingState {
  isDrawing: boolean;
  sourceNodeId: string | null;
  sourcePosition: Position | null;
  currentPosition: Position | null;
}

interface UseConnectionDrawingProps {
  zoom: number;
  canvasPan: Position;
  onConnectionComplete: (sourceNodeId: string, targetNodeId: string) => void;
}

export function useConnectionDrawing({ 
  zoom, 
  canvasPan, 
  onConnectionComplete 
}: UseConnectionDrawingProps) {
  const [state, setState] = useState<ConnectionDrawingState>({
    isDrawing: false,
    sourceNodeId: null,
    sourcePosition: null,
    currentPosition: null
  });
  
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const startDrawing = useCallback((nodeId: string, sourceX: number, sourceY: number) => {
    setState({
      isDrawing: true,
      sourceNodeId: nodeId,
      sourcePosition: { x: sourceX, y: sourceY },
      currentPosition: { x: sourceX, y: sourceY }
    });
  }, []);

  const updateDrawing = useCallback((clientX: number, clientY: number) => {
    if (!state.isDrawing || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - canvasPan.x) / zoom;
    const y = (clientY - rect.top - canvasPan.y) / zoom;
    
    setState(prev => ({
      ...prev,
      currentPosition: { x, y }
    }));
  }, [state.isDrawing, zoom, canvasPan]);

  const endDrawing = useCallback((targetNodeId?: string) => {
    if (state.isDrawing && state.sourceNodeId && targetNodeId && targetNodeId !== state.sourceNodeId) {
      onConnectionComplete(state.sourceNodeId, targetNodeId);
    }
    
    setState({
      isDrawing: false,
      sourceNodeId: null,
      sourcePosition: null,
      currentPosition: null
    });
  }, [state.isDrawing, state.sourceNodeId, onConnectionComplete]);

  const cancelDrawing = useCallback(() => {
    setState({
      isDrawing: false,
      sourceNodeId: null,
      sourcePosition: null,
      currentPosition: null
    });
  }, []);

  return {
    ...state,
    canvasRef,
    startDrawing,
    updateDrawing,
    endDrawing,
    cancelDrawing
  };
}
