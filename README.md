# Graphviz Preview

An extension for Visual Studio Code to preview Graphviz (DOT) files.

![Graphviz Preview screenshot](screenshot.png)

## Configuration

Make sure the extension can find the “dot” program. You can set `graphviz-preview.dotPath` option to the path of the dot executable, or make sure the directory containing the dot program is in your `PATH` environment variable.

To set the `graphviz-preview.dotPath` option, go to File → Preference → Settings.

## Roadmap

- [x] Add border and shadow to indicate graph border.
- [x] Allow user to save the generated graph.
- [x] Report error if the document is invalid.

## Known issues

- After saving an untitled file, the preview becomes invalid.
- Selecting is not disabled when user is dragging image.
- Occasionally, the image becomes undraggable.
