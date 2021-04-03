# Graphviz Preview

[![.github/workflows/CI.yml](https://img.shields.io/github/workflow/status/EFanZh/Graphviz-Preview/CI/master)](https://github.com/EFanZh/Graphviz-Preview/actions?query=workflow%3A.github%2Fworkflows%2FCI.yml)
[![Bors enabled](https://img.shields.io/badge/bors-enabled-brightgreen)](https://app.bors.tech/repositories/23758)

An extension for Visual Studio Code to preview Graphviz (DOT) files.

![Graphviz Preview screenshot](resources/screenshot.png)

## Installation

You can install this extension from the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=EFanZh.graphviz-preview).

## Usage

### Open preview

Open the [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette) (usually by
pressing `Ctrl` + `Shift` + `P`), then select “Graphviz: Open Preview to the Side”.

### Manipulate preview

| Action           | Gesture                                                               |
| ---------------- | --------------------------------------------------------------------- |
| Zoom in          | Mouse wheel up / `+`                                                  |
| Zoom out         | Mouse wheel down / `-`                                                |
| Toggle 100% zoom | Mouse double click / `Space`                                          |
| Pan              | Mouse drag / `Left` / `Right` / `Up` / `Down` / `A` / `D` / `W` / `S` |
| Zoom to 100%     | `0`                                                                   |
| Move to center   | `X`                                                                   |

There are three zooming modes: **Fixed**, **Fit** and **Auto Fit**.

- **Fixed**: The zoom ratio does not change when the source changes or the window size changes.
- **Fit**: The graph is scaled to align to the border of the visible view area.
- **Auto Fit**: When the view area is big enough to contain a 100% sized graph, the graph will be set a zoom ratio of
  100%, otherwise the graph is scaled to fit into the view area.

### Export graph

To export the generated graph, click the “Export” button on the top right corner.

## Configuration

| Configuration                  | Type       | Description                                                              |
| ------------------------------ | ---------- | ------------------------------------------------------------------------ |
| `graphvizPreview.dotPath`      | `string`   | Path to the “dot” executable.                                            |
| `graphvizPreview.dotExtraArgs` | `string[]` | Extra arguments passed to the “dot” executable.                          |
| `graphvizPreview.engine`       | `"dot"`    | The layout engine to use. Currently, only the “dot” engine is supported. |

Make sure the extension can find the “dot” program. You can set `graphvizPreview.dotPath` option to the path of the dot
executable, or make sure the directory containing the dot program is in your `PATH` environment variable.

To set the `graphvizPreview.dotPath` option, go to File → Preference → Settings.

## Roadmap

- [x] Add border and shadow to indicate the graph border.
- [x] Allow user to save the generated graph.
- [x] Report error if the source is invalid.
- [x] Apply configuration change without restart.
- [x] Allow user to manipulate preview with keyboard.
- [x] Add CI integration.
- [ ] Add animation for zooming.
- [x] Take a new screenshot.
- [ ] Allow user to configure the default zoom mode.
- [x] Add a preview button for source editor.
- [x] Add cancellation support in scheduler.
- [ ] Support previewing source containing multiple graphs.
- [ ] Design a better icon.
- [x] Apply [Content Security Policy](https://en.wikipedia.org/wiki/Content_Security_Policy) to webview.
- [x] Support specifying a command-line array for the “dotPath” configuration so that we can use a wrapper for the “dot”
      program.
- [ ] Fix [`no-explicit-any`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-explicit-any.md) errors.
- [ ] Fix [`no-use-before-define`](https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-use-before-define.md) errors.
- [ ] Add focus indicator to preview controls.

## Known issues

- After saving an untitled file, the preview becomes invalid.
- When the zoom ratio is too large, the graph may be at a wrong position.

## FAQ

- Q: How do I change the layout engine?
  - A: Graphviz Preview doesn’t support changing the default layout engine for now, but you can add `layout = <engine>`
    to your source code which has the same effect.
