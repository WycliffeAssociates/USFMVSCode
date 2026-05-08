//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

import * as assert from 'assert';
import { parseUSFMDocumentSymbols } from '../../usfmParser';

suite("Extension Tests", function () {

    test("Document symbols parse correctly with LF line endings", function () {
        const text = "\\c 1\n\\v 1 In the beginning\n\\v 2 And the earth";
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, "Chapter 1");
        // selectionRange stays on the chapter marker line
        assert.strictEqual(symbols[0].selectionRange.end.character, 4); // "\\c 1".length === 4
        // range spans to the last line of the file
        assert.strictEqual(symbols[0].range.end.line, 2);

        const children = symbols[0].children || [];
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].name, "Verse 1");
        // Verse 1 span ends at line 1 (the line before verse 2 starts)
        assert.strictEqual(children[0].range.end.line, 1);
        assert.strictEqual(children[0].range.end.character, "\\v 1 In the beginning".length);
        assert.strictEqual(children[1].name, "Verse 2");
        assert.strictEqual(children[1].range.end.line, 2);
        assert.strictEqual(children[1].range.end.character, "\\v 2 And the earth".length);
    });

    test("Document symbols parse correctly with CRLF line endings", function () {
        const text = "\\c 1\r\n\\v 1 In the beginning\r\n\\v 2 And the earth";
        const symbols = parseUSFMDocumentSymbols(text);

        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].name, "Chapter 1");
        // The \r should be stripped by the split, so the selection end column is just "\\c 1".length
        assert.strictEqual(symbols[0].selectionRange.end.character, 4);
        assert.strictEqual(symbols[0].range.end.line, 2);

        const children = symbols[0].children || [];
        assert.strictEqual(children.length, 2);
        assert.strictEqual(children[0].name, "Verse 1");
        // If split incorrectly left \r, this would be 23 instead of 22
        assert.strictEqual(children[0].range.end.character, "\\v 1 In the beginning".length);
        assert.strictEqual(children[0].range.end.line, 1);
        assert.strictEqual(children[1].name, "Verse 2");
        assert.strictEqual(children[1].range.end.character, "\\v 2 And the earth".length);
    });

    test("CRLF range lengths do not include \\r", function () {
        const text = "\\c 1\r\nabc\r\n\\v 1 def\r\n\\v 2 ghi";
        const symbols = parseUSFMDocumentSymbols(text);
        assert.strictEqual(symbols.length, 1);
        assert.strictEqual(symbols[0].children!.length, 2);

        // Verse 1 starts at line 2. When verse 2 starts at line 3,
        // verse 1 range closes at line 2 with character = lines[2].length.
        // lines[2] = "\\v 1 def" (length 8). If \\r leaked in, length would be 9.
        assert.strictEqual(symbols[0].children![0].range.end.line, 2);
        assert.strictEqual(symbols[0].children![0].range.end.character, 8);

        // Chapter range closes at the last line (line 3, "\\v 2 ghi", length 8)
        assert.strictEqual(symbols[0].range.end.line, 3);
        assert.strictEqual(symbols[0].range.end.character, 8);
    });
});
