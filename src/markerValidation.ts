import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

import ValidMarkers from './markers';

/**
 * Matches a USFM marker: a backslash, an optional leading "+" (which marks a
 * nested character marker, e.g. `\+add` or `\+bd*`), the marker name, and any
 * trailing "*" that closes a character marker.
 * See https://ubsicap.github.io/usfm/characters/nesting.html
 */
const MARKER_PATTERN = /\\\+?[a-z0-9\-]*\**/g;

/**
 * Normalise a raw match to the marker used for validity lookups. A nested
 * marker is valid wherever its base marker is, so the leading "+" is stripped
 * before checking against the known-marker list.
 */
export function normalizeMarker(raw: string): string {
    return raw.replace(/^\\\+/, '\\');
}

export interface InvalidMarker {
    /** The raw text matched in the document, e.g. `\+zz`. */
    raw: string;
    /** The normalised marker used for the validity check, e.g. `\zz`. */
    marker: string;
    /** Offset of the match within the document text. */
    index: number;
    /** Length of the raw match. */
    length: number;
}

/**
 * Scan document text and return every marker-like token that is not a known
 * valid USFM marker. Pure and offset-based so it can be unit tested without a
 * TextDocument or language server connection.
 */
export function findInvalidMarkers(text: string): InvalidMarker[] {
    // A fresh RegExp instance per call keeps the stateful `g` flag isolated.
    const pattern = new RegExp(MARKER_PATTERN.source, 'g');
    const invalid: InvalidMarker[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text))) {
        const raw = m[0];
        const marker = normalizeMarker(raw);
        if (ValidMarkers.indexOf(marker) === -1) {
            invalid.push({ raw, marker, index: m.index, length: raw.length });
        }
    }
    return invalid;
}

/**
 * Produce diagnostics for every invalid marker in a document. This is the pure
 * core of the language server's `validateUSFM`, split out from the connection
 * so it can be unit tested with a plain `TextDocument.create(...)`.
 */
export function computeDiagnostics(textDocument: TextDocument): Diagnostic[] {
    return findInvalidMarkers(textDocument.getText()).map((item) => ({
        severity: DiagnosticSeverity.Error,
        range: {
            start: textDocument.positionAt(item.index),
            end: textDocument.positionAt(item.index + item.length),
        },
        message: `${item.raw} is not a valid marker`,
        source: 'ex',
    }));
}
