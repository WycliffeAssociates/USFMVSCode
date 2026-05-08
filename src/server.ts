import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    TextDocumentSyncKind,
    DocumentSymbol,
    DocumentSymbolParams,
    SymbolKind,
    Range,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import ValidMarkers from './markers';

let connection = createConnection(ProposedFeatures.all);
let documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
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

connection.onDocumentSymbol((params: DocumentSymbolParams): DocumentSymbol[] => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];

    const text = document.getText();
    const lines = text.split(/\r?\n/);
    const lastLine = lines.length - 1;

    const symbols: DocumentSymbol[] = [];
    let currentChapter: DocumentSymbol | null = null;
    let currentChapterStartLine = 0;
    let currentVerse: DocumentSymbol | null = null;
    let currentVerseStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const chapterMatch = line.match(/\\c\s+(\d+)/);
        if (chapterMatch) {
            if (currentVerse) {
                currentVerse.range = Range.create(currentVerseStartLine, 0, i - 1, lines[i - 1].length);
                currentVerse = null;
            }
            if (currentChapter) {
                currentChapter.range = Range.create(currentChapterStartLine, 0, i - 1, lines[i - 1].length);
            }
            const selRange = Range.create(i, 0, i, line.length);
            currentChapter = DocumentSymbol.create(
                `Chapter ${chapterMatch[1]}`,
                undefined,
                SymbolKind.Module,
                selRange,
                selRange,
                []
            );
            currentChapterStartLine = i;
            symbols.push(currentChapter);
            continue;
        }

        const verseMatch = line.match(/\\v\s+(\d+)/);
        if (verseMatch && currentChapter) {
            if (currentVerse) {
                currentVerse.range = Range.create(currentVerseStartLine, 0, i - 1, lines[i - 1].length);
            }
            const selRange = Range.create(i, 0, i, line.length);
            currentVerse = DocumentSymbol.create(
                `Verse ${verseMatch[1]}`,
                undefined,
                SymbolKind.String,
                selRange,
                selRange,
                []
            );
            currentVerseStartLine = i;
            currentChapter.children!.push(currentVerse);
        }
    }

    if (currentVerse) {
        currentVerse.range = Range.create(currentVerseStartLine, 0, lastLine, lines[lastLine].length);
    }
    if (currentChapter) {
        currentChapter.range = Range.create(currentChapterStartLine, 0, lastLine, lines[lastLine].length);
    }

    return symbols;
});

documents.listen(connection);
connection.listen();