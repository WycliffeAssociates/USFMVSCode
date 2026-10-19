import {
    createConnection,
    TextDocuments,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    DocumentSymbol,
    DocumentSymbolParams,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { computeDiagnostics } from './markerValidation';
import { parseUSFMDocumentSymbols } from './documentSymbols';

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
connection.console.log("hit");

let hasConfigurationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    connection.console.log("Starting initialization");
    const capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );

    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            documentSymbolProvider: true,
        }
    };
});

connection.onInitialized(() =>{
    connection.console.log("Langauge server initialized");
    if (hasConfigurationCapability){
        connection.client.register(DidChangeConfigurationNotification.type, undefined);
    }
});

documents.onDidChangeContent(change => { validateUSFM(change.document);});

async function validateUSFM(textDocument: TextDocument) : Promise<void> {
    const diagnostics = computeDiagnostics(textDocument);
    connection.sendDiagnostics({uri: textDocument.uri, diagnostics});
}

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {return [];}

    return parseUSFMDocumentSymbols(document.getText());
});

documents.listen(connection);
connection.listen();