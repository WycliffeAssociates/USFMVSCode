/**
 * A parsed scripture reference. `verse` is null when only a chapter was given.
 */
export interface Reference {
    chapter: number;
    verse: number | null;
}

/**
 * Where a reference resolves to within a document's lines.
 * `line` is -1 when the target could not be found. `chapterLine` is -1 when the
 * chapter itself was never found (used to distinguish "chapter missing" from
 * "verse missing within the chapter").
 */
export interface ReferenceLocation {
    line: number;
    chapterLine: number;
}

/** Accepts `chapter` (e.g. `3`) or `chapter:verse` (e.g. `3:5`). */
export const REFERENCE_INPUT_PATTERN = /^\d+(?::\d+)?$/;

/** Validate raw user input for the go-to-reference prompt (trims first). */
export function isValidReferenceInput(value: string): boolean {
    return REFERENCE_INPUT_PATTERN.test(value.trim());
}

/**
 * Parse user input into a {@link Reference}, or null when the input is not a
 * valid `chapter` / `chapter:verse` string.
 */
export function parseReference(input: string): Reference | null {
    const trimmed = input.trim();
    if (!isValidReferenceInput(trimmed)) {
        return null;
    }
    const parts = trimmed.split(':');
    const chapter = parseInt(parts[0], 10);
    const verse = parts.length > 1 ? parseInt(parts[1], 10) : null;
    return { chapter, verse };
}

/**
 * Find the line (0-based) of a chapter or chapter:verse reference in USFM text.
 *
 * The first `\c <targetChapter>` line is located; when a verse is requested,
 * the search then walks forward for `\v <targetVerse>` and stops at the next
 * `\c` marker (verses are only matched within their chapter). When only a
 * chapter is requested, its own line is the target.
 */
export function findReferenceLine(
    lines: string[],
    targetChapter: number,
    targetVerse: number | null
): ReferenceLocation {
    let chapterLine = -1;
    let targetLine = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (chapterLine === -1) {
            const m = line.match(/\\c\s+(\d+)/);
            if (m && parseInt(m[1], 10) === targetChapter) {
                chapterLine = i;
                if (targetVerse === null) {
                    targetLine = i;
                    break;
                }
            }
        } else {
            if (/\\c\s+\d+/.test(line)) {
                break;
            }
            const m = line.match(/\\v\s+(\d+)/);
            if (m && parseInt(m[1], 10) === targetVerse) {
                targetLine = i;
                break;
            }
        }
    }

    return { line: targetLine, chapterLine };
}
