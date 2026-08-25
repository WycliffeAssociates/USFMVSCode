/**
 * Locating the chapter (`\c`) and verse (`\v`) markers that drive the document
 * outline and reference navigation.
 *
 * USFM does not require one marker per line: `\c 1 \p \v 1 ... \v 2 ...` is
 * valid, and some exports put an entire chapter on a single line. Markers are
 * therefore located by their character offset within a line rather than by line
 * alone, so every marker on a shared line is found instead of just the first.
 */

/** A `\c` or `\v` marker located within a document's lines. */
export interface ChapterVerseMarker {
    kind: 'chapter' | 'verse';
    /** The leading number of the marker, e.g. 2 for both `\v 2` and `\v 2-3`. */
    number: number;
    /** 0-based line the marker sits on. */
    line: number;
    /** 0-based offset of the marker's backslash within its line. */
    character: number;
    /**
     * 0-based offset where this marker's content ends: the start of the next
     * `\c`/`\v` marker on the same line, or the end of the line when it is the
     * last one there.
     */
    endCharacter: number;
}

/**
 * Matches `\c <n>` and `\v <n>`. The whitespace after the letter is required so
 * that longer markers starting with the same letter (`\ca`, `\cl`, `\cp`,
 * `\va`, `\vp`) are never mistaken for a chapter or verse.
 */
const CHAPTER_VERSE_PATTERN = /\\([cv])\s+(\d+)/g;

/** Scan a single line for its `\c`/`\v` markers, in the order they appear. */
function findMarkersInLine(line: string, lineNumber: number): ChapterVerseMarker[] {
    // A fresh RegExp instance per call keeps the stateful `g` flag isolated.
    const pattern = new RegExp(CHAPTER_VERSE_PATTERN.source, 'g');
    const markers: ChapterVerseMarker[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(line))) {
        markers.push({
            kind: m[1] === 'c' ? 'chapter' : 'verse',
            number: parseInt(m[2], 10),
            line: lineNumber,
            character: m.index,
            endCharacter: line.length,
        });
    }
    // Each marker runs up to the next one on the same line; the last keeps the
    // end of the line.
    for (let i = 0; i < markers.length - 1; i++) {
        markers[i].endCharacter = markers[i + 1].character;
    }
    return markers;
}

/**
 * Scan a document's lines for every `\c`/`\v` marker, in document order
 * (top to bottom, then left to right within each line).
 */
export function findChapterVerseMarkers(lines: string[]): ChapterVerseMarker[] {
    const markers: ChapterVerseMarker[] = [];
    for (let i = 0; i < lines.length; i++) {
        markers.push(...findMarkersInLine(lines[i], i));
    }
    return markers;
}
