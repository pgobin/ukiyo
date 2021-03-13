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
            this.currLanguage = language;
            this.currQuery = query;
            this.currNum = num;
            let response = yield this._doRequest();
            return { language, data: response.data };
        });
    }
    getNextAnswerNumber() {
        this.currNum++;
        return this.currNum;
    }
    getPreviousAnswerNumber() {
        if (this.currNum == 0) {
            return null;
        }
        this.currNum--;
        return this.currNum;
    }
    getCurrentQuery() {
        return this.currQuery;
    }
    getCurrentAnswerNumber() {
        return this.currNum;
    }
    getVerbose() {
        return this.verboseState;
    }
    _requestConfig() {
        let config = {
            // Fake user agent to get plain-text output.
            // See https://github.com/chubin/cheat.sh/blob/1e21d96d065b6cce7d198c1a3edba89081c78a0b/bin/srv.py#L47
            headers: {
                "User-Agent": "curl/7.43.0"
            }
        };
        // Apply proxy setting if provided
        let proxy = vscode.workspace.getConfiguration("http")["proxy"];
        if (proxy !== "") {
            let agent = new HttpProxyAgent(proxy);
            config["agent"] = agent;
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
    _doRequest() {
        return __awaiter(this, void 0, void 0, function* () {
            let query = encodeURI(this.currQuery.replace(/ /g, "+"));
            let url = this.getUrl(this.currLanguage, query);
            let data = this.requestCache[url];
            if (data) {
                return data;
            }
            let res = yield axios_1.default.get(url, this._requestConfig());
            this.requestCache[url] = res;
            return res;
        });
    }
}
exports.default = new Snippet();
//# sourceMappingURL=snippet.js.map