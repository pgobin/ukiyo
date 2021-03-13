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
const config_1 = require("./config");
const query_1 = require("./query");
const provider_1 = require("./provider");
const snippet_1 = require("./snippet");
let loadingStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
loadingStatus.text = `$(clock) Loading Snippet ...`;
function findWithProvider(language, userQuery, verbose, number, openInNewEditor = true) {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        let uri = provider_1.encodeRequest(userQuery, language, verbose, number);
        // Calls back into the provider
        let doc = yield vscode.workspace.openTextDocument(uri);
        loadingStatus.hide();
        try {
            doc = yield vscode.languages.setTextDocumentLanguage(doc, language);
        }
        catch (e) {
            console.log(`Cannot set document language to ${language}: ${e}`);
        }
        let editor = vscode.window.activeTextEditor;
        // Open in new editor in case the respective config flag is set to true
        // or there is no open user-created editor where we could paste the snippet in.
        if (openInNewEditor || !editor || editor.document.uri.scheme == "snippet") {
            yield vscode.window.showTextDocument(doc, {
                viewColumn: vscode.ViewColumn.Two,
                preview: true,
                preserveFocus: true
            });
        }
        else {
            let snippet = new vscode.SnippetString(doc.getText());
            let success = yield editor.insertSnippet(snippet);
            if (!success) {
                vscode.window.showInformationMessage("Error while opening snippet.");
            }
        }
    });
}
exports.findWithProvider = findWithProvider;
function getInput() {
    return __awaiter(this, void 0, void 0, function* () {
        let language = yield config_1.getLanguage();
        let userQuery = yield query_1.query(language);
        return { language, query: userQuery };
    });
}
exports.getInput = getInput;
function findForLanguage() {
    return __awaiter(this, void 0, void 0, function* () {
        let language = yield config_1.pickLanguage();
        let userQuery = yield query_1.query(language);
        yield findWithProvider(language, userQuery, snippet_1.default.getVerbose(), 0, config_1.getConfig("openInNewEditor"));
    });
}
exports.findForLanguage = findForLanguage;
function findDefault() {
    return __awaiter(this, void 0, void 0, function* () {
        let request = yield getInput();
        yield findWithProvider(request.language, request.query, snippet_1.default.getVerbose(), 0, config_1.getConfig("openInNewEditor"));
    });
}
exports.findDefault = findDefault;
function findInplace() {
    return __awaiter(this, void 0, void 0, function* () {
        let request = yield getInput();
        yield findWithProvider(request.language, request.query, snippet_1.default.getVerbose(), 0, false);
    });
}
exports.findInplace = findInplace;
function findInNewEditor() {
    return __awaiter(this, void 0, void 0, function* () {
        let request = yield getInput();
        yield findWithProvider(request.language, request.query, snippet_1.default.getVerbose(), 0, true);
    });
}
exports.findInNewEditor = findInNewEditor;
function showNextAnswer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!snippet_1.default.getCurrentQuery()) {
            return yield findDefault();
        }
        const answerNumber = snippet_1.default.getNextAnswerNumber();
        yield findWithProvider(yield config_1.getLanguage(), snippet_1.default.getCurrentQuery(), snippet_1.default.getVerbose(), answerNumber, config_1.getConfig("openInNewEditor"));
    });
}
exports.showNextAnswer = showNextAnswer;
function showPreviousAnswer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!snippet_1.default.getCurrentQuery()) {
            return yield findDefault();
        }
        const answerNumber = snippet_1.default.getPreviousAnswerNumber();
        if (answerNumber == null) {
            vscode.window.showInformationMessage("already at first snippet");
            return;
        }
        findWithProvider(yield config_1.getLanguage(), snippet_1.default.getCurrentQuery(), snippet_1.default.getVerbose(), answerNumber, config_1.getConfig("openInNewEditor"));
    });
}
exports.showPreviousAnswer = showPreviousAnswer;
function toggleComments() {
    return __awaiter(this, void 0, void 0, function* () {
        snippet_1.default.toggleVerbose();
        findWithProvider(yield config_1.getLanguage(), snippet_1.default.getCurrentQuery(), snippet_1.default.getVerbose(), snippet_1.default.getCurrentAnswerNumber(), config_1.getConfig("openInNewEditor"));
    });
}
exports.toggleComments = toggleComments;
function findSelectedText() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("There is no open editor window");
            return;
        }
        let selection = editor.selection;
        let query = editor.document.getText(selection);
        let language = yield config_1.getLanguage();
        findWithProvider(language, query, snippet_1.default.getVerbose(), 0, config_1.getConfig("openInNewEditor"));
    });
}
exports.findSelectedText = findSelectedText;
//# sourceMappingURL=endpoints.js.map