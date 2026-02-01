"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Renderer, JSONUIProvider } from "@json-render/react";
import { X, GripVertical, Maximize2, Minimize2 } from "lucide-react";
import { demoRegistry, fallbackComponent } from "@/components/demo/index";
import type { CanvasWidget, WidgetPosition, WidgetDimensions } from "./types";
import { GRID_SIZE, SIZE_PRESETS } from "./types";
import { cn } from "@/lib/utils";

type ResizeHandle = "nw" | "ne" | "sw" | "se";

interface DraggableWidgetProps {
  widget: CanvasWidget;
  isSelected: boolean;
  onSelect: () => void;
  onPositionChange: (position: WidgetPosition) => void;
  onDimensionsChange: (dimensions: WidgetDimensions) => void;
  onRemove: () => void;
}

/**
 * Snap a value to the grid
 */
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export function DraggableWidget({
  widget,
  isSelected,
  onSelect,
  onPositionChange,
  onDimensionsChange,
  onRemove,
}: DraggableWidgetProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
  const [previousDimensions, setPreviousDimensions] =
    useState<WidgetDimensions | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    width: number;
    height: number;
    posX: number;
    posY: number;
  } | null>(null);
  const positionRef = useRef<WidgetPosition>(widget.position);
  const dimensionsRef = useRef<WidgetDimensions>(widget.dimensions);

  // Update refs when widget changes
  positionRef.current = widget.position;
  dimensionsRef.current = widget.dimensions;

  // Minimum dimensions
  const minWidth = SIZE_PRESETS.small.width;
  const minHeight = SIZE_PRESETS.small.height;

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // Only handle left mouse button
      if (e.button !== 0) return;

      const target = e.target as HTMLElement;
      const isDragHandle = target.closest("[data-drag-handle]");
      const resizeHandle = target.closest("[data-resize-handle]");

      if (resizeHandle) {
        // Start resizing
        e.preventDefault();
        e.stopPropagation();

        const handle = resizeHandle.getAttribute(
          "data-resize-handle",
        ) as ResizeHandle;
        setIsResizing(true);
        setActiveHandle(handle);

        resizeStartRef.current = {
          mouseX: e.clientX,
          mouseY: e.clientY,
          width: dimensionsRef.current.width,
          height: dimensionsRef.current.height,
          posX: positionRef.current.x,
          posY: positionRef.current.y,
        };

        target.setPointerCapture(e.pointerId);
        return;
      }

      if (isDragHandle) {
        // Start dragging
        e.preventDefault();
        e.stopPropagation();

        setIsDragging(true);
        dragStartRef.current = {
          x: e.clientX - positionRef.current.x,
          y: e.clientY - positionRef.current.y,
        };

        target.setPointerCapture(e.pointerId);
        return;
      }

      // Select widget
      onSelect();
    },
    [onSelect],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (isResizing && resizeStartRef.current && activeHandle) {
        e.preventDefault();

        const deltaX = e.clientX - resizeStartRef.current.mouseX;
        const deltaY = e.clientY - resizeStartRef.current.mouseY;

        let newWidth = resizeStartRef.current.width;
        let newHeight = resizeStartRef.current.height;
        let newX = resizeStartRef.current.posX;
        let newY = resizeStartRef.current.posY;

        // Calculate new dimensions based on handle
        switch (activeHandle) {
          case "se":
            newWidth = Math.max(
              minWidth,
              resizeStartRef.current.width + deltaX,
            );
            newHeight = Math.max(
              minHeight,
              resizeStartRef.current.height + deltaY,
            );
            break;
          case "sw":
            newWidth = Math.max(
              minWidth,
              resizeStartRef.current.width - deltaX,
            );
            newHeight = Math.max(
              minHeight,
              resizeStartRef.current.height + deltaY,
            );
            if (newWidth > minWidth) {
              newX = resizeStartRef.current.posX + deltaX;
            }
            break;
          case "ne":
            newWidth = Math.max(
              minWidth,
              resizeStartRef.current.width + deltaX,
            );
            newHeight = Math.max(
              minHeight,
              resizeStartRef.current.height - deltaY,
            );
            if (newHeight > minHeight) {
              newY = resizeStartRef.current.posY + deltaY;
            }
            break;
          case "nw":
            newWidth = Math.max(
              minWidth,
              resizeStartRef.current.width - deltaX,
            );
            newHeight = Math.max(
              minHeight,
              resizeStartRef.current.height - deltaY,
            );
            if (newWidth > minWidth) {
              newX = resizeStartRef.current.posX + deltaX;
            }
            if (newHeight > minHeight) {
              newY = resizeStartRef.current.posY + deltaY;
            }
            break;
        }

        // Snap to grid
        newWidth = snapToGrid(newWidth);
        newHeight = snapToGrid(newHeight);
        newX = snapToGrid(Math.max(0, newX));
        newY = snapToGrid(Math.max(0, newY));

        onDimensionsChange({ width: newWidth, height: newHeight });

        // Only update position if it changed (for NW, NE, SW handles)
        if (newX !== positionRef.current.x || newY !== positionRef.current.y) {
          onPositionChange({ x: newX, y: newY });
        }
        return;
      }

      if (isDragging && dragStartRef.current) {
        e.preventDefault();

        const newPosition: WidgetPosition = {
          x: Math.max(0, e.clientX - dragStartRef.current.x),
          y: Math.max(0, e.clientY - dragStartRef.current.y),
        };

        onPositionChange(newPosition);
      }
    },
    [
      isDragging,
      isResizing,
      activeHandle,
      minWidth,
      minHeight,
      onDimensionsChange,
      onPositionChange,
    ],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (isResizing) {
        setIsResizing(false);
        setActiveHandle(null);
        resizeStartRef.current = null;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        return;
      }

      if (isDragging) {
        setIsDragging(false);
        dragStartRef.current = null;
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    },
    [isDragging, isResizing],
  );

  const handleRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove();
    },
    [onRemove],
  );

  const handleExpandClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (previousDimensions) {
        // Restore to previous dimensions
        onDimensionsChange(previousDimensions);
        setPreviousDimensions(null);
      } else {
        // Expand to optimal size
        const optimalSize = SIZE_PRESETS[widget.size];
        onDimensionsChange(optimalSize);
      }
      setIsMinimized(false);
    },
    [widget.size, previousDimensions, onDimensionsChange],
  );

  const handleMinimizeClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (previousDimensions) {
        // Restore to previous dimensions
        onDimensionsChange(previousDimensions);
        setPreviousDimensions(null);
        setIsMinimized(true);
      } else {
        // Minimize to small size
        setPreviousDimensions({ ...widget.dimensions });
        onDimensionsChange(SIZE_PRESETS.small);
        setIsMinimized(true);
      }
    },
    [previousDimensions, widget.dimensions, onDimensionsChange],
  );

  const hasContent =
    widget.tree.root && Object.keys(widget.tree.elements).length > 0;

  // Check if widget is at optimal size
  const optimalSize = SIZE_PRESETS[widget.size];
  const isAtOptimalSize =
    widget.dimensions.width === optimalSize.width &&
    widget.dimensions.height === optimalSize.height;

  // Calculate content height (total height minus header)
  const headerHeight = 40; // approximate header height
  const contentHeight = widget.dimensions.height - headerHeight;

  return (
    <div
      className={cn(
        "absolute group",
        "rounded-lg border bg-card text-card-foreground shadow-lg",
        "transition-all duration-200",
        isSelected
          ? "border-amber-500/50 shadow-xl shadow-amber-500/10"
          : "border-border hover:border-amber-500/30",
        (isDragging || isResizing) && "shadow-2xl z-50",
        isDragging && "cursor-grabbing",
        isResizing && "cursor-nwse-resize",
        !isDragging && !isResizing && "cursor-default",
      )}
      style={{
        left: widget.position.x,
        top: widget.position.y,
        width: widget.dimensions.width,
        height: widget.dimensions.height,
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
            "select-none flex-1 min-w-0",
          )}
        >
          <GripVertical className="h-4 w-4 flex-shrink-0" />
          <span className="text-xs font-medium truncate">{widget.prompt}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Toggle Collapse/Expand button */}
          <button
            onClick={isMinimized ? handleExpandClick : handleMinimizeClick}
            className={cn(
              "p-1 rounded-md",
              "opacity-0 group-hover:opacity-100 transition-all",
              "focus:outline-none focus-visible:outline-none",
              "select-none",
              isMinimized
                ? "hover:bg-green-500/20 hover:text-green-500 active:bg-green-500/30"
                : "hover:bg-blue-500/20 hover:text-blue-500 active:bg-blue-500/30",
            )}
            aria-label={isMinimized ? "Expand widget" : "Collapse widget"}
          >
            {isMinimized ? (
              <Maximize2 className="h-3.5 w-3.5" />
            ) : (
              <Minimize2 className="h-3.5 w-3.5" />
            )}
          </button>
          {/* Remove button - Red */}
          <button
            onClick={handleRemoveClick}
            className={cn(
              "p-1 rounded-md",
              "opacity-0 group-hover:opacity-100 transition-opacity",
              "hover:bg-destructive/10 hover:text-destructive",
              "focus:outline-none focus-visible:outline-none",
              "active:bg-destructive/20",
              "select-none",
            )}
            aria-label="Remove widget"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Widget content */}
      <div
        className="p-4 overflow-auto"
        style={{ height: contentHeight > 0 ? contentHeight : "auto" }}
      >
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
          <JSONUIProvider registry={demoRegistry}>
            <Renderer
              tree={widget.tree}
              registry={demoRegistry}
              fallback={fallbackComponent}
            />
          </JSONUIProvider>
        )}
      </div>

      {/* Status indicator */}
      {widget.status === "generating" && hasContent && (
        <div className="absolute bottom-2 right-2">
          <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        </div>
      )}

      {/* Resize handles - visible on hover or when selected */}
      <ResizeHandles isVisible={isSelected} />
    </div>
  );
}

/**
 * Resize handles component for the four corners
 * Invisible handles that change cursor to indicate resize capability
 */
function ResizeHandles({ isVisible }: { isVisible: boolean }) {
  // Base class for invisible resize zones
  const handleClass = cn(
    "absolute w-4 h-4",
    "transition-opacity duration-150",
    // Only show on hover or when selected, but remain invisible
    isVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100",
  );

  return (
    <>
      {/* Northwest handle */}
      <div
        data-resize-handle="nw"
        className={cn(handleClass, "-top-2 -left-2 cursor-nwse-resize")}
      />
      {/* Northeast handle */}
      <div
        data-resize-handle="ne"
        className={cn(handleClass, "-top-2 -right-2 cursor-nesw-resize")}
      />
      {/* Southwest handle */}
      <div
        data-resize-handle="sw"
        className={cn(handleClass, "-bottom-2 -left-2 cursor-nesw-resize")}
      />
      {/* Southeast handle */}
      <div
        data-resize-handle="se"
        className={cn(handleClass, "-bottom-2 -right-2 cursor-nwse-resize")}
      />
    </>
  );
}
