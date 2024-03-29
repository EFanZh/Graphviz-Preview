# Graphviz Preview

[![CI](https://github.com/EFanZh/Graphviz-Preview/actions/workflows/CI.yml/badge.svg)](https://github.com/EFanZh/Graphviz-Preview/actions/workflows/CI.yml)
[![Codecov](https://codecov.io/gh/EFanZh/Graphviz-Preview/branch/master/graph/badge.svg)](https://app.codecov.io/gh/EFanZh/Graphviz-Preview)

An extension for Visual Studio Code to preview Graphviz (DOT) files.

![Graphviz Preview screenshot](resources/screenshot.png)

## Installation

You can install this extension from the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=EFanZh.graphviz-preview).

This extension requires [Graphviz](https://graphviz.org/) to be installed. Also, make sure that the extension can find
the `dot` executable provided by Graphviz. Either make sure the directory containing the `dot` executable exists in the
`PATH` or `Path` environment variable, or specify the path of the `dot` executable with `graphvizPreview.dotPath`
configuration.

## Usage

### Open preview

Open the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) (usually by
pressing `Ctrl` + `Shift` + `P`), then select “Graphviz: Open Preview to the Side”.

### Manipulate preview

| Action                 | Gesture                                                               |
| ---------------------- | --------------------------------------------------------------------- |
| Previous graph         | `P`                                                                   |
| Next graph             | `N`                                                                   |
| Zoom in                | Mouse wheel up / `+`                                                  |
| Zoom out               | Mouse wheel down / `-`                                                |
| Toggle center position | `X`                                                                   |
| Toggle 100% scale      | Mouse double click / `Space` / `0`                                    |
| Scroll                 | Mouse drag / `Left` / `Right` / `Up` / `Down` / `A` / `D` / `W` / `S` |

There are three scale modes: **Fixed**, **Fit** and **Auto Fit**.

- **Fixed**: The scale ratio does not change when the source changes or the window size changes.
- **Fit**: The graph is scaled to align to the border of the visible view area.
- **Auto Fit**: When the view area is big enough to contain a 100% sized graph, the graph will be set a scale ratio of
  100%, otherwise the graph is scaled to fit into the view area.

### Export graph

To export the generated graph, click the “Export” button on the top right corner.

## Configuration

| Configuration                  | Type       | Description                                                              |
| ------------------------------ | ---------- | ------------------------------------------------------------------------ |
| `graphvizPreview.dotPath`      | `string`   | Path to the `dot` executable.                                            |
| `graphvizPreview.dotExtraArgs` | `string[]` | Extra arguments passed to the `dot` executable.                          |
| `graphvizPreview.engine`       | `string`   | The layout engine to use. Currently, only the `dot` engine is supported. |

Make sure the extension can find the `dot` program. You can set `graphvizPreview.dotPath` option to the path of the dot
executable, or make sure the directory containing the dot program is in your `PATH` environment variable.

To set the `graphvizPreview.dotPath` option, go to File → Preference → Settings.

## Known issues

- After saving an untitled file, the preview becomes invalid.
- When the scale ratio is too large, the graph may be at a wrong position.
- Exporting only works for documents that contains a single graph.

## FAQ

- Q: How do I change the layout engine?
  - A: Set `graphvizPreview.dotExtraArgs` configuration to `["-Glayout=<ENGINE>"]`, where `<ENGINE>` is the desired
    layout engine.
