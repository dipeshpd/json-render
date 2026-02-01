import type { UITree } from "@json-render/core";

/**
 * Position of a widget on the canvas
 */
export interface WidgetPosition {
  x: number;
  y: number;
}

/**
 * Status of a widget generation
 */
export type WidgetStatus = "generating" | "complete" | "error";

/**
 * A widget on the canvas containing a rendered UI tree
 */
export interface CanvasWidget {
  /** Unique identifier for the widget */
  id: string;
  /** Position on the canvas */
  position: WidgetPosition;
  /** The UI tree to render */
  tree: UITree;
  /** The prompt that generated this widget */
  prompt: string;
  /** Current generation status */
  status: WidgetStatus;
  /** Timestamp when the widget was created */
  createdAt: number;
  /** Optional error message if generation failed */
  error?: string;
}

/**
 * Role of a message in the conversation
 */
export type MessageRole = "user" | "assistant";

/**
 * A message in the conversation history
 */
export interface ConversationMessage {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
  /** Timestamp when the message was sent */
  timestamp: number;
  /** ID of the widget this message is associated with (for assistant messages) */
  widgetId?: string;
}

/**
 * State of the canvas
 */
export interface CanvasState {
  /** All widgets on the canvas */
  widgets: CanvasWidget[];
  /** Conversation history */
  conversation: ConversationMessage[];
  /** ID of the currently selected widget */
  selectedWidgetId: string | null;
  /** Whether the chat panel is open */
  isChatOpen: boolean;
}

/**
 * Actions for canvas state management
 */
export interface CanvasActions {
  /** Add a new widget to the canvas */
  addWidget: (prompt: string) => string;
  /** Update a widget's UI tree */
  updateWidgetTree: (id: string, tree: UITree) => void;
  /** Update a widget's position */
  updateWidgetPosition: (id: string, position: WidgetPosition) => void;
  /** Update a widget's status */
  updateWidgetStatus: (
    id: string,
    status: WidgetStatus,
    error?: string,
  ) => void;
  /** Remove a widget from the canvas */
  removeWidget: (id: string) => void;
  /** Clear all widgets from the canvas */
  clearCanvas: () => void;
  /** Select a widget */
  selectWidget: (id: string | null) => void;
  /** Add a message to the conversation */
  addMessage: (role: MessageRole, content: string, widgetId?: string) => void;
  /** Toggle the chat panel */
  toggleChat: () => void;
  /** Set chat panel open state */
  setChatOpen: (open: boolean) => void;
}

/**
 * Canvas context value
 */
export interface CanvasContextValue extends CanvasState, CanvasActions {}

/**
 * Default initial position for the first widget
 */
export const INITIAL_WIDGET_POSITION: WidgetPosition = { x: 100, y: 100 };

/**
 * Offset for each new widget from the previous one
 */
export const WIDGET_POSITION_OFFSET: WidgetPosition = { x: 50, y: 50 };
