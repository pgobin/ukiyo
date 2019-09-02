"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function newDocument(language, content) {
    return __awaiter(this, void 0, void 0, function* () {
        let document = yield vscode.workspace.openTextDocument({ language, content });
        let column = vscode.ViewColumn.Two;
        if (!vscode.ViewColumn) {
            column = vscode.ViewColumn.One;
        }
        vscode.window.showTextDocument(document, column);
    });
}
function showSnippet(content, language, openInNewEditor = true) {
    return __awaiter(this, void 0, void 0, function* () {
        if (openInNewEditor) {
            newDocument(language, content);
            return;
        }
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            newDocument(language, content);
        }
        if (openInNewEditor) {
            editor.edit(edit => editor.selections.forEach(selection => {
                edit.insert(selection.end, "\n" + content);
            }));
        }
        else {
            // Replace the old contents of the current editor window.
            // This should be improved since we use a range over all lines of the document
            // rather than replacing the entire document of the editor.
            let lineCount = editor.document.lineCount;
            editor.edit(edit => edit.replace(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lineCount, 10000)), content));
        }
    });
}
exports.showSnippet = showSnippet;
//# sourceMappingURL=document.js.map