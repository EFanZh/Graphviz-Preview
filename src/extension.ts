"use strict";

import * as child_process from "child_process";
import * as path from "path";
import * as vscode from "vscode";

const extensionId = "graphviz-preview";
const previewCommand = "graphviz.showPreview";
const previewScheme = "graphviz-preview";

// Utility functions.

function getDotProgram(): string
{
    const configuration = vscode.workspace.getConfiguration(extensionId);
    const dotPath = configuration.get<string>("dotPath");

    if (dotPath === null)
    {
        return "dot";
    }
    else
    {
        return dotPath;
    }
}

function getGraphvizPreviewUri(sourceUri: vscode.Uri)
{
    return (new vscode.Uri()).with({
        authority: "preview",
        query: sourceUri.toString(true),
        scheme: previewScheme
    });
}

function getPreviewColumn(editor: vscode.TextEditor)
{
    switch (editor.viewColumn)
    {
        case vscode.ViewColumn.One:
            return vscode.ViewColumn.Two;

        default:
            return vscode.ViewColumn.Three;
    }
}

function getSourceUri(previewUri: vscode.Uri): vscode.Uri
{
    return vscode.Uri.parse(previewUri.query);
}

function wrapSvgText(svgText: string): string
{
    return `<!DOCTYPE html>
<html>
    <head>
        <style>
            html, body
            {
                height: 100%;
            }

            body
            {
                background-color: darkgray;
                display: flex;
                flex-flow: column;
                margin: 0;
                padding: 0;
            }

            #header
            {
                background-color: lightgray;
                box-shadow: 2px 2px 4px rgba(0, 0, 0, 0.62);
                padding: 6px;
                z-index: 1;
            }

            #main
            {
                display: flex;
                flex: 1;
                overflow: auto;
            }

            .zoom-identity {
                flex: none;
                margin: auto;
            }

            .zoom-fit {
                height: 100%;
                width: 100%;
            }

            .zoom-fit-100-percent {
                margin: auto;
                max-height: 100%;
                max-width: 100%;
            }
        </style>
        <script>
            document.addEventListener('DOMContentLoaded', () =>
            {
                'use strict';

                const main = document.getElementById('main');
                const image = document.querySelector('#main > *');
                const defaultZoomButtom = document.querySelector('input[name="zoom"][value="zoom-fit-100-percent"]');

                function updateZoom()
                {
                    while (image.classList.length > 0)
                    {
                        image.classList.remove(image.classList[0]);
                    }

                    image.classList.add(this.value);
                }

                for (const button of document.querySelectorAll('input[name="zoom"]'))
                {
                    button.onchange = updateZoom;
                }

                defaultZoomButtom.checked = true;
                defaultZoomButtom.onchange();
            });
        </script>
    </head>
    <body>
        <header id="header">
            <div>
                <span>Zoom: </span>
                <label><input name="zoom" type="radio" value="zoom-identity" /> 100 %</label>
                <label><input name="zoom" type="radio" value="zoom-fit" /> Fit</label>
                <label><input name="zoom" type="radio" value="zoom-fit-100-percent" /> Fit (at most 100 %)</label>
            </div>
        </header>
        <main id="main">${svgText}</main>
    </body>
</html>
`;
}

// The preview content provider class.

class GraphvizPreviewContentProvider implements vscode.TextDocumentContentProvider
{
    private onDidChangeEventEmitter = new vscode.EventEmitter<vscode.Uri>();

    public get onDidChange(): vscode.Event<vscode.Uri>
    {
        return this.onDidChangeEventEmitter.event;
    }

    public async provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Promise<string>
    {
        const sourceUri = getSourceUri(uri);
        const sourceDocument = await vscode.workspace.openTextDocument(sourceUri);
        const sourceText = sourceDocument.getText();
        const dotProgram = getDotProgram();

        return new Promise<string>((resolve, reject) =>
        {
            const dotProcess = child_process.execFile(dotProgram,
                ["-T", "svg"],
                (error, stdout, stderr) =>
                {
                    if (error)
                    {
                        const codeProperty = "code";

                        if (error[codeProperty] === "ENOENT")
                        {
                            reject(`File not found: ${dotProgram}`);
                        }
                        else
                        {
                            reject(stderr);
                        }
                    }
                    else
                    {
                        resolve(wrapSvgText(stdout));
                    }
                });

            token.onCancellationRequested((_) =>
            {
                try
                {
                    dotProcess.kill();
                }
                catch (_)
                {
                    return;
                }
            });

            try
            {
                dotProcess.stdin.end(sourceText);
            }
            catch (_)
            {
                return;
            }
        });
    }

    public updatePreview(sourceUri: vscode.Uri)
    {
        this.onDidChangeEventEmitter.fire(getGraphvizPreviewUri(sourceUri));
    }
}

// Extension interfaces.

export function activate(context: vscode.ExtensionContext)
{
    const previewContentProvider = new GraphvizPreviewContentProvider();

    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(previewScheme,
        previewContentProvider));

    context.subscriptions.push(vscode.commands.registerCommand(previewCommand, () =>
    {
        const activeTextEditor = vscode.window.activeTextEditor;

        return vscode.commands.executeCommand("vscode.previewHtml",
            getGraphvizPreviewUri(activeTextEditor.document.uri),
            getPreviewColumn(activeTextEditor),
            `Preview '${path.basename(activeTextEditor.document.uri.fsPath)}'`,
            { allowScripts: true, allowSvgs: true });
    }));

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((e) =>
    {
        previewContentProvider.updatePreview(e.document.uri);
    }));
}
