'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { ServerOptions, TransportKind, LanguageClientOptions, LanguageClient } from 'vscode-languageclient/node';
import { workspace } from 'vscode';
import { isValidReferenceInput, parseReference, findReferenceLine } from './reference';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {

    let serverModule = context.asAbsolutePath(
        path.join('dist', 'server.js')
    );

    let debugOptions = {execArgv: ['--nolazy', '--inspect=6009']};

    let serverOptions: ServerOptions = {
            run: { module: serverModule, transport: TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: TransportKind.ipc,
                options: debugOptions
            }
        };

        // Options to control the language client
        let clientOptions: LanguageClientOptions = {
            // Register the server for plain text documents
            documentSelector: [{ scheme: 'file', language: 'usfm' }],
            synchronize: {
                // Notify the server about file changes to '.clientrc files contained in the workspace
                fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
            }
        };

        // Create the language client and start the client.
        client = new LanguageClient(
            'USFMLanguageServer',
            'USFM Language Server',
            serverOptions,
            clientOptions
        );

        // Start the client. This will also launch the server
        client.start();
        context.subscriptions.push(vscode.commands.registerCommand("usfmvscode.test", (param) => {
            client.sendRequest("custom/request", "Hello world");
        }));

        context.subscriptions.push(vscode.commands.registerCommand("usfmvscode.goToReference", async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.document.languageId !== 'usfm') {
                vscode.window.showErrorMessage('Open a USFM file first.');
                return;
            }

            const input = await vscode.window.showInputBox({
                prompt: 'Enter a reference (e.g. 3 or 3:5)',
                placeHolder: 'chapter:verse',
                validateInput: (value) => {
                    if (!isValidReferenceInput(value)) {
                        return 'Use the format: chapter (e.g. 3) or chapter:verse (e.g. 3:5)';
                    }
                    return null;
                }
            });
            if (!input) {return;}

            const reference = parseReference(input);
            if (!reference) {return;}
            const { chapter: targetChapter, verse: targetVerse } = reference;

            const lines = editor.document.getText().split(/\r?\n/);
            const { line: targetLine, character: targetCharacter, chapterLine } =
                findReferenceLine(lines, targetChapter, targetVerse);

            if (targetLine === -1) {
                const msg = chapterLine === -1
                    ? `Chapter ${targetChapter} not found.`
                    : `Verse ${targetVerse} not found in chapter ${targetChapter}.`;
                vscode.window.showErrorMessage(msg);
                return;
            }

            // Land on the marker itself, which is not column 0 when the
            // reference shares a line with other chapter/verse markers.
            const position = new vscode.Position(targetLine, targetCharacter);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.AtTop);
        }));
}


// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
	}
	return client.stop();
}