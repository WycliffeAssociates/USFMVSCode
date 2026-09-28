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

    suite('soft word wrap', function () {
        this.timeout(60000);

        // A long \wj line full of nested markers. With column wrapping the
        // wrapper must never leave a lone "\" at the end of a visual line and
        // start the next one with "+add" (issue reported by OET.Bible).
        const LINE =
            '\\v 1 \\wj Then said Jesus to them, \\+add Truly\\+add* I say to you, ' +
            'the one who \\+add hears\\+add* my word and \\+add believes\\+add* ' +
            'the one who sent me has \\+add eternal life\\+add* and does not come ' +
            'into judgment, but has \\+add passed\\+add* from death to life.\\wj*';

        const editorConfig = () => vscode.workspace.getConfiguration('editor');

        suiteSetup(async () => {
            await editorConfig().update('wordWrap', 'wordWrapColumn', vscode.ConfigurationTarget.Global);
        });

        suiteTeardown(async () => {
            await editorConfig().update('wordWrap', undefined, vscode.ConfigurationTarget.Global);
            await editorConfig().update('wordWrapColumn', undefined, vscode.ConfigurationTarget.Global);
            await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        });

        /** Column at which each wrapped (visual) line of line 0 starts. */
        async function wrappedLineStarts(editor: vscode.TextEditor): Promise<number[]> {
            editor.selection = new vscode.Selection(0, 0, 0, 0);
            const starts = [0];
            for (;;) {
                await vscode.commands.executeCommand('cursorMove', { to: 'down', by: 'wrappedLine' });
                await vscode.commands.executeCommand('cursorMove', { to: 'wrappedLineStart' });
                const pos = editor.selection.active;
                if (pos.line !== 0 || pos.character <= starts[starts.length - 1]) {
                    return starts;
                }
                starts.push(pos.character);
            }
        }

        /** Wrap columns at which some visual line starts on the "+" of "\+". */
        async function splitMarkerColumns(language: string): Promise<number[]> {
            const doc = await vscode.workspace.openTextDocument({ language, content: LINE });
            const editor = await vscode.window.showTextDocument(doc);
            const bad: number[] = [];
            for (let column = 20; column <= 60; column++) {
                await editorConfig().update('wordWrapColumn', column, vscode.ConfigurationTarget.Global);
                const starts = await wrappedLineStarts(editor);
                assert.ok(starts.length > 1, `line should wrap at column ${column}`);
                if (starts.some(c => c > 0 && LINE[c] === '+' && LINE[c - 1] === '\\')) {
                    bad.push(column);
                }
            }
            return bad;
        }

        test('contributes a usfm wrap default that does not break before "+"', () => {
            const breakBefore = vscode.workspace
                .getConfiguration('editor', { languageId: 'usfm' })
                .get<string>('wordWrapBreakBeforeCharacters', '');
            assert.ok(breakBefore.startsWith('([{'), `expected the default break characters, got "${breakBefore}"`);
            assert.ok(!breakBefore.includes('+'), `unexpected "+" in ${breakBefore}`);
            assert.ok(!breakBefore.includes('＋'), `unexpected "＋" in ${breakBefore}`);
        });

        test('control: plaintext splits "\\+" markers across wrapped lines', async () => {
            // Proves the scenario reproduces VS Code's default behaviour, so the
            // usfm assertion below is meaningful.
            assert.notDeepStrictEqual(await splitMarkerColumns('plaintext'), []);
        });

        test('usfm never splits "\\+" markers across wrapped lines', async () => {
            assert.deepStrictEqual(await splitMarkerColumns('usfm'), []);
        });
    });
});
