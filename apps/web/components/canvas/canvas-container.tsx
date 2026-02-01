"use client";

import { CanvasProvider } from "./use-canvas";
import { CanvasHeader } from "./canvas-header";
import { ChatPanel } from "./chat-panel";
import { CanvasArea } from "./canvas-area";
import { Toaster } from "sonner";

export function CanvasContainer() {
  return (
    <CanvasProvider>
      <div className="flex flex-col h-full">
        <CanvasHeader />
        <div className="flex flex-1 overflow-hidden">
          <ChatPanel />
          <CanvasArea />
        </div>
      </div>
      <Toaster position="bottom-right" />
    </CanvasProvider>
  );
}
