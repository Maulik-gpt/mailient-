/**
 * Converts Markdown text → a .docx Blob using the `docx` package.
 * Handles: H1-H6, bold, italic, bullet lists, numbered lists, tables, blockquotes, code.
 * Returns a Blob that can be triggered for download in the browser.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
  LevelFormat,
  NumberFormat,
  UnderlineType,
} from 'docx';

// ─── Inline parser ────────────────────────────────────────────────────────────

interface Span {
  text: string;
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
  underline?: boolean;
}

function parseInline(raw: string): TextRun[] {
  const spans: Span[] = [];
  // Split on bold+italic, bold, italic, code in one pass
  const parts = raw.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|__[^_]+__|_[^_]+_)/);
  for (const part of parts) {
    if (!part) continue;
    if (/^\*\*\*/.test(part)) {
      spans.push({ text: part.slice(3, -3), bold: true, italics: true });
    } else if (/^\*\*/.test(part)) {
      spans.push({ text: part.slice(2, -2), bold: true });
    } else if (/^__/.test(part)) {
      spans.push({ text: part.slice(2, -2), bold: true });
    } else if (/^\*/.test(part) || /^_/.test(part)) {
      spans.push({ text: part.slice(1, -1), italics: true });
    } else if (/^`/.test(part)) {
      spans.push({ text: part.slice(1, -1), code: true });
    } else {
      spans.push({ text: part });
    }
  }
  return spans.map(s => new TextRun({
    text: s.text,
    bold: s.bold,
    italics: s.italics,
    font: s.code ? 'Courier New' : 'Calibri',
    size: s.code ? 18 : undefined, // 9pt for code
    color: s.code ? '888888' : undefined,
  }));
}

// ─── Block parser ─────────────────────────────────────────────────────────────

const HEADING_LEVEL: Record<number, HeadingLevel> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function buildDocxChildren(markdown: string): (Paragraph | Table)[] {
  const lines = markdown.split('\n');
  const children: (Paragraph | Table)[] = [];
  let tableRows: string[][] = [];
  let tableHasHeader = false;
  let inTableHeader = true;
  let ulDepth = 0;
  let olNum = 0;

  const flushTable = () => {
    if (!tableRows.length) return;
    const colCount = tableRows[0].length;
    const rows = tableRows.map((cells, rowIdx) =>
      new TableRow({
        tableHeader: rowIdx === 0 && tableHasHeader,
        children: cells.map(cell =>
          new TableCell({
            shading: rowIdx === 0 && tableHasHeader
              ? { fill: '2a2a2a', type: ShadingType.SOLID, color: '2a2a2a' }
              : rowIdx % 2 === 1
              ? { fill: '1f1f1f', type: ShadingType.SOLID, color: '1f1f1f' }
              : { fill: '1a1a1a', type: ShadingType.SOLID, color: '1a1a1a' },
            borders: {
              top:    { style: BorderStyle.SINGLE, size: 1, color: '333333' },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: '333333' },
              left:   { style: BorderStyle.SINGLE, size: 1, color: '333333' },
              right:  { style: BorderStyle.SINGLE, size: 1, color: '333333' },
            },
            width: { size: Math.floor(9000 / colCount), type: WidthType.DXA },
            children: [
              new Paragraph({
                children: parseInline(cell.trim()),
                spacing: { before: 60, after: 60 },
              }),
            ],
          }),
        ),
      }),
    );
    children.push(
      new Table({
        rows,
        width: { size: 9000, type: WidthType.DXA },
      }),
      new Paragraph({ text: '' }),
    );
    tableRows = [];
    tableHasHeader = false;
    inTableHeader = true;
  };

  for (const line of lines) {
    // ── Table ────────────────────────────────────────────────────────────────
    if (line.startsWith('|')) {
      const cells = line.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
      if (cells.every(c => /^[-:\s]+$/.test(c))) {
        // Separator row — mark that the previous row was the header
        tableHasHeader = tableRows.length > 0;
        inTableHeader = false;
        continue;
      }
      tableRows.push(cells);
      continue;
    } else {
      flushTable();
    }

    // ── Heading ──────────────────────────────────────────────────────────────
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) {
      ulDepth = 0; olNum = 0;
      children.push(
        new Paragraph({
          heading: HEADING_LEVEL[hm[1].length],
          children: parseInline(hm[2]),
          spacing: { before: 200, after: 80 },
        }),
      );
      continue;
    }

    // ── HR ───────────────────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,})$/.test(line.trim())) {
      children.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '333333' } },
          spacing: { before: 100, after: 100 },
          children: [],
        }),
      );
      continue;
    }

    // ── Bullet list ───────────────────────────────────────────────────────────
    const ulm = line.match(/^(\s*)[-*+]\s+(.+)/);
    if (ulm) {
      olNum = 0;
      children.push(
        new Paragraph({
          numbering: { reference: 'bullet-list', level: 0 },
          children: parseInline(ulm[2]),
          spacing: { before: 40, after: 40 },
        }),
      );
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────────
    const olm = line.match(/^\d+\.\s+(.+)/);
    if (olm) {
      ulDepth = 0;
      children.push(
        new Paragraph({
          numbering: { reference: 'numbered-list', level: 0 },
          children: parseInline(olm[1]),
          spacing: { before: 40, after: 40 },
        }),
      );
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    const bqm = line.match(/^>\s*(.+)/);
    if (bqm) {
      children.push(
        new Paragraph({
          children: parseInline(bqm[1]),
          indent: { left: convertInchesToTwip(0.4) },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: '555555' } },
          spacing: { before: 80, after: 80 },
        }),
      );
      continue;
    }

    // ── Empty line ────────────────────────────────────────────────────────────
    if (line.trim() === '') {
      ulDepth = 0; olNum = 0;
      children.push(new Paragraph({ text: '', spacing: { before: 0, after: 80 } }));
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    ulDepth = 0; olNum = 0;
    children.push(
      new Paragraph({
        children: parseInline(line),
        spacing: { before: 40, after: 40 },
      }),
    );
  }

  flushTable();
  return children;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function markdownToDocxBlob(markdown: string, title: string): Promise<Blob> {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'bullet-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
        {
          reference: 'numbered-list',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: convertInchesToTwip(0.5), hanging: convertInchesToTwip(0.25) } } },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '1a1a1a' },
          paragraph: { spacing: { line: 320 } },
        },
      },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 48, bold: true, color: '111111', font: 'Calibri' },
          paragraph: { spacing: { before: 400, after: 120 } },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 36, bold: true, color: '222222', font: 'Calibri' },
          paragraph: { spacing: { before: 320, after: 100 } },
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 28, bold: true, color: '333333', font: 'Calibri' },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
        {
          id: 'Heading4',
          name: 'Heading 4',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 24, bold: true, color: '444444', font: 'Calibri' },
          paragraph: { spacing: { before: 200, after: 60 } },
        },
        {
          id: 'Heading5',
          name: 'Heading 5',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 22, bold: true, color: '666666', font: 'Calibri' },
          paragraph: { spacing: { before: 160, after: 40 } },
        },
        {
          id: 'Heading6',
          name: 'Heading 6',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 20, bold: true, italics: true, color: '888888', font: 'Calibri' },
          paragraph: { spacing: { before: 120, after: 40 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children: buildDocxChildren(markdown),
      },
    ],
  });

  const buffer = await Packer.toBlob(doc);
  return buffer;
}

export function triggerDocxDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
