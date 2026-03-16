import { useState, useCallback, useRef, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableNodeProps {
  initialPosition: Position;
  onPositionChange: (position: Position) => void;
  zoom: number;
}

export function useDraggableNode({ 
  initialPosition, 
  onPositionChange,
  zoom 
}: UseDraggableNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(initialPosition);
  const dragStart = useRef<Position | null>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Sync with external position changes
  useEffect(() => {
    if (!isDragging) {
      setPosition(initialPosition);
    }
  }, [initialPosition, isDragging]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left mouse button and if target is drag handle
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    const isDragHandle = target.closest('[data-drag-handle]');
    if (!isDragHandle) return;

    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX / zoom - position.x,
      y: e.clientY / zoom - position.y
    };
  }, [position, zoom]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStart.current) return;

    const newX = e.clientX / zoom - dragStart.current.x;
    const newY = e.clientY / zoom - dragStart.current.y;

    // Clamp to positive values
    const clampedPosition = {
      x: Math.max(0, newX),
      y: Math.max(0, newY)
    };

    setPosition(clampedPosition);
  }, [isDragging, zoom]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onPositionChange(position);
      dragStart.current = null;
    }
  }, [isDragging, position, onPositionChange]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    position,
    isDragging,
    nodeRef,
    handleMouseDown
  };
}
