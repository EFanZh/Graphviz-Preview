# Changelog

## [Unreleased]

## [1.3.0] - 2018-09-16

### Added

- Support exporting image of formats other than SVG. Currently, PDF and PNG support are added. (#14).

### Fixed

- Support showing external image. (#13)
- Fix showing unicode characters. (#15)

## [1.2.0] - 2018-06-12

### Added

- Add a button to open preview to the source editor if current editor’s language is
  [DOT](https://en.wikipedia.org/wiki/DOT_(graph_description_language)).

### Fixed

- Remove extra paddings within the `<img>` element.

### Changed

- The focus is preserved when preview is opened.

## [1.1.0] - 2018-05-12

### Added

- Add cancellation support for the layout engine interface.

### Changed

- Refactored the scheduler. Currently at most 4 layout engine instances are allowed to run concurrently. Now you should
  notice editing source file updates the preview more smoothly.

## [1.0.0] - 2018-05-04

### Added

- Add a button to export generated graph.
- User can now use mouse and keyboard to zoom and pan preview.
- Add shadow effect to preview.
- Add some unit tests.
- Reports error if the source is invalid.
- The configuration change takes effect immediately.

### Changed

- Redesigned UI.
- The “graphviz-preview” section is now called “graphvizPreview”. This is a breaking change, please update your
  configuration accordingly.

### Fixed

- Preserve zooming mode when source changes.
- Make sure the preview consistent with source by using a scheduler.

## [0.0.4] - 2018-03-04

### Changed

- Fix font color not distinct from background.

## [0.0.3] - 2017-07-19

### Changed

- Fix 100% zooming mode can’t scroll to view all generated image.

## [0.0.2] - 2017-07-16

### Added

- Add an icon.

## 0.0.1 - 2017-07-16

### Added

- Initial release.

[Unreleased]: https://github.com/EFanZh/Graphviz-Preview/compare/v1.3.0...master
[1.3.0]: https://github.com/EFanZh/Graphviz-Preview/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/EFanZh/Graphviz-Preview/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/EFanZh/Graphviz-Preview/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/EFanZh/Graphviz-Preview/compare/v0.0.4...v1.0.0
[0.0.4]: https://github.com/EFanZh/Graphviz-Preview/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/EFanZh/Graphviz-Preview/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/EFanZh/Graphviz-Preview/compare/v0.0.1...v0.0.2
