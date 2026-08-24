import * as assert from 'assert';

import { parseUSFMDocumentSymbols } from '../../documentSymbols';

suite('parseUSFMDocumentSymbols', () => {
    test('parses a chapter with verses (LF line endings)', () => {
        const text = '\\c 1\n\\v 1 In the beginning\n\\v 2 And the earth';
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'Chapter 1');
        // selectionRange stays on the chapter marker line ("\c 1".length === 4)
        assert.strictEqual(symbols[0].selectionRange.end.character, 4);
        // range spans to the last line of the file
        assert.strictEqual(symbols[0].range.end.line, 2);

        const children = symbols[0].children || [];
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].name, 'Verse 1');
        // verse 1 closes on the line before verse 2 starts
        assert.strictEqual(children[0].range.end.line, 1);
        assert.strictEqual(children[0].range.end.character, '\\v 1 In the beginning'.length);
        assert.strictEqual(children[1].name, 'Verse 2');
        assert.strictEqual(children[1].range.end.line, 2);
        assert.strictEqual(children[1].range.end.character, '\\v 2 And the earth'.length);
    });

    test('strips \\r with CRLF line endings', () => {
        const text = '\\c 1\r\n\\v 1 In the beginning\r\n\\v 2 And the earth';
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        // If the \r leaked into the split, this would be 5 instead of 4.
        assert.strictEqual(symbols[0].selectionRange.end.character, 4);
        assert.strictEqual(symbols[0].range.end.line, 2);

        const children = symbols[0].children || [];
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].range.end.character, '\\v 1 In the beginning'.length);
    });

    test('CRLF range lengths do not include \\r', () => {
        const text = '\\c 1\r\nabc\r\n\\v 1 def\r\n\\v 2 ghi';
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        const children = symbols[0].children || [];
        assert.strictEqual(children.length, 2);
        // lines[2] = "\v 1 def" (length 8). If \r leaked in, length would be 9.
        assert.strictEqual(children[0].range.end.line, 2);
        assert.strictEqual(children[0].range.end.character, 8);
        // Chapter range closes at the last line (line 3, "\v 2 ghi", length 8).
        assert.strictEqual(symbols[0].range.end.line, 3);
        assert.strictEqual(symbols[0].range.end.character, 8);
    });

    test('returns an empty outline for empty text', () => {
        assert.deepStrictEqual(parseUSFMDocumentSymbols(''), []);
    });

    test('ignores verses that appear before any chapter', () => {
        const text = '\\v 1 orphan verse\n\\v 2 another';
        assert.deepStrictEqual(parseUSFMDocumentSymbols(text), []);
    });

    test('handles a chapter with no verses', () => {
        const text = '\\c 1\nsome intro text';
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, 'Chapter 1');
        assert.strictEqual((symbols[0].children || []).length, 0);
        assert.strictEqual(symbols[0].range.end.line, 1);
    });

    test('nests verses under the correct chapter and closes ranges at the next chapter', () => {
        const text = ['\\c 1', '\\v 1 a', '\\v 2 b', '\\c 2', '\\v 1 c'].join('\n');
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 2);
        assert.strictEqual(symbols[0].name, 'Chapter 1');
        assert.strictEqual(symbols[1].name, 'Chapter 2');

        // Chapter 1 closes on the line before Chapter 2 (line 2) and has two verses.
        assert.strictEqual(symbols[0].range.end.line, 2);
        assert.strictEqual((symbols[0].children || []).length, 2);

        // Chapter 2 has one verse and runs to the end of the document (line 4).
        const chapter2Children = symbols[1].children || [];
        assert.strictEqual(chapter2Children.length, 1);
        assert.strictEqual(chapter2Children[0].name, 'Verse 1');
        assert.strictEqual(symbols[1].range.end.line, 4);
    });

    test('records range.start and verse selectionRange, not just end positions', () => {
        const text = '\\c 1\n\\v 1 In the beginning\n\\v 2 And the earth';
        const symbols = parseUSFMDocumentSymbols(text);

        // The chapter symbol starts at the very top of the file.
        assert.deepStrictEqual(symbols[0].range.start, { line: 0, character: 0 });
        assert.deepStrictEqual(symbols[0].selectionRange.start, { line: 0, character: 0 });

        const verse1 = (symbols[0].children || [])[0];
        // A verse's selection range sits on its own line.
        assert.deepStrictEqual(verse1.range.start, { line: 1, character: 0 });
        assert.deepStrictEqual(verse1.selectionRange.start, { line: 1, character: 0 });
        assert.strictEqual(verse1.selectionRange.end.line, 1);
        assert.strictEqual(verse1.selectionRange.end.character, '\\v 1 In the beginning'.length);
    });

    test('captures multi-digit chapter and verse numbers', () => {
        const symbols = parseUSFMDocumentSymbols('\\c 12\n\\v 176 text');
        assert.strictEqual(symbols[0].name, 'Chapter 12');
        assert.strictEqual((symbols[0].children || [])[0].name, 'Verse 176');
    });

    test('keeps only the leading number of a verse bridge (\\v 1-2 -> "Verse 1")', () => {
        // Documents current behavior: the "-2" of a bridge is dropped from the label.
        const symbols = parseUSFMDocumentSymbols('\\c 1\n\\v 1-2 x');
        assert.strictEqual((symbols[0].children || [])[0].name, 'Verse 1');
    });

    test('ignores a chapter marker with no number', () => {
        // A numberless "\c" is not recognised, so the following verse is orphaned.
        assert.deepStrictEqual(parseUSFMDocumentSymbols('\\c\n\\v 1 text'), []);
    });

    test('does not treat uppercase \\C / \\V as chapter/verse markers', () => {
        assert.deepStrictEqual(parseUSFMDocumentSymbols('\\C 1\n\\V 1 text'), []);
    });
});
