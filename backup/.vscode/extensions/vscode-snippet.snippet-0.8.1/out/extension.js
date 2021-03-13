'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const cache_1 = require("./cache");
const provider_1 = require("./provider");
const endpoints = require("./endpoints");
function activate(ctx) {
    vscode.commands.registerCommand('snippet.find', endpoints.findDefault);
    vscode.commands.registerCommand('snippet.findForLanguage', endpoints.findForLanguage);
    vscode.commands.registerCommand('snippet.findInplace', endpoints.findInplace);
    vscode.commands.registerCommand('snippet.findInNewEditor', endpoints.findInNewEditor);
    vscode.commands.registerCommand('snippet.findSelectedText', endpoints.findSelectedText);
    vscode.commands.registerCommand('snippet.showPreviousAnswer', endpoints.showPreviousAnswer);
    vscode.commands.registerCommand('snippet.showNextAnswer', endpoints.showNextAnswer);
    vscode.commands.registerCommand('snippet.toggleComments', endpoints.toggleComments);
    cache_1.cache.state = ctx.globalState;
    let provider = new provider_1.default();
    let disposableProvider = vscode.workspace.registerTextDocumentContentProvider("snippet", provider);
    ctx.subscriptions.push(disposableProvider);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map