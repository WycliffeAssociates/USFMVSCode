import * as assert from 'assert';

import { isValidReferenceInput, parseReference, findReferenceLine } from '../../reference';

suite('isValidReferenceInput', () => {
    test('accepts chapter-only and chapter:verse', () => {
        assert.strictEqual(isValidReferenceInput('3'), true);
        assert.strictEqual(isValidReferenceInput('3:5'), true);
    });

    test('trims surrounding whitespace', () => {
        assert.strictEqual(isValidReferenceInput('  3:5  '), true);
    });

    test('rejects malformed input', () => {
        for (const bad of ['', 'abc', '3:', ':5', '3:5:6', '3a', 'v3']) {
            assert.strictEqual(isValidReferenceInput(bad), false, `expected "${bad}" to be rejected`);
        }
    });
});

suite('parseReference', () => {
    test('parses a chapter-only reference', () => {
        assert.deepStrictEqual(parseReference('3'), { chapter: 3, verse: null });
    });

    test('parses a chapter:verse reference', () => {
        assert.deepStrictEqual(parseReference('3:5'), { chapter: 3, verse: 5 });
    });

    test('trims whitespace before parsing', () => {
        assert.deepStrictEqual(parseReference('  12:7 '), { chapter: 12, verse: 7 });
    });

    test('parses multi-digit chapter and verse numbers', () => {
        assert.deepStrictEqual(parseReference('119:176'), { chapter: 119, verse: 176 });
    });

    test('returns null for invalid input', () => {
        assert.strictEqual(parseReference('nope'), null);
        assert.strictEqual(parseReference('3:'), null);
    });
});

suite('findReferenceLine', () => {
    const doc = [
        '\\id GEN', // 0
        '\\c 1', // 1
        '\\v 1 a', // 2
        '\\v 2 b', // 3
        '\\c 2', // 4
        '\\v 1 c', // 5
        '\\v 2 d', // 6
    ];

    test('finds a chapter-only reference at the chapter line', () => {
        assert.deepStrictEqual(findReferenceLine(doc, 2, null), { line: 4, character: 0, chapterLine: 4 });
    });

    test('finds a verse within the requested chapter', () => {
        assert.deepStrictEqual(findReferenceLine(doc, 1, 2), { line: 3, character: 0, chapterLine: 1 });
    });

    test('finds a verse in a later chapter', () => {
        assert.deepStrictEqual(findReferenceLine(doc, 2, 1), { line: 5, character: 0, chapterLine: 4 });
    });

    test('stops searching for a verse at the next chapter (no fall-through)', () => {
        // Verse 1 exists in both chapters; a chapter-1 search must resolve to line 2, not line 5.
        assert.deepStrictEqual(findReferenceLine(doc, 1, 1), { line: 2, character: 0, chapterLine: 1 });
    });

    test('reports a missing verse but a located chapter', () => {
        assert.deepStrictEqual(findReferenceLine(doc, 1, 9), { line: -1, character: -1, chapterLine: 1 });
    });

    test('reports a missing chapter', () => {
        assert.deepStrictEqual(findReferenceLine(doc, 99, null), { line: -1, character: -1, chapterLine: -1 });
        assert.deepStrictEqual(findReferenceLine(doc, 99, 1), { line: -1, character: -1, chapterLine: -1 });
    });

    test('disambiguates multi-digit chapters (\\c 1 must not match \\c 11)', () => {
        const numbered = ['\\c 11', '\\v 176 x'];
        // Chapter 1 is absent even though "11" contains the digit "1".
        assert.deepStrictEqual(findReferenceLine(numbered, 1, null), { line: -1, character: -1, chapterLine: -1 });
        assert.deepStrictEqual(findReferenceLine(numbered, 11, null), { line: 0, character: 0, chapterLine: 0 });
        assert.deepStrictEqual(findReferenceLine(numbered, 11, 176), { line: 1, character: 0, chapterLine: 0 });
    });

    test('does not resolve the second number of a verse bridge (\\v 1-2)', () => {
        const bridge = ['\\c 1', '\\v 1-2 x'];
        assert.deepStrictEqual(findReferenceLine(bridge, 1, 2), { line: -1, character: -1, chapterLine: 0 });
        assert.deepStrictEqual(findReferenceLine(bridge, 1, 1), { line: 1, character: 0, chapterLine: 0 });
    });

    test('still resolves references when lines retain a trailing carriage return', () => {
        // The command splits on /\r?\n/ so lines never keep \r; this pins the contract.
        const crlf = ['\\c 1\r', '\\v 2 b\r'];
        assert.deepStrictEqual(findReferenceLine(crlf, 1, null), { line: 0, character: 0, chapterLine: 0 });
        assert.deepStrictEqual(findReferenceLine(crlf, 1, 2), { line: 1, character: 0, chapterLine: 0 });
    });
    test('finds a verse that shares a line with its chapter marker', () => {
        const line = '\\c 1 \\v 1 In the beginning';
        const shared = ['\\id GEN', line, '\\v 2 And the earth'];

        // Verse 1 used to be unreachable: the chapter line was never re-scanned for verses.
        assert.deepStrictEqual(findReferenceLine(shared, 1, 1), {
            line: 1,
            character: line.indexOf('\\v 1'),
            chapterLine: 1,
        });
        assert.deepStrictEqual(findReferenceLine(shared, 1, 2), { line: 2, character: 0, chapterLine: 1 });
    });

    test('resolves each verse on a line that holds several', () => {
        const line = '\\c 1 \\p \\v 1 alpha \\v 2 beta \\v 3 gamma';
        const oneLiner = [line];

        assert.deepStrictEqual(findReferenceLine(oneLiner, 1, 1), {
            line: 0,
            character: line.indexOf('\\v 1'),
            chapterLine: 0,
        });
        assert.deepStrictEqual(findReferenceLine(oneLiner, 1, 2), {
            line: 0,
            character: line.indexOf('\\v 2'),
            chapterLine: 0,
        });
        assert.deepStrictEqual(findReferenceLine(oneLiner, 1, 3), {
            line: 0,
            character: line.indexOf('\\v 3'),
            chapterLine: 0,
        });
    });

    test('lands on a chapter marker that starts partway into a line', () => {
        const line = '\\c 1 \\v 1 a \\c 2 \\v 1 b';
        assert.deepStrictEqual(findReferenceLine([line], 2, null), {
            line: 0,
            character: line.indexOf('\\c 2'),
            chapterLine: 0,
        });
        assert.deepStrictEqual(findReferenceLine([line], 2, 1), {
            line: 0,
            character: line.lastIndexOf('\\v 1'),
            chapterLine: 0,
        });
    });

    test('stops at a chapter marker later on the same line', () => {
        // Verse 2 belongs to chapter 2, so a chapter-1 search must not reach it.
        const line = '\\c 1 \\v 1 a \\c 2 \\v 2 b';
        assert.deepStrictEqual(findReferenceLine([line], 1, 2), { line: -1, character: -1, chapterLine: 0 });
    });
    test('reports a missing verse inside a one-line chapter', () => {
        // The chapter is located even though everything shares a line, so the
        // command can say "verse not found" rather than "chapter not found".
        const line = '\\c 1 \\v 1 a \\v 2 b';
        assert.deepStrictEqual(findReferenceLine([line], 1, 9), { line: -1, character: -1, chapterLine: 0 });
    });

    test('resolves a chapter-only reference on a line that also holds verses', () => {
        const line = '\\c 5 \\v 1 a \\v 2 b';
        assert.deepStrictEqual(findReferenceLine([line], 5, null), { line: 0, character: 0, chapterLine: 0 });
    });

    test('does not reach a verse that shares a line with an earlier chapter', () => {
        // Chapter 2's verses sit on chapter 1's line; a chapter-2 search must
        // still resolve within chapter 2 only.
        const lines = ['\\c 1 \\v 1 a \\v 2 b', '\\c 2 \\v 1 c'];
        assert.deepStrictEqual(findReferenceLine(lines, 2, 2), { line: -1, character: -1, chapterLine: 1 });
        assert.deepStrictEqual(findReferenceLine(lines, 2, 1), {
            line: 1,
            character: lines[1].indexOf('\\v 1'),
            chapterLine: 1,
        });
    });
});
