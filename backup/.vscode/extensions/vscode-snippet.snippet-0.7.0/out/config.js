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
function getConfig(param) {
    return vscode.workspace.getConfiguration('snippet')[param];
}
exports.getConfig = getConfig;
function getLanguage() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            return editor.document.languageId;
        }
        let defaultLanguage = getConfig('defaultLanguage');
        if (defaultLanguage && defaultLanguage.trim()) {
            return defaultLanguage;
        }
        return yield vscode.window.showInputBox({
            value: 'python',
            placeHolder: 'Find snippet for which programming language?',
        });
    });
}
exports.getLanguage = getLanguage;
//# sourceMappingURL=config.js.map