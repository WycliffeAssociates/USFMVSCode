# Change Log
Change log for USFMVSCode

## [0.4.2]
- Fixed the document outline and go-to-reference missing `\c` and `\v` markers
  that share a line with another marker (e.g. `\c 1 \v 1 ...` or a whole
  chapter on one line). Both features now scan every marker on a line, and
  go-to-reference puts the cursor on the marker itself rather than column 0.

## [0.4.1]
- Dependency updates: bumped fast-uri, brace-expansion, and js-yaml.

## [0.4.0]
- Added an automated test suite: unit tests for marker validation, the document
  outline, and reference navigation, plus VS Code integration smoke tests.
  Extracted the core logic into standalone modules to make it testable.
- Migrated linting from tslint to eslint.

## [0.0.1]
- Initial release

## [0.1.0]
- Added syntax checking

## [0.1.1]
- Added more markers to syntax checking

## [0.1.2]
- Added more markers to syntax checking