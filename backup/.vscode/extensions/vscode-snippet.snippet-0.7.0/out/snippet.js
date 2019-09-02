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
const axios_1 = require("axios");
const config_1 = require("./config");
const HttpProxyAgent = require("http-proxy-agent");
class Snippet {
    constructor() {
        this.currNum = 0;
        this.verboseState = config_1.getConfig("verbose");
        this.requestCache = new Object();
    }
    toggleVerbose() {
        this.verboseState = !this.verboseState;
    }
    load(language, query, num) {
        return __awaiter(this, void 0, void 0, function* () {
            if (language) {
                this.currLanguage = language;
            }
            if (query) {
                this.currQuery = query;
            }
            if (num) {
                this.currNum = num;
            }
            let response = yield this._doRequest(this.currLanguage);
            return { language, data: response.data };
        });
    }
    loadNext() {
        return __awaiter(this, void 0, void 0, function* () {
            this.currNum++;
            return this.load();
        });
    }
    loadPrevious() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currNum == 0) {
                return Promise.reject("Already at first answer");
            }
            this.currNum--;
            return this.load(this.currLanguage);
        });
    }
    getCurrentQuery() {
        return this.currQuery;
    }
    _requestConfig() {
        let config = {
            // Fake user agent to get plain-text output.
            // See https://github.com/chubin/cheat.sh/blob/1e21d96d065b6cce7d198c1a3edba89081c78a0b/bin/srv.py#L47
            'headers': {
                'User-Agent': 'curl/7.43.0'
            },
        };
        // Apply proxy setting if provided
        let proxy = vscode.workspace.getConfiguration('http')['proxy'];
        if (proxy !== '') {
            let agent = new HttpProxyAgent(proxy);
            config['agent'] = agent;
        }
        return config;
    }
    getUrl(language, query) {
        let baseUrl = config_1.getConfig("baseUrl");
        let num = this.currNum;
        let params = this.verboseState ? "qT" : "QT";
        let path = `/vscode:${language}/${query}/${num}?${params}&style=bw`;
        return baseUrl + path;
    }
    _doRequest(language) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = encodeURI(this.currQuery.replace(/ /g, '+'));
            let url = this.getUrl(language, query);
            let data = yield this.requestCache[url];
            if (data) {
                return data;
            }
            let res = yield axios_1.default.get(url, this._requestConfig());
            this.requestCache[url] = res;
            return res;
        });
    }
}
exports.Snippet = Snippet;
//# sourceMappingURL=snippet.js.map