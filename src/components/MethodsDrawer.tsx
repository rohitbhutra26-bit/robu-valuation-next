'use client';

import { Drawer } from 'vaul';
import { ReactNode } from 'react';

interface MethodsDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Vaul bottom-sheet drawer for mobile "all valuation methods" view.
 * Appears as a smooth swipe-up sheet from the bottom of the screen.
 */
export default function MethodsDrawer({ open, onClose, children }: MethodsDrawerProps) {
  return (
    <Drawer.Root open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <Drawer.Portal>
        {/* Scrim */}
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-40" />

        {/* Sheet */}
        <Drawer.Content
          className="
            fixed bottom-0 left-0 right-0 z-50
            bg-card border border-border border-b-0
            rounded-t-2xl
            flex flex-col
            max-h-[85dvh]
            outline-none
          "
        >
          {/* Drag handle */}
          <div className="flex-shrink-0 pt-3 pb-2 flex justify-center">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>

          {/* Header */}
          <div className="flex-shrink-0 px-4 pb-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-primary">All Valuation Methods</h2>
            <button
              onClick={onClose}
              className="text-muted hover:text-primary text-xs px-2 py-1 rounded border border-border hover:border-gold/30 transition-all"
            >
              Close
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
