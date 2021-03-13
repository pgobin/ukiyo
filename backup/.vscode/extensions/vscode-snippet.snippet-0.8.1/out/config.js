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
const vscode = require("vscode");
function getConfig(param) {
    return vscode.workspace.getConfiguration("snippet")[param];
}
exports.getConfig = getConfig;
class LanguageItem {
    constructor(label) {
        this.label = label;
    }
}
function pickLanguage() {
    return __awaiter(this, void 0, void 0, function* () {
        let languages = yield vscode.languages.getLanguages();
        const disposables = [];
        // return await vscode.window.showQuickPick(languages);
        try {
            return yield new Promise((resolve, reject) => {
                const input = vscode.window.createQuickPick();
                input.placeholder = "Select or enter programming language";
                let default_items = [];
                languages.forEach(language => {
                    default_items.push(new LanguageItem(language));
                });
                input.items = default_items;
                disposables.push(input.onDidChangeValue(v => {
                    input.items = [new LanguageItem(v)].concat(default_items);
                }), input.onDidAccept(() => {
                    resolve(input.value);
                }), input.onDidChangeSelection((items) => {
                    const item = items[0];
                    resolve(item.label);
                    input.hide();
                }), input.onDidHide(() => {
                    resolve(undefined);
                    input.dispose();
                }));
                input.show();
            });
        }
        finally {
            disposables.forEach(d => d.dispose());
        }
    });
}
exports.pickLanguage = pickLanguage;
function getDefaultLanguage() {
    return __awaiter(this, void 0, void 0, function* () {
        let defaultLanguage = getConfig("defaultLanguage");
        if (defaultLanguage && defaultLanguage.trim()) {
            return defaultLanguage;
        }
        return yield pickLanguage();
    });
}
function getLanguage() {
    return __awaiter(this, void 0, void 0, function* () {
        if (vscode.window.visibleTextEditors.length === 0) {
            return getDefaultLanguage();
        }
        let editor = vscode.window.activeTextEditor;
        return editor.document.languageId;
    });
}
exports.getLanguage = getLanguage;
//# sourceMappingURL=config.js.map