"use client";

import { useCallback } from "react";
import { DraggableWidget } from "./draggable-widget";
import { useCanvas } from "./use-canvas";
import { cn } from "@/lib/utils";

export function CanvasArea() {
  const {
    widgets,
    selectedWidgetId,
    selectWidget,
    updateWidgetPosition,
    updateWidgetDimensions,
    removeWidget,
  } = useCanvas();

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only deselect if clicking directly on the canvas (not on a widget)
      if (e.target === e.currentTarget) {
        selectWidget(null);
      }
    },
    [selectWidget],
  );

  return (
    <div
      className={cn(
        "flex-1 relative overflow-auto",
        "bg-background",
        // Grid pattern background
        "bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)]",
        "bg-[size:24px_24px]",
      )}
      onClick={handleCanvasClick}
    >
      {/* Canvas content area with minimum size */}
      <div
        className="min-w-[2000px] min-h-[2000px] relative"
        onClick={handleCanvasClick}
      >
        {widgets.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">No widgets yet</p>
              <p className="text-sm mt-1">
                Use the chat panel to generate UI components
              </p>
            </div>
          </div>
        )}

        {widgets.map((widget) => (
          <DraggableWidget
            key={widget.id}
            widget={widget}
            isSelected={selectedWidgetId === widget.id}
            onSelect={() => selectWidget(widget.id)}
            onPositionChange={(position) =>
              updateWidgetPosition(widget.id, position)
            }
            onDimensionsChange={(dimensions) =>
              updateWidgetDimensions(widget.id, dimensions)
            }
            onRemove={() => removeWidget(widget.id)}
          />
        ))}
      </div>
    </div>
  );
}
