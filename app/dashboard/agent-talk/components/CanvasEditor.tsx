'use client';

/**
 * Canvas rich-text editor.
 *
 * WHY MARKDOWN IN / MARKDOWN OUT
 * Everything upstream and downstream of this component speaks markdown: the
 * model writes it, ReactMarkdown renders it in read mode, and the .docx / PDF
 * exporters parse it. So the editor serialises back to markdown rather than
 * keeping HTML — a WYSIWYG that stored HTML would need lossy conversion at
 * BOTH ends, and every round-trip through the model would degrade the document.
 * tiptap-markdown gives us a real WYSIWYG surface over that same markdown.
 *
 * The old editor was a bare <textarea> of raw markdown: the user edited
 * asterisks and hash marks by hand, with no way to see what they were making
 * until they stopped typing.
 */

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import {
  Undo2, Redo2, Bold, Italic, Strikethrough, Code2,
  List, ListOrdered, Quote, Minus, Heading1, Heading2, Heading3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CanvasEditorProps {
  /** Markdown source. */
  value: string;
  /** Fires with markdown on every change. */
  onChange: (markdown: string) => void;
}

export function CanvasEditor({ value, onChange }: CanvasEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // The doc supplies its own H1 as the title; allowing H4-H6 in a
        // two-page brief just creates levels nobody can tell apart.
        heading: { levels: [1, 2, 3] },
      }),
      Markdown.configure({
        html: false,          // never let raw HTML into a doc we re-serialise
        breaks: true,         // a single newline is a line break, as users expect
        transformPastedText: true,  // pasting markdown produces formatting, not literal asterisks
      }),
    ],
    content: value || '',
    // REQUIRED in Next.js: without it TipTap renders during SSR and the
    // client hydration mismatches, which blanks the editor on first paint.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        // Typography matches the read-mode renderer exactly, so toggling edit
        // doesn't reflow the document under the user's cursor.
        class: 'canvas-prose focus:outline-none min-h-[300px]',
      },
    },
    onUpdate: ({ editor }) => {
      onChange((editor.storage as any).markdown.getMarkdown());
    },
  });

  // Adopt external changes (a re-generated doc) WITHOUT stomping the user's
  // in-progress edit: only reset when the incoming markdown actually differs
  // from what the editor already holds.
  useEffect(() => {
    if (!editor) return;
    const current = (editor.storage as any).markdown?.getMarkdown?.() ?? '';
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return <div className="h-[300px] animate-pulse rounded-xl bg-arcus-surface" />;
  }

  return (
    <div className="flex flex-col min-h-0">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="sticky top-0 z-10 -mx-1 mb-4 flex flex-wrap items-center gap-0.5 px-1 py-2 bg-arcus-bg/95 backdrop-blur border-b border-arcus-border">
      <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} label="Undo"><Undo2 className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} label="Redo"><Redo2 className="w-4 h-4" /></Btn>

      <Sep />

      {([1, 2, 3] as const).map(level => (
        <Btn
          key={level}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          active={editor.isActive('heading', { level })}
          label={`Heading ${level}`}
        >
          {level === 1 ? <Heading1 className="w-4 h-4" /> : level === 2 ? <Heading2 className="w-4 h-4" /> : <Heading3 className="w-4 h-4" />}
        </Btn>
      ))}

      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} label="Bold"><Bold className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} label="Italic"><Italic className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} label="Strikethrough"><Strikethrough className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} label="Inline code"><Code2 className="w-4 h-4" /></Btn>

      <Sep />

      <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} label="Bullet list"><List className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} label="Numbered list"><ListOrdered className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} label="Quote"><Quote className="w-4 h-4" /></Btn>
      <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} label="Divider"><Minus className="w-4 h-4" /></Btn>
    </div>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-arcus-border mx-1.5 shrink-0" />;
}

function Btn({
  onClick, children, active = false, disabled = false, label,
}: {
  onClick: () => void; children: React.ReactNode; active?: boolean; disabled?: boolean; label: string;
}) {
  return (
    <button
      type="button"
      // onMouseDown + preventDefault: a plain onClick moves focus out of the
      // editor first, which collapses the selection — so "select a word, press
      // Bold" would bold nothing.
      onMouseDown={(e) => { e.preventDefault(); if (!disabled) onClick(); }}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'w-8 h-8 flex items-center justify-center rounded-lg transition-colors shrink-0',
        active
          ? 'bg-arcus-fg text-arcus-fg-inverse'
          : 'text-arcus-fg-tertiary hover:text-arcus-fg hover:bg-arcus-surface',
        disabled && 'opacity-30 cursor-not-allowed hover:bg-transparent hover:text-arcus-fg-tertiary'
      )}
    >
      {children}
    </button>
  );
}
