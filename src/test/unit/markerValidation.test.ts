import * as assert from 'assert';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node';

import { findInvalidMarkers, computeDiagnostics, normalizeMarker } from '../../markerValidation';

function doc(text: string): TextDocument {
    return TextDocument.create('file:///test.usfm', 'usfm', 1, text);
}

suite('normalizeMarker', () => {
    test('strips a leading nested "+"', () => {
        assert.strictEqual(normalizeMarker('\\+add'), '\\add');
        assert.strictEqual(normalizeMarker('\\+bd*'), '\\bd*');
    });

    test('leaves a plain marker unchanged', () => {
        assert.strictEqual(normalizeMarker('\\add'), '\\add');
        assert.strictEqual(normalizeMarker('\\add*'), '\\add*');
    });
});

suite('findInvalidMarkers', () => {
    test('returns nothing for a document of valid markers', () => {
        const text = '\\id GEN\n\\c 1\n\\v 1 In the beginning\n\\p';
        assert.deepStrictEqual(findInvalidMarkers(text), []);
    });

    test('returns nothing for marker-free text', () => {
        assert.deepStrictEqual(findInvalidMarkers('just some plain words'), []);
    });

    test('flags an unknown marker with its raw form, offset and length', () => {
        const result = findInvalidMarkers('\\zz something');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].raw, '\\zz');
        assert.strictEqual(result[0].marker, '\\zz');
        assert.strictEqual(result[0].index, 0);
        assert.strictEqual(result[0].length, 3);
    });

    test('accepts nested character markers (\\+add ... \\+add*)', () => {
        // Regression for the 0.3.2 nested-marker support.
        assert.deepStrictEqual(findInvalidMarkers('\\v 1 \\+add word\\+add*'), []);
    });

    test('accepts a nested closing marker whose base is valid', () => {
        assert.deepStrictEqual(findInvalidMarkers('\\+bd*'), []);
    });

    test('flags a nested marker whose base is unknown, keeping the raw "+" form', () => {
        const result = findInvalidMarkers('\\+zz');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].raw, '\\+zz'); // raw keeps the "+"
        assert.strictEqual(result[0].marker, '\\zz'); // normalised for lookup
    });

    test('flags multiple invalid markers at the correct offsets', () => {
        const text = '\\zz \\v 1 \\qq';
        const result = findInvalidMarkers(text);
        assert.strictEqual(result.length, 2);
        assert.strictEqual(result[0].raw, '\\zz');
        assert.strictEqual(result[0].index, 0);
        assert.strictEqual(result[1].raw, '\\qq');
        assert.strictEqual(result[1].index, text.indexOf('\\qq'));
    });

    test('flags a lone backslash', () => {
        const result = findInvalidMarkers('abc \\ def');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].raw, '\\');
        assert.strictEqual(result[0].length, 1);
    });

    test('flags every piece of an (unsupported) milestone marker', () => {
        // Regression guard for the documented milestone limitation (README "Known issues").
        // When milestone support is added, these assertions should be updated deliberately.
        const result = findInvalidMarkers('\\zaln-s |x-strong="H1"\\zaln-e\\*');
        assert.deepStrictEqual(result.map((r) => r.raw), ['\\zaln-s', '\\zaln-e', '\\*']);
        assert.deepStrictEqual(findInvalidMarkers('\\ts\\*').map((r) => r.raw), ['\\ts', '\\*']);
    });

    test('does not recognise uppercase marker names (\\ADD degrades to a lone backslash)', () => {
        const result = findInvalidMarkers('\\ADD word');
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].raw, '\\');
        assert.strictEqual(result[0].index, 0);
        assert.strictEqual(result[0].length, 1);
    });

    test('accepts a character marker carrying attributes (pipe syntax)', () => {
        assert.deepStrictEqual(findInvalidMarkers('\\w grace|strong="G5485"\\w*'), []);
    });
});

suite('computeDiagnostics', () => {
    test('produces no diagnostics for a valid document', () => {
        assert.deepStrictEqual(computeDiagnostics(doc('\\c 1\n\\v 1 text')), []);
    });

    test('produces an error diagnostic with the correct range and message', () => {
        const text = '\\v 1 \\zz here';
        const diagnostics = computeDiagnostics(doc(text));
        assert.strictEqual(diagnostics.length, 1);

        const d = diagnostics[0];
        assert.strictEqual(d.severity, DiagnosticSeverity.Error);
        assert.strictEqual(d.message, '\\zz is not a valid marker');
        assert.strictEqual(d.source, 'ex');
        // "\zz" begins at offset 5 on the first line.
        assert.deepStrictEqual(d.range.start, { line: 0, character: 5 });
        assert.deepStrictEqual(d.range.end, { line: 0, character: 8 });
    });

    test('maps offsets to positions across multiple lines', () => {
        const diagnostics = computeDiagnostics(doc('\\c 1\n\\zz'));
        assert.strictEqual(diagnostics.length, 1);
        assert.deepStrictEqual(diagnostics[0].range.start, { line: 1, character: 0 });
        assert.deepStrictEqual(diagnostics[0].range.end, { line: 1, character: 3 });
    });
});
