import { useEffect, useCallback } from "react";

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  cmd?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: () => void;
  description?: string;
}

export const useKeyboardShortcuts = (shortcuts: ShortcutConfig[]) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        // Check modifier keys
        const ctrlOrCmd = shortcut.ctrl || shortcut.cmd;
        const isCtrlOrCmdPressed = ctrlOrCmd
          ? event.ctrlKey || event.metaKey
          : !(event.ctrlKey || event.metaKey);
        const isShiftPressed = shortcut.shift
          ? event.shiftKey
          : !event.shiftKey;
        const isAltPressed = shortcut.alt ? event.altKey : !event.altKey;

        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          isCtrlOrCmdPressed &&
          isShiftPressed &&
          isAltPressed
        ) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
};
