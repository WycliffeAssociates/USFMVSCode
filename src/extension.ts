'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { ServerOptions, TransportKind, LanguageClientOptions, LanguageClient } from 'vscode-languageclient/node';
import { workspace } from 'vscode';

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
}


// this method is called when your extension is deactivated
export function deactivate() {
    if (!client) {
        return undefined;
	}
	return client.stop();
}