"use client";

import Link from "next/link";
import { Trash2, MessageSquare, PanelLeftClose, PanelLeft } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useCanvas } from "./use-canvas";
import { cn } from "@/lib/utils";

export function CanvasHeader() {
  const { widgets, clearCanvas, isChatOpen, toggleChat } = useCanvas();

  const hasWidgets = widgets.length > 0;

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      {/* Left section - branding */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="https://vercel.com" title="Made with love by Vercel">
            <svg
              data-testid="geist-icon"
              height="18"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="18"
              style={{ color: "currentcolor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8 1L16 15H0L8 1Z"
                fill="currentColor"
              ></path>
            </svg>
          </Link>
          <span className="text-muted-foreground">
            <svg
              data-testid="geist-icon"
              height="16"
              strokeLinejoin="round"
              viewBox="0 0 16 16"
              width="16"
              style={{ color: "currentcolor" }}
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M4.01526 15.3939L4.3107 14.7046L10.3107 0.704556L10.6061 0.0151978L11.9849 0.606077L11.6894 1.29544L5.68942 15.2954L5.39398 15.9848L4.01526 15.3939Z"
                fill="currentColor"
              ></path>
            </svg>
          </span>
          <Link href="/" className="flex items-center gap-2">
            <span className="font-medium tracking-tight text-lg">
              json-render
            </span>
          </Link>
        </div>

        <div className="h-6 w-px bg-border" />

        <span className="text-sm font-medium text-primary">AI Canvas</span>
      </div>

      {/* Center section - widget count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {hasWidgets && (
          <span>
            {widgets.length} widget{widgets.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Right section - actions */}
      <div className="flex items-center gap-2">
        {/* Toggle chat panel */}
        <button
          onClick={toggleChat}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
            "hover:bg-muted transition-colors",
            isChatOpen
              ? "text-primary"
              : "text-muted-foreground hover:text-foreground",
          )}
          title={isChatOpen ? "Hide chat panel" : "Show chat panel"}
        >
          {isChatOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Chat</span>
        </button>

        {/* Clear canvas */}
        {hasWidgets && (
          <button
            onClick={clearCanvas}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
              "text-muted-foreground hover:text-destructive",
              "hover:bg-destructive/10 transition-colors",
            )}
            title="Clear canvas"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        <div className="h-6 w-px bg-border" />

        {/* Navigation links */}
        <nav className="flex items-center gap-2">
          <Link
            href="/playground"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            Playground
          </Link>
          <Link
            href="/docs"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            Docs
          </Link>
          <a
            href="https://github.com/vercel-labs/json-render"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2"
          >
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
