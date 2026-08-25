import { DocumentSymbol, SymbolKind, Position, Range } from 'vscode-languageserver/node';

import { ChapterVerseMarker, findChapterVerseMarkers } from './chapterVerse';

/**
 * The position at which a symbol running up to `marker` should end.
 *
 * When `marker` shares its line with the marker before it, the earlier symbol
 * stops right where `marker` begins, so chapters/verses sharing a line each get
 * their own slice of it. Otherwise `marker` is the first one on its line and
 * the earlier symbol keeps its whole-line extent, closing at the end of the
 * previous line.
 */
function endBefore(
    marker: ChapterVerseMarker,
    previous: ChapterVerseMarker | null,
    lines: string[]
): Position {
    if (previous && previous.line === marker.line) {
        return Position.create(marker.line, marker.character);
    }
    const previousLine = Math.max(marker.line - 1, 0);
    return Position.create(previousLine, lines[previousLine].length);
}

/**
 * Build the document outline (chapters with nested verses) for a USFM document.
 *
 * Chapters are detected from `\c <n>` markers and verses from `\v <n>` markers,
 * wherever they appear — several of either may share a line (`\c 1 \p \v 1 ...
 * \v 2 ...`). A verse is only attached to the chapter that precedes it; verses
 * that appear before any chapter marker are ignored. Each symbol's `range` is
 * closed off when the next sibling begins, or at the end of the document for
 * the last one.
 *
 * This is the pure core of the language server's `onDocumentSymbol` handler,
 * split out so it can be unit tested without a language server connection.
 */
export function parseUSFMDocumentSymbols(text: string): DocumentSymbol[] {
    const lines = text.split(/\r?\n/);
    const lastLine = lines.length - 1;

    const symbols: DocumentSymbol[] = [];
    let currentChapter: DocumentSymbol | null = null;
    let currentChapterStart: Position = Position.create(0, 0);
    let currentVerse: DocumentSymbol | null = null;
    let currentVerseStart: Position = Position.create(0, 0);

    const markers = findChapterVerseMarkers(lines);
    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        const previous = i > 0 ? markers[i - 1] : null;
        // The marker's own text, up to the next marker on the same line.
        const selRange = Range.create(
            Position.create(marker.line, marker.character),
            Position.create(marker.line, marker.endCharacter)
        );

        if (marker.kind === 'chapter') {
            const end = endBefore(marker, previous, lines);
            if (currentVerse) {
                currentVerse.range = Range.create(currentVerseStart, end);
                currentVerse = null;
            }
            if (currentChapter) {
                currentChapter.range = Range.create(currentChapterStart, end);
            }
            currentChapter = DocumentSymbol.create(
                `Chapter ${marker.number}`,
                undefined,
                SymbolKind.Module,
                selRange,
                selRange,
                []
            );
            currentChapterStart = selRange.start;
            symbols.push(currentChapter);
            continue;
        }

        if (!currentChapter) {
            continue;
        }

        if (currentVerse) {
            currentVerse.range = Range.create(currentVerseStart, endBefore(marker, previous, lines));
        }
        currentVerse = DocumentSymbol.create(
            `Verse ${marker.number}`,
            undefined,
            SymbolKind.String,
            selRange,
            selRange,
            []
        );
        currentVerseStart = selRange.start;
        currentChapter.children!.push(currentVerse);
    }

    const documentEnd = Position.create(lastLine, lines[lastLine].length);
    if (currentVerse) {
        currentVerse.range = Range.create(currentVerseStart, documentEnd);
    }
    if (currentChapter) {
        currentChapter.range = Range.create(currentChapterStart, documentEnd);
    }

    return symbols;
}
