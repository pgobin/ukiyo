"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require("vscode");
const restoreTerminals_1 = require("./restoreTerminals");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
//do NOT make async and await the async functions in this func, or the command just doesn't work
function activate(context) {
    console.log('restore-terminals is now active!');
    const shouldRunOnStartup = vscode.workspace.getConfiguration("restoreTerminals").get("runOnStartup");
    let disposable = vscode.commands.registerCommand('restore-terminals.restoreTerminals', () => __awaiter(this, void 0, void 0, function* () {
        restoreTerminals_1.default();
    }));
    context.subscriptions.push(disposable);
    if (shouldRunOnStartup) {
        restoreTerminals_1.default(); //run on startup
    }
}
exports.activate = activate;
// this method is called when your extension is deactivated
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map