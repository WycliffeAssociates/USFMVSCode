import { findChapterVerseMarkers } from './chapterVerse';

/**
 * A parsed scripture reference. `verse` is null when only a chapter was given.
 */
export interface Reference {
    chapter: number;
    verse: number | null;
}

/**
 * Where a reference resolves to within a document's lines.
 * `line` and `character` are -1 when the target could not be found.
 * `character` is the offset of the resolved marker within its line, which
 * matters when a line holds several markers (`\c 1 \v 1 ... \v 2 ...`).
 * `chapterLine` is -1 when the chapter itself was never found (used to
 * distinguish "chapter missing" from "verse missing within the chapter").
 */
export interface ReferenceLocation {
    line: number;
    character: number;
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
 * Find the position (0-based line and character) of a chapter or chapter:verse
 * reference in USFM text.
 *
 * The first `\c <targetChapter>` marker is located; when a verse is requested,
 * the search then walks forward for `\v <targetVerse>` and stops at the next
 * `\c` marker (verses are only matched within their chapter). When only a
 * chapter is requested, the chapter marker itself is the target.
 *
 * Markers are matched wherever they appear, so a verse is still found when it
 * shares a line with its chapter marker or with other verses.
 */
export function findReferenceLine(
    lines: string[],
    targetChapter: number,
    targetVerse: number | null
): ReferenceLocation {
    let chapterLine = -1;
    let inTargetChapter = false;

    for (const marker of findChapterVerseMarkers(lines)) {
        if (marker.kind === 'chapter') {
            if (inTargetChapter) {
                // The target chapter ended without the verse turning up.
                break;
            }
            if (marker.number === targetChapter) {
                chapterLine = marker.line;
                if (targetVerse === null) {
                    return { line: marker.line, character: marker.character, chapterLine };
                }
                inTargetChapter = true;
            }
            continue;
        }

        if (inTargetChapter && marker.number === targetVerse) {
            return { line: marker.line, character: marker.character, chapterLine };
        }
    }

    return { line: -1, character: -1, chapterLine };
}
