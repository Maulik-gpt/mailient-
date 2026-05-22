import { useEffect, useCallback, useRef } from 'react';

export interface ShortcutAction {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  label: string;
  description: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  onFocusInput?: () => void;
  onSend?: () => void;
  onCloseCanvas?: () => void;
  onNewChat?: () => void;
  onShowShortcuts?: () => void;
  onMorningBrief?: () => void;
  onFollowUps?: () => void;
  onAuditPanel?: () => void;
  onCopyLastResponse?: () => void;
  onToggleSidebar?: () => void;
  onEscapeAction?: () => void;
  enabled?: boolean;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPod|iPad/.test(navigator.platform);

export function modKey(key: string, shift = false): string {
  const mod = isMac ? '⌘' : 'Ctrl';
  return shift ? `${mod}+⇧+${key}` : `${mod}+${key}`;
}

export function useKeyboardShortcuts(opts: UseKeyboardShortcutsOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const shortcuts: ShortcutAction[] = [
    {
      key: 'k', ctrlKey: !isMac, metaKey: isMac,
      label: modKey('K'), description: 'Focus chat input',
      action: () => optsRef.current.onFocusInput?.(),
    },
    {
      key: 'Enter', ctrlKey: !isMac, metaKey: isMac,
      label: modKey('↵'), description: 'Send message',
      action: () => optsRef.current.onSend?.(),
    },
    {
      key: '/', ctrlKey: !isMac, metaKey: isMac,
      label: modKey('/'), description: 'Show keyboard shortcuts',
      action: () => optsRef.current.onShowShortcuts?.(),
    },
    {
      key: 'Escape',
      label: 'Esc', description: 'Close canvas / dismiss overlay',
      action: () => optsRef.current.onEscapeAction?.(),
    },
    {
      key: 'n', ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
      label: modKey('N', true), description: 'New chat',
      action: () => optsRef.current.onNewChat?.(),
    },
    {
      key: 'b', ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
      label: modKey('B', true), description: 'Morning briefing',
      action: () => optsRef.current.onMorningBrief?.(),
    },
    {
      key: 'f', ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
      label: modKey('F', true), description: 'Check follow-ups',
      action: () => optsRef.current.onFollowUps?.(),
    },
    {
      key: 'a', ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
      label: modKey('A', true), description: 'Open audit trail',
      action: () => optsRef.current.onAuditPanel?.(),
    },
    {
      key: 'c', ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
      label: modKey('C', true), description: 'Copy last AI response',
      action: () => optsRef.current.onCopyLastResponse?.(),
    },
    {
      key: '\\', ctrlKey: !isMac, metaKey: isMac,
      label: modKey('\\'), description: 'Toggle sidebar',
      action: () => optsRef.current.onToggleSidebar?.(),
    },
  ];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!optsRef.current.enabled) return;

    // Don't fire when user is typing in an input or textarea (except special combos)
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    const mod = isMac ? e.metaKey : e.ctrlKey;

    for (const sc of shortcuts) {
      const keyMatch = e.key === sc.key;
      const modMatch = sc.ctrlKey || sc.metaKey ? mod : true;
      const shiftMatch = sc.shiftKey ? e.shiftKey : !e.shiftKey || sc.key === 'N'; // allow shift for some
      const altMatch = sc.altKey ? e.altKey : !e.altKey;

      // Build exact match
      const exactMod = (sc.ctrlKey || sc.metaKey) ? mod : !mod;
      const exactShift = sc.shiftKey ? e.shiftKey : !e.shiftKey;

      if (keyMatch && exactMod && exactShift && altMatch) {
        // Allow Escape from inputs, Cmd+K from anywhere, Cmd+Enter from inputs
        if (isInput && !['Escape', 'Enter', 'k'].includes(sc.key)) continue;

        e.preventDefault();
        sc.action();
        return;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  return shortcuts;
}
