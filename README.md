# Graphviz Preview

An extension for Visual Studio Code to preview Graphviz (DOT) files.

![Graphviz Preview screenshot](screenshot.png)

## Configuration

Make sure the extension can find the “dot” program. You can set `graphviz-preview.dotPath` to the path of the dot executable, or make sure the directory containing the dot program is in your `PATH` environment variable.

## Roadmap

- Add border and shadow to indicate graph border.
- Allow user to save the generated graph.
- Report error if the document is invalid.

## Known issues

- The zoom option resets when the preview updates.
- After saving an untitled file, the preview becomes invalid.
