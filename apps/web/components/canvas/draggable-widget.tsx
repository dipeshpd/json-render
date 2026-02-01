"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Renderer } from "@json-render/react";
import { X, GripVertical } from "lucide-react";
import { demoRegistry, fallbackComponent } from "@/components/demo/index";
import type { CanvasWidget, WidgetPosition } from "./types";
import { cn } from "@/lib/utils";

interface DraggableWidgetProps {
  widget: CanvasWidget;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (position: WidgetPosition) => void;
  onRemove: () => void;
}

export function DraggableWidget({
  widget,
  isSelected,
  onSelect,
  onPositionChange,
  onRemove,
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const positionRef = useRef<WidgetPosition>(widget.position);

  // Update position ref when widget position changes
  positionRef.current = widget.position;

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // Only handle left mouse button and drag handle
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const isDragHandle = target.closest("[data-drag-handle]");

      if (!isDragHandle) {
        onSelect();
        return;
      }

      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX - positionRef.current.x,
        y: e.clientY - positionRef.current.y,
      };

      // Capture pointer for tracking outside element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [onSelect],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current) return;

      e.preventDefault();

      const newPosition: WidgetPosition = {
        x: Math.max(0, e.clientX - dragStartRef.current.x),
        y: Math.max(0, e.clientY - dragStartRef.current.y),
      };

      onPositionChange(newPosition);
    },
    [isDragging, onPositionChange],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      setIsDragging(false);
      dragStartRef.current = null;

      // Release pointer capture
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [isDragging],
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove],
  );

  const hasContent =
    widget.tree.root && Object.keys(widget.tree.elements).length > 0;

  return (
    <div
      className={cn(
        "absolute group",
        "rounded-lg border bg-card text-card-foreground shadow-lg",
        "min-w-[280px] max-w-[600px]",
        "transition-shadow duration-200",
        isSelected &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDragging && "shadow-2xl cursor-grabbing z-50",
        !isDragging && "cursor-default",
      )}
      style={{
        left: widget.position.x,
        top: widget.position.y,
        touchAction: "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={onSelect}
    >
      {/* Widget header with drag handle */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2 border-b",
          "bg-muted/50 rounded-t-lg",
        )}
      >
        <div
          data-drag-handle
          className={cn(
            "flex items-center gap-2 cursor-grab active:cursor-grabbing",
            "text-muted-foreground hover:text-foreground transition-colors",
            "select-none",
          )}
        >
          <GripVertical className="h-4 w-4" />
          <span className="text-xs font-medium truncate max-w-[200px]">
            {widget.prompt}
          </span>
        </div>

        <button
          onClick={handleRemoveClick}
          className={cn(
            "p-1 rounded-md",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "hover:bg-destructive/10 hover:text-destructive",
            "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive",
          )}
          aria-label="Remove widget"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Widget content */}
      <div className="p-4 overflow-auto max-h-[400px]">
        {widget.status === "generating" && !hasContent && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          </div>
        )}

        {widget.status === "error" && (
          <div className="flex flex-col items-center justify-center py-8 text-destructive">
            <span className="text-sm font-medium">Generation failed</span>
            {widget.error && (
              <span className="text-xs mt-1 text-muted-foreground">
                {widget.error}
              </span>
            )}
          </div>
        )}

        {hasContent && (
          <Renderer
            tree={widget.tree}
            registry={demoRegistry}
            fallback={fallbackComponent}
          />
        )}
      </div>

      {/* Status indicator */}
      {widget.status === "generating" && hasContent && (
        <div className="absolute bottom-2 right-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
}
