"use client";

import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { UITree } from "@json-render/core";
import type {
  CanvasState,
  CanvasActions,
  CanvasContextValue,
  CanvasWidget,
  WidgetPosition,
  WidgetDimensions,
  WidgetStatus,
  WidgetSize,
  MessageRole,
} from "./types";
import {
  INITIAL_WIDGET_POSITION,
  GRID_SIZE,
  SIZE_PRESETS,
  COMPONENT_DEFAULT_SIZES,
} from "./types";

/**
 * Generate a unique ID for widgets and messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Snap a value to the grid
 */
function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

/**
 * Check if two rectangles overlap
 */
function rectanglesOverlap(
  pos1: WidgetPosition,
  dim1: WidgetDimensions,
  pos2: WidgetPosition,
  dim2: WidgetDimensions,
  padding: number = GRID_SIZE,
): boolean {
  return !(
    pos1.x + dim1.width + padding <= pos2.x ||
    pos2.x + dim2.width + padding <= pos1.x ||
    pos1.y + dim1.height + padding <= pos2.y ||
    pos2.y + dim2.height + padding <= pos1.y
  );
}

/**
 * Get widget size from UI tree based on root component type
 */
function getWidgetSizeFromTree(tree: UITree): WidgetSize {
  if (!tree.root || !tree.elements[tree.root]) {
    return "medium";
  }
  const rootElement = tree.elements[tree.root];
  if (!rootElement) {
    return "medium";
  }
  return COMPONENT_DEFAULT_SIZES[rootElement.type] ?? "medium";
}

/**
 * Calculate the position for a new widget with intelligent layout
 */
function calculateNextPosition(
  widgets: CanvasWidget[],
  newDimensions: WidgetDimensions,
): WidgetPosition {
  if (widgets.length === 0) {
    return {
      x: snapToGrid(INITIAL_WIDGET_POSITION.x),
      y: snapToGrid(INITIAL_WIDGET_POSITION.y),
    };
  }

  // Canvas layout parameters
  const startX = snapToGrid(INITIAL_WIDGET_POSITION.x);
  const startY = snapToGrid(INITIAL_WIDGET_POSITION.y);
  const maxRowWidth = 1600; // Maximum width before wrapping to next row
  const rowGap = GRID_SIZE * 2; // Gap between rows
  const colGap = GRID_SIZE * 2; // Gap between columns

  // Try to place in rows from left to right
  let currentX = startX;
  let currentY = startY;
  let rowMaxHeight = 0;

  // Find the current row's y position and max height
  for (const widget of widgets) {
    if (
      widget.position.y === currentY ||
      (widget.position.y > currentY - widget.dimensions.height &&
        widget.position.y < currentY + rowMaxHeight + rowGap)
    ) {
      rowMaxHeight = Math.max(rowMaxHeight, widget.dimensions.height);
    }
  }

  // Find position at the end of current row
  for (const widget of widgets) {
    const widgetRight = widget.position.x + widget.dimensions.width + colGap;
    if (
      widget.position.y >= currentY &&
      widget.position.y < currentY + rowMaxHeight + rowGap
    ) {
      currentX = Math.max(currentX, widgetRight);
    }
  }

  // Check if we need to wrap to next row
  if (currentX + newDimensions.width > startX + maxRowWidth) {
    currentX = startX;
    currentY = snapToGrid(currentY + rowMaxHeight + rowGap);
  }

  let candidatePosition: WidgetPosition = {
    x: snapToGrid(currentX),
    y: snapToGrid(currentY),
  };

  // Check for collisions and find a free spot
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    let hasCollision = false;

    for (const widget of widgets) {
      if (
        rectanglesOverlap(
          candidatePosition,
          newDimensions,
          widget.position,
          widget.dimensions,
        )
      ) {
        hasCollision = true;
        // Move right past the colliding widget
        candidatePosition.x = snapToGrid(
          widget.position.x + widget.dimensions.width + colGap,
        );

        // If we've gone too far right, wrap to next row
        if (candidatePosition.x + newDimensions.width > startX + maxRowWidth) {
          candidatePosition.x = startX;
          candidatePosition.y = snapToGrid(
            candidatePosition.y + rowGap + newDimensions.height,
          );
        }
        break;
      }
    }

    if (!hasCollision) {
      break;
    }

    attempts++;
  }

  return candidatePosition;
}

/**
 * Initial state for the canvas
 */
const initialState: CanvasState = {
  widgets: [],
  conversation: [],
  selectedWidgetId: null,
  isChatOpen: true,
};

/**
 * Context for canvas state
 */
const CanvasContext = createContext<CanvasContextValue | null>(null);

/**
 * Props for the CanvasProvider component
 */
interface CanvasProviderProps {
  children: ReactNode;
}

/**
 * Provider component for canvas state management
 */
export function CanvasProvider({ children }: CanvasProviderProps) {
  const [state, setState] = useState<CanvasState>(initialState);

  const addWidget = useCallback(
    (prompt: string): string => {
      const id = generateId();
      // Default to medium size for new widgets (will be updated when tree is received)
      const size: WidgetSize = "medium";
      const dimensions = { ...SIZE_PRESETS[size] };
      const position = calculateNextPosition(state.widgets, dimensions);

      const newWidget: CanvasWidget = {
        id,
        position,
        tree: { root: "", elements: {} },
        prompt,
        status: "generating",
        createdAt: Date.now(),
        size,
        dimensions,
      };

      setState((prev) => ({
        ...prev,
        widgets: [...prev.widgets, newWidget],
        selectedWidgetId: id,
      }));

      return id;
    },
    [state.widgets],
  );

  const updateWidgetTree = useCallback((id: string, tree: UITree) => {
    setState((prev) => {
      const widget = prev.widgets.find((w) => w.id === id);
      if (!widget) return prev;

      // Auto-detect size from tree if this is the first tree update (widget was generating)
      const shouldAutoSize =
        widget.status === "generating" && tree.root && tree.elements[tree.root];

      if (shouldAutoSize) {
        const newSize = getWidgetSizeFromTree(tree);
        const newDimensions = { ...SIZE_PRESETS[newSize] };

        return {
          ...prev,
          widgets: prev.widgets.map((w) =>
            w.id === id
              ? { ...w, tree, size: newSize, dimensions: newDimensions }
              : w,
          ),
        };
      }

      return {
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, tree } : w)),
      };
    });
  }, []);

  const updateWidgetPosition = useCallback(
    (id: string, position: WidgetPosition) => {
      setState((prev) => ({
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                position: {
                  x: snapToGrid(position.x),
                  y: snapToGrid(position.y),
                },
              }
            : widget,
        ),
      }));
    },
    [],
  );

  const updateWidgetDimensions = useCallback(
    (id: string, dimensions: WidgetDimensions) => {
      setState((prev) => ({
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === id
            ? {
                ...widget,
                dimensions: {
                  width: snapToGrid(
                    Math.max(dimensions.width, SIZE_PRESETS.small.width),
                  ),
                  height: snapToGrid(
                    Math.max(dimensions.height, SIZE_PRESETS.small.height),
                  ),
                },
              }
            : widget,
        ),
      }));
    },
    [],
  );

  const updateWidgetStatus = useCallback(
    (id: string, status: WidgetStatus, error?: string) => {
      setState((prev) => ({
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === id ? { ...widget, status, error } : widget,
        ),
      }));
    },
    [],
  );

  const removeWidget = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((widget) => widget.id !== id),
      selectedWidgetId:
        prev.selectedWidgetId === id ? null : prev.selectedWidgetId,
    }));
  }, []);

  const clearCanvas = useCallback(() => {
    setState((prev) => ({
      ...prev,
      widgets: [],
      selectedWidgetId: null,
      conversation: [],
    }));
  }, []);

  const selectWidget = useCallback((id: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedWidgetId: id,
    }));
  }, []);

  const addMessage = useCallback(
    (role: MessageRole, content: string, widgetId?: string) => {
      const message = {
        id: generateId(),
        role,
        content,
        timestamp: Date.now(),
        widgetId,
      };

      setState((prev) => ({
        ...prev,
        conversation: [...prev.conversation, message],
      }));
    },
    [],
  );

  const toggleChat = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isChatOpen: !prev.isChatOpen,
    }));
  }, []);

  const setChatOpen = useCallback((open: boolean) => {
    setState((prev) => ({
      ...prev,
      isChatOpen: open,
    }));
  }, []);

  const value: CanvasContextValue = {
    ...state,
    addWidget,
    updateWidgetTree,
    updateWidgetPosition,
    updateWidgetDimensions,
    updateWidgetStatus,
    removeWidget,
    clearCanvas,
    selectWidget,
    addMessage,
    toggleChat,
    setChatOpen,
  };

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  );
}

/**
 * Hook to access canvas state and actions
 */
export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider");
  }
  return context;
}
