'use client';

/**
 * RichTextEditor — minimal contentEditable-based editor for DraftApprovalModal.
 *
 * Self-contained, zero new dependencies. Uses contentEditable + document.execCommand
 * for formatting. execCommand is deprecated but still works in every major browser
 * and ships ~50 lines of code vs ~250KB of Tiptap. When/if the team wants
 * richer features (mentions, code blocks, tables) swap this for Tiptap.
 *
 * Toolbar (matches PART 8 #4 spec exactly):
 *   B  I  U  |  • list  1. list  |  link  |  ↶ undo  ↷ redo
 *
 * State model: the editor stores HTML internally. Parent receives plain text
 * via onChange (HTML tags stripped, list items prefixed with "- " / "1. ",
 * <br>/<p> mapped to line breaks). Gmail send path expects plain text;
 * preserving HTML emails to-wire is a separate enhancement.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  /** Initial plain-text content. Newlines map to <br>. */
  value: string;
  /** Fires with the plain-text equivalent of the editor's current HTML. */
  onChange: (plainText: string) => void;
  className?: string;
}

/** Plain text → HTML for initial load (preserve line breaks). */
function textToHtml(text: string): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped.replace(/\n/g, '<br>');
}

/**
 * HTML → plain text. Strips tags, maps <br>/</p> to line breaks, prefixes
 * <li> items with "- " (ul) or numbered (ol). Best-effort; doesn't aim for
 * roundtrip-perfect, just readable when sent over plain-text email.
 */
function htmlToPlainText(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const out: string[] = [];
  const walk = (node: Node, listType: 'ul' | 'ol' | null, olIndex: { i: number }) => {
    if (node.nodeType === Node.TEXT_NODE) {
      out.push(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'br') {
      out.push('\n');
      return;
    }
    if (tag === 'li') {
      const prefix = listType === 'ol' ? `${olIndex.i}. ` : '- ';
      if (listType === 'ol') olIndex.i++;
      out.push(prefix);
      el.childNodes.forEach((c) => walk(c, null, olIndex));
      out.push('\n');
      return;
    }
    if (tag === 'ul' || tag === 'ol') {
      const subIndex = { i: 1 };
      el.childNodes.forEach((c) => walk(c, tag as 'ul' | 'ol', subIndex));
      return;
    }
    if (tag === 'p' || tag === 'div') {
      el.childNodes.forEach((c) => walk(c, listType, olIndex));
      out.push('\n');
      return;
    }
    if (tag === 'a') {
      const href = el.getAttribute('href') || '';
      const text = el.textContent || '';
      out.push(text === href || !href ? text : `${text} (${href})`);
      return;
    }
    el.childNodes.forEach((c) => walk(c, listType, olIndex));
  };
  tmp.childNodes.forEach((c) => walk(c, null, { i: 1 }));

  // Collapse 3+ newlines to 2 (max one blank line), trim trailing whitespace
  return out.join('').replace(/\n{3,}/g, '\n\n').replace(/[ \t]+\n/g, '\n').trim();
}

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [activeMarks, setActiveMarks] = useState<Set<string>>(new Set());

  // Initialize content once — re-syncing on every value change would clobber
  // the user's caret position mid-typing.
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    if (editorRef.current) {
      editorRef.current.innerHTML = textToHtml(value);
      initRef.current = true;
    }
  }, [value]);

  const refreshMarks = useCallback(() => {
    // queryCommandState is deprecated alongside execCommand but the pair are
    // de facto stable in browsers as long as we keep using execCommand.
    const next = new Set<string>();
    try {
      if (document.queryCommandState('bold')) next.add('bold');
      if (document.queryCommandState('italic')) next.add('italic');
      if (document.queryCommandState('underline')) next.add('underline');
      if (document.queryCommandState('insertUnorderedList')) next.add('ul');
      if (document.queryCommandState('insertOrderedList')) next.add('ol');
    } catch { /* some browsers gate this behind focus */ }
    setActiveMarks(next);
  }, []);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    onChange(htmlToPlainText(editorRef.current.innerHTML));
  }, [onChange]);

  const exec = useCallback(
    (command: string, valueArg?: string) => {
      editorRef.current?.focus();
      try {
        document.execCommand(command, false, valueArg);
      } catch { /* swallowed */ }
      refreshMarks();
      emitChange();
    },
    [refreshMarks, emitChange],
  );

  const handleLink = () => {
    const url = window.prompt('Link URL:', 'https://');
    if (!url) return;
    exec('createLink', url);
  };

  // Keyboard shortcuts: Cmd/Ctrl+B/I/U + Cmd/Ctrl+Z/Shift+Z
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    if (k === 'b') { e.preventDefault(); exec('bold'); }
    else if (k === 'i') { e.preventDefault(); exec('italic'); }
    else if (k === 'u') { e.preventDefault(); exec('underline'); }
    else if (k === 'z' && e.shiftKey) { e.preventDefault(); exec('redo'); }
    else if (k === 'z') { e.preventDefault(); exec('undo'); }
  };

  const Btn = ({
    onClick,
    active,
    title,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors',
        active
          ? 'bg-white/12 text-white'
          : 'text-white/55 hover:text-white hover:bg-white/8',
      )}
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-white/10 mx-0.5" />;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] w-fit"
        // Stop the editor from losing selection when the toolbar is clicked
        onMouseDown={(e) => e.preventDefault()}
      >
        <Btn onClick={() => exec('bold')} active={activeMarks.has('bold')} title="Bold (Ctrl/Cmd+B)">
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('italic')} active={activeMarks.has('italic')} title="Italic (Ctrl/Cmd+I)">
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('underline')} active={activeMarks.has('underline')} title="Underline (Ctrl/Cmd+U)">
          <Underline className="w-3.5 h-3.5" />
        </Btn>
        <Sep />
        <Btn onClick={() => exec('insertUnorderedList')} active={activeMarks.has('ul')} title="Bulleted list">
          <List className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('insertOrderedList')} active={activeMarks.has('ol')} title="Numbered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </Btn>
        <Sep />
        <Btn onClick={handleLink} title="Insert link">
          <Link2 className="w-3.5 h-3.5" />
        </Btn>
        <Sep />
        <Btn onClick={() => exec('undo')} title="Undo (Ctrl/Cmd+Z)">
          <Undo2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn onClick={() => exec('redo')} title="Redo (Ctrl/Cmd+Shift+Z)">
          <Redo2 className="w-3.5 h-3.5" />
        </Btn>
      </div>

      {/* Editable surface */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => { refreshMarks(); emitChange(); }}
        onKeyUp={refreshMarks}
        onMouseUp={refreshMarks}
        onKeyDown={onKeyDown}
        className={cn(
          'min-h-[280px] max-h-[50vh] overflow-y-auto bg-[#0F0F0F] border border-white/8 focus:border-white/15',
          'rounded-2xl p-4 text-white/90 text-[14px] leading-[1.7] font-sans',
          'focus:outline-none transition-colors',
          // Tailwind's prose-like list styling for the contenteditable surface
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-0.5',
          '[&_a]:text-blue-400 [&_a]:underline',
          '[&_strong]:font-semibold [&_em]:italic [&_u]:underline',
        )}
      />
    </div>
  );
}
