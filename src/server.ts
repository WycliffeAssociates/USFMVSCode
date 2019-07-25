import {
    createConnection,
    TextDocuments,
    TextDocument,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
} from 'vscode-languageserver';

import ValidMarkers from './markers';

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments = new TextDocuments();
connection.console.log("hit");

let hasConfigurationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
    connection.console.log("Starting initialization");
    let capabilities = params.capabilities;

    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );

    return {
        capabilities: {
            textDocumentSync: documents.syncKind,
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
    let text = textDocument.getText();
    let pattern = /\\[a-z0-9\-]*\**/g;
    let diagnostics: Diagnostic[] = [];
    let m: RegExpExecArray | null;
    while((m = pattern.exec(text))){
        if(ValidMarkers.indexOf(m[0]) === -1){
            diagnostics.push(
                {
                    severity: DiagnosticSeverity.Error,
                    range: {
                        start:textDocument.positionAt(m.index),
                        end: textDocument.positionAt(m.index + m[0].length),
                    },
                    message: `${m[0]} is not a valid marker`,
                    source: "ex"
                }
            );
        }
    }
    connection.sendDiagnostics({uri: textDocument.uri, diagnostics});
}

documents.listen(connection);
connection.listen();