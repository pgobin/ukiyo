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
const config_1 = require("./config");
const query_1 = require("./query");
const document_1 = require("./document");
const snippet_1 = require("./snippet");
const provider_1 = require("./provider");
let loadingStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
loadingStatus.text = `$(clock) Loading Snippet ...`;
let snippet = new snippet_1.Snippet();
function findWithProvider(language, userQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        let uri = provider_1.encodeRequest(userQuery, language);
        // Calls back into the provider
        let doc = yield vscode.workspace.openTextDocument(uri);
        vscode.languages.setTextDocumentLanguage(doc, language);
        let column = vscode.ViewColumn.Two;
        if (!vscode.ViewColumn) {
            column = vscode.ViewColumn.One;
        }
        yield vscode.window.showTextDocument(doc, { viewColumn: column, preview: true });
        loadingStatus.hide();
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
        loadingStatus.show();
        let language = yield vscode.window.showInputBox({
            value: 'python',
            placeHolder: 'Find snippet for which programming language?',
        });
        let userQuery = yield query_1.query(language);
        let response = yield snippet.load(language, userQuery, 0);
        loadingStatus.hide();
        document_1.showSnippet(response.data, response.language, true);
    });
}
exports.findForLanguage = findForLanguage;
function findDefault() {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        let request = yield getInput();
        let response = yield snippet.load(request.language, request.query, 0);
        document_1.showSnippet(response.data, response.language, config_1.getConfig("openInNewEditor"));
        loadingStatus.hide();
    });
}
exports.findDefault = findDefault;
function findInplace() {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        let request = yield getInput();
        let response = yield snippet.load(request.language, request.query, 0);
        document_1.showSnippet(response.data, response.language, false);
        loadingStatus.hide();
    });
}
exports.findInplace = findInplace;
function findInNewEditor() {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        let request = yield getInput();
        let response = yield snippet.load(request.language, request.query, 0);
        document_1.showSnippet(response.data, response.language, true);
        loadingStatus.hide();
    });
}
exports.findInNewEditor = findInNewEditor;
function showNextAnswer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!snippet.getCurrentQuery()) {
            return yield findDefault();
        }
        loadingStatus.show();
        let response = yield snippet.loadNext();
        document_1.showSnippet(response.data, yield config_1.getLanguage(), false);
        loadingStatus.hide();
    });
}
exports.showNextAnswer = showNextAnswer;
function showPreviousAnswer() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!snippet.getCurrentQuery()) {
            return yield findDefault();
        }
        loadingStatus.show();
        snippet.loadPrevious().then((res) => {
            document_1.showSnippet(res.data, res.language, false);
        }).catch((err) => {
            vscode.window.showInformationMessage(err);
        });
        loadingStatus.hide();
    });
}
exports.showPreviousAnswer = showPreviousAnswer;
function toggleComments() {
    return __awaiter(this, void 0, void 0, function* () {
        loadingStatus.show();
        snippet.toggleVerbose();
        let response = yield snippet.load();
        document_1.showSnippet(response.data, yield config_1.getLanguage(), false);
        loadingStatus.hide();
    });
}
exports.toggleComments = toggleComments;
function findSelectedText() {
    return __awaiter(this, void 0, void 0, function* () {
        let editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('There is no open editor window');
            return;
        }
        let selection = editor.selection;
        let query = editor.document.getText(selection);
        let language = yield config_1.getLanguage();
        loadingStatus.show();
        let response = yield snippet.load(language, query, 0);
        document_1.showSnippet(response.data, language, config_1.getConfig("openInNewEditor"));
        loadingStatus.hide();
    });
}
exports.findSelectedText = findSelectedText;
//# sourceMappingURL=endpoints.js.map