//
// Integration tests that run inside a real VS Code host (via @vscode/test-electron).
// The extension's pure logic is covered by the fast unit tests under test/unit/;
// these verify the extension actually loads and wires itself up in VS Code.
//

import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'wycliffeassociates.usfmvscode';

suite('Extension integration', () => {
    test('extension is installed and discoverable', () => {
        assert.ok(
            vscode.extensions.getExtension(EXTENSION_ID),
            `extension ${EXTENSION_ID} should be discoverable`
        );
    });

    test('activates and registers the goToReference command', async () => {
        const ext = vscode.extensions.getExtension(EXTENSION_ID);
        assert.ok(ext, `extension ${EXTENSION_ID} should be discoverable`);

        await ext!.activate();
        assert.strictEqual(ext!.isActive, true, 'extension should activate');

        const commands = await vscode.commands.getCommands(true);
        assert.ok(
            commands.includes('usfmvscode.goToReference'),
            'usfmvscode.goToReference command should be registered'
        );
    });

    test('registers the usfm language', async () => {
        const languages = await vscode.languages.getLanguages();
        assert.ok(languages.includes('usfm'), 'usfm language should be registered');
    });
});
