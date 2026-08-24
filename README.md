# usfmvscode README

A Visual Studio Code Plugin to provide support for USFM

## Features

Language support for USFM

Basic syntax highlighting

## Development

Install dependencies with `npm ci`, then:

- `npm run compile` — bundle the extension and language server into `dist/` with webpack.
- `npm run watch` — rebuild on change while developing.
- Press <kbd>F5</kbd> (the **Run Extension** launch config) to open a new VS Code window with the extension loaded.

## Testing

The core logic (marker validation, the document outline, and reference
navigation) is factored into small modules under `src/` so it can be tested
without a running editor.

- `npm test` — fast unit tests (plain Node + Mocha, no VS Code host required).
  Runs in CI on every pull request.
- `npm run test:integration` — integration tests that launch a real VS Code
  instance via `@vscode/test-electron` and verify the extension activates and
  registers its command and language. On a headless Linux machine, run this
  under a virtual display (e.g. `xvfb-run -a npm run test:integration`).

Unit tests live in `src/test/unit/`; integration tests live in
`src/test/suite/`.

## Release Notes

### 0.0.1

Initial release

### 0.1.0

Support for basic syntax checking. Looks for strange markers

### 0.1.1

Added support for more markers in the syntax checking

### 0.1.2

Added support for more markers in the syntax checking

### 0.2.0

Added support for \it and \it* markers as well as cut the extension size back by quite a bit

### 0.2.1

Added support for \fq* and \im

### 0.3.0

Added document outline and go-to-reference support, plus the \mt4 marker

### 0.3.1

Dependency updates

### 0.3.2

Added support for nested character markers (e.g. `\+add`, `\+bd*`) in syntax highlighting and checking

### 0.4.0

Added an automated test suite covering marker validation, the document outline, and reference navigation. Extracted the core logic into standalone modules and migrated linting from tslint to eslint.

### 0.4.1

Dependency updates

## Known issues

Currently there is no support for USFM milestones and those milestone markers will be marked incorrectly by the syntax checker