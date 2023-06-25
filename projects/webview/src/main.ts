import { Controller } from "./controller";
import { Ui } from "./ui";

const idPrefix = "--graphviz-preview-";
const vscode = acquireVsCodeApi();

function $(id: string): HTMLElement {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return document.getElementById(idPrefix + id)!;
}

function getScaleModeRadioButton(value: string): HTMLInputElement {
    return document.querySelector(`input[name="${idPrefix}scale-mode"][value="${value}"]`) as HTMLInputElement;
}

const previousPageButton = $("previous-page") as HTMLButtonElement;
const nextPageButton = $("next-page") as HTMLButtonElement;
const pageStatusElement = $("page-status");
const scaleStatusElement = $("scale-status");
const isCenterCheckBox = $("is-center") as HTMLInputElement;
const isIdentityCheckBox = $("is-identity") as HTMLInputElement;
const scaleModeFixedRadioButton = getScaleModeRadioButton("fixed");
const scaleModeFitRadioButton = getScaleModeRadioButton("fit");
const scaleModeAutoFitRadioButton = getScaleModeRadioButton("auto-fit");
const exportButton = $("export") as HTMLButtonElement;
const workspaceElement = $("workspace");
const imageElement = $("image");
const previewStatusElement = $("preview-status");

const ui = new Ui(
    window,
    previousPageButton,
    nextPageButton,
    pageStatusElement,
    scaleStatusElement,
    isCenterCheckBox,
    isIdentityCheckBox,
    scaleModeFixedRadioButton,
    scaleModeFitRadioButton,
    scaleModeAutoFitRadioButton,
    exportButton,
    workspaceElement,
    imageElement,
    previewStatusElement,
);

ui.initialize();

const controller = new Controller(ui, vscode.postMessage);

ui.setupEventHandlers(controller);
