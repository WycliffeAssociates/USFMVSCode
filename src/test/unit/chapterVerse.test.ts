import * as assert from 'assert';

import { findChapterVerseMarkers } from '../../chapterVerse';

suite('findChapterVerseMarkers', () => {
    test('finds a chapter and a verse that share a line', () => {
        const line = '\\c 1 \\v 1 In the beginning';
        const markers = findChapterVerseMarkers([line]);

        assert.deepStrictEqual(markers, [
            { kind: 'chapter', number: 1, line: 0, character: 0, endCharacter: line.indexOf('\\v 1') },
            { kind: 'verse', number: 1, line: 0, character: line.indexOf('\\v 1'), endCharacter: line.length },
        ]);
    });

    test('finds every verse on a line, in the order they appear', () => {
        const line = '\\p \\v 1 alpha \\v 2 beta \\v 3 gamma';
        const markers = findChapterVerseMarkers([line]);

        assert.deepStrictEqual(markers.map((m) => m.number), [1, 2, 3]);
        assert.deepStrictEqual(markers.map((m) => m.character), [
            line.indexOf('\\v 1'),
            line.indexOf('\\v 2'),
            line.indexOf('\\v 3'),
        ]);
        // Each marker runs up to the next one; the last runs to the end of the line.
        assert.deepStrictEqual(markers.map((m) => m.endCharacter), [
            line.indexOf('\\v 2'),
            line.indexOf('\\v 3'),
            line.length,
        ]);
    });

    test('reports markers in document order across lines', () => {
        const markers = findChapterVerseMarkers(['\\c 1 \\v 1 a', '\\v 2 b', '\\c 2 \\v 1 c']);

        assert.deepStrictEqual(
            markers.map((m) => `${m.kind} ${m.number} @${m.line}:${m.character}`),
            ['chapter 1 @0:0', 'verse 1 @0:5', 'verse 2 @1:0', 'chapter 2 @2:0', 'verse 1 @2:5']
        );
    });

    test('ignores longer markers that begin with c or v', () => {
        // \ca/\cl/\cp and \va/\vp all take numbers but are not chapters or verses.
        const markers = findChapterVerseMarkers([
            '\\c 1 \\ca 2 \\ca* \\cl Chapter 1 \\v 1 text \\va 2 \\va* \\vp 3 \\vp*',
        ]);

        assert.deepStrictEqual(
            markers.map((m) => `${m.kind} ${m.number}`),
            ['chapter 1', 'verse 1']
        );
    });

    test('requires whitespace between the marker and its number', () => {
        assert.deepStrictEqual(findChapterVerseMarkers(['\\c1 \\v1 text']), []);
    });

    test('does not match uppercase \\C / \\V', () => {
        assert.deepStrictEqual(findChapterVerseMarkers(['\\C 1 \\V 1 text']), []);
    });

    test('keeps only the leading number of a verse bridge', () => {
        const markers = findChapterVerseMarkers(['\\v 1-2 x']);
        assert.strictEqual(markers.length, 1);
        assert.strictEqual(markers[0].number, 1);
    });

    test('returns nothing for lines without chapter or verse markers', () => {
        assert.deepStrictEqual(findChapterVerseMarkers(['', '\\id GEN', '\\p plain text']), []);
    });
});
