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
  WidgetStatus,
  MessageRole,
} from "./types";
import { INITIAL_WIDGET_POSITION, WIDGET_POSITION_OFFSET } from "./types";

/**
 * Generate a unique ID for widgets and messages
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Calculate the position for a new widget based on existing widgets
 */
function calculateNextPosition(widgets: CanvasWidget[]): WidgetPosition {
  if (widgets.length === 0) {
    return { ...INITIAL_WIDGET_POSITION };
  }

  // Find the last widget's position and offset from it
  const lastWidget = widgets[widgets.length - 1];
  if (!lastWidget) {
    return { ...INITIAL_WIDGET_POSITION };
  }

  return {
    x: lastWidget.position.x + WIDGET_POSITION_OFFSET.x,
    y: lastWidget.position.y + WIDGET_POSITION_OFFSET.y,
  };
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
      const position = calculateNextPosition(state.widgets);

      const newWidget: CanvasWidget = {
        id,
        position,
        tree: { root: "", elements: {} },
        prompt,
        status: "generating",
        createdAt: Date.now(),
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
    setState((prev) => ({
      ...prev,
      widgets: prev.widgets.map((widget) =>
        widget.id === id ? { ...widget, tree } : widget,
      ),
    }));
  }, []);

  const updateWidgetPosition = useCallback(
    (id: string, position: WidgetPosition) => {
      setState((prev) => ({
        ...prev,
        widgets: prev.widgets.map((widget) =>
          widget.id === id ? { ...widget, position } : widget,
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
