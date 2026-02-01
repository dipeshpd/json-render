"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Square,
  ChevronLeft,
  ChevronRight,
  User,
  Bot,
} from "lucide-react";
import { useUIStream } from "@json-render/react";
import { useCanvas } from "./use-canvas";
import { cn } from "@/lib/utils";

const EXAMPLE_PROMPTS = [
  "Create a user profile card with avatar, name, and bio",
  "Build a login form with email and password fields",
  "Create a dashboard metric card showing revenue",
  "Build a contact form with name, email, and message",
  "Create a pricing card with features list",
];

export function ChatPanel() {
  const {
    conversation,
    isChatOpen,
    toggleChat,
    addWidget,
    addMessage,
    updateWidgetTree,
    updateWidgetStatus,
  } = useCanvas();

  const [input, setInput] = useState("");
  const [currentWidgetId, setCurrentWidgetId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentWidgetIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in callbacks
  useEffect(() => {
    currentWidgetIdRef.current = currentWidgetId;
  }, [currentWidgetId]);

  const { tree, isStreaming, send } = useUIStream({
    api: "/api/generate",
    onComplete: (finalTree) => {
      const widgetId = currentWidgetIdRef.current;
      if (widgetId) {
        updateWidgetTree(widgetId, finalTree);
        updateWidgetStatus(widgetId, "complete");
        addMessage("assistant", "Widget generated successfully.", widgetId);
        setCurrentWidgetId(null);
      }
    },
    onError: (error) => {
      const widgetId = currentWidgetIdRef.current;
      if (widgetId) {
        updateWidgetStatus(widgetId, "error", error.message);
        addMessage("assistant", `Generation failed: ${error.message}`);
        setCurrentWidgetId(null);
      }
    },
  });

  // Update widget tree during streaming
  useEffect(() => {
    if (tree && currentWidgetId && isStreaming) {
      updateWidgetTree(currentWidgetId, tree);
    }
  }, [tree, currentWidgetId, isStreaming, updateWidgetTree]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus();
    }
  }, [isChatOpen]);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isStreaming) return;

      // Add user message
      addMessage("user", prompt);

      // Create new widget
      const widgetId = addWidget(prompt);
      setCurrentWidgetId(widgetId);

      // Clear input
      setInput("");

      // Start generation
      await send(prompt);
    },
    [addMessage, addWidget, isStreaming, send],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(input);
      }
    },
    [handleSubmit, input],
  );

  const handleExampleClick = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  // Collapsed state - just show toggle button
  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 z-10",
          "flex items-center justify-center",
          "w-6 h-16 rounded-r-md",
          "bg-card border border-l-0 border-border",
          "hover:bg-muted transition-colors",
          "shadow-md",
        )}
        aria-label="Open chat panel"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        "w-80 min-w-[280px] max-w-[400px]",
        "border-r border-border bg-card",
      )}
    >
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold">AI Assistant</span>
        </div>
        <button
          onClick={toggleChat}
          className={cn(
            "p-1.5 rounded-md",
            "hover:bg-muted transition-colors",
            "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Close chat panel"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversation.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Describe the UI component you want to create, and I will generate
              it as a widget on the canvas.
            </p>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Try an example
              </p>
              {EXAMPLE_PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(prompt)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md",
                    "text-sm text-muted-foreground",
                    "bg-muted/50 hover:bg-muted",
                    "transition-colors",
                  )}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {conversation.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isStreaming && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the UI you want to create..."
            disabled={isStreaming}
            className={cn(
              "w-full resize-none rounded-lg",
              "border border-border bg-background",
              "px-3 py-2 pr-10",
              "text-sm placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "min-h-[80px] max-h-[160px]",
            )}
            rows={3}
          />
          <button
            onClick={() => handleSubmit(input)}
            disabled={!input.trim() || isStreaming}
            className={cn(
              "absolute bottom-2 right-2",
              "p-1.5 rounded-md",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
            aria-label={isStreaming ? "Stop generation" : "Send message"}
          >
            {isStreaming ? (
              <Square className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
