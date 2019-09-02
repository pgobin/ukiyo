'use strict';
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
const snippet_1 = require("./snippet");
class SnippetProvider {
    /**
     *
     * @param {vscode.Uri} uri - a fake uri
     * @returns {string} - Code Snippet
     **/
    provideTextDocumentContent(uri) {
        return __awaiter(this, void 0, void 0, function* () {
            let request = decodeRequest(uri);
            let snippet = new snippet_1.Snippet();
            let response = yield snippet.load(request.language, request.query, 0);
            return response.data;
        });
    }
}
exports.default = SnippetProvider;
function encodeRequest(query, language) {
    const data = JSON.stringify({ query: query, language: language });
    return vscode.Uri.parse(`snippet:[${language}] ${query}?${data}`);
}
exports.encodeRequest = encodeRequest;
function decodeRequest(uri) {
    let obj = JSON.parse(uri.query);
    return obj;
}
exports.decodeRequest = decodeRequest;
//# sourceMappingURL=provider.js.map