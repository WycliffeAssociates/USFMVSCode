import { DocumentSymbol, Range, SymbolKind } from 'vscode-languageserver/node';

export function parseUSFMDocumentSymbols(text: string): DocumentSymbol[] {
    const lines = text.split(/\r?\n/);
    const lastLine = lines.length - 1;

    const symbols: DocumentSymbol[] = [];
    let currentChapter: DocumentSymbol | null = null;
    let currentChapterStartLine = 0;
    let currentVerse: DocumentSymbol | null = null;
    let currentVerseStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const chapterMatch = line.match(/\\c\s+(\d+)/);
        if (chapterMatch) {
            if (currentVerse) {
                currentVerse.range = Range.create(currentVerseStartLine, 0, i - 1, lines[i - 1].length);
                currentVerse = null;
            }
            if (currentChapter) {
                currentChapter.range = Range.create(currentChapterStartLine, 0, i - 1, lines[i - 1].length);
            }
            const selRange = Range.create(i, 0, i, line.length);
            currentChapter = DocumentSymbol.create(
                `Chapter ${chapterMatch[1]}`,
                undefined,
                SymbolKind.Module,
                selRange,
                selRange,
                []
            );
            currentChapterStartLine = i;
            symbols.push(currentChapter);
            continue;
        }

        const verseMatch = line.match(/\\v\s+(\d+)/);
        if (verseMatch && currentChapter) {
            if (currentVerse) {
                currentVerse.range = Range.create(currentVerseStartLine, 0, i - 1, lines[i - 1].length);
            }
            const selRange = Range.create(i, 0, i, line.length);
            currentVerse = DocumentSymbol.create(
                `Verse ${verseMatch[1]}`,
                undefined,
                SymbolKind.String,
                selRange,
                selRange,
                []
            );
            currentVerseStartLine = i;
            currentChapter.children!.push(currentVerse);
        }
    }

    if (currentVerse) {
        currentVerse.range = Range.create(currentVerseStartLine, 0, lastLine, lines[lastLine].length);
    }
    if (currentChapter) {
        currentChapter.range = Range.create(currentChapterStartLine, 0, lastLine, lines[lastLine].length);
    }

    return symbols;
}
