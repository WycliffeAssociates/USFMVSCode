import * as assert from 'assert';

import ValidMarkers from '../../markers';

suite('ValidMarkers dataset', () => {
    test('is a non-empty array of strings', () => {
        assert.ok(Array.isArray(ValidMarkers));
        assert.ok(ValidMarkers.length > 0);
        assert.ok(ValidMarkers.every((m) => typeof m === 'string'));
    });

    test('every marker starts with a backslash', () => {
        const offenders = ValidMarkers.filter((m) => !m.startsWith('\\'));
        assert.deepStrictEqual(offenders, [], `these markers do not start with "\\": ${offenders.join(', ')}`);
    });

    test('has no empty or whitespace-containing entries', () => {
        const offenders = ValidMarkers.filter((m) => m.length === 0 || /\s/.test(m));
        assert.deepStrictEqual(offenders, [], `these markers are empty or contain whitespace: ${JSON.stringify(offenders)}`);
    });

    test('includes core structural markers', () => {
        for (const marker of ['\\id', '\\c', '\\v', '\\p', '\\mt', '\\q']) {
            assert.ok(ValidMarkers.includes(marker), `expected ${marker} to be a known marker`);
        }
    });

    test('includes closing character markers', () => {
        for (const marker of ['\\add*', '\\f*', '\\w*']) {
            assert.ok(ValidMarkers.includes(marker), `expected ${marker} to be a known marker`);
        }
    });

    test('includes the \\mt4 marker added in 0.3.0', () => {
        assert.ok(ValidMarkers.includes('\\mt4'));
    });
});
