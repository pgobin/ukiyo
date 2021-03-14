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
const utilts_1 = require("./utilts");
const DEFAULT_ARTIFICAL_DELAY = 150;
function restoreTerminals() {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        console.log("restoring terminals");
        // Display a message box to the user
        // vscode.window.showInformationMessage('Restoring terminals'); //TODO:  remove later
        const keepExistingTerminalsOpen = vscode.workspace.getConfiguration("restoreTerminals").get("keepExistingTerminalsOpen");
        const artificialDelayMilliseconds = vscode.workspace.getConfiguration("restoreTerminals").get("artificialDelayMilliseconds");
        const terminalWindows = vscode.workspace.getConfiguration("restoreTerminals").get("terminals");
        if (!terminalWindows) {
            // vscode.window.showInformationMessage("No terminal window configuration provided to restore terminals with.") //this might be annoying
            return;
        }
        if (vscode.window.activeTerminal && !keepExistingTerminalsOpen) {
            vscode.window.terminals.forEach(terminal => {
                //i think calling terminal.dispose before creating the new termials causes error because the terminal has disappeard and it fux up. we can do it after, and check that the terminal we are deleting is not in the list of terminals we just created 
                console.log(`disposing terminal ${terminal.name}`);
                terminal.dispose(); //TODO: - make this an option, have it on by default
            });
        }
        yield utilts_1.delay(artificialDelayMilliseconds !== null && artificialDelayMilliseconds !== void 0 ? artificialDelayMilliseconds : DEFAULT_ARTIFICAL_DELAY); //without delay it starts bugging out
        let commandsToRunInTerms = [];
        //create the terminals sequentially so theres no glitches, but run the commands in parallel
        for (const terminalWindow of terminalWindows) {
            if (!terminalWindow.splitTerminals) {
                // vscode.window.showInformationMessage("No split terminal configuration provided to restore terminals with.") //this might be annoying
                return;
            }
            const term = vscode.window.createTerminal({
                name: (_a = terminalWindow.splitTerminals[0]) === null || _a === void 0 ? void 0 : _a.name
                //  cwd: vscode.window.activeTextEditor?.document.uri.fsPath, //i think this happens by default
            });
            term.show();
            yield utilts_1.delay(artificialDelayMilliseconds !== null && artificialDelayMilliseconds !== void 0 ? artificialDelayMilliseconds : DEFAULT_ARTIFICAL_DELAY);
            //the first terminal split is already created from when we called createTerminal
            if (terminalWindow.splitTerminals.length > 0) {
                const commands = terminalWindow.splitTerminals[0].commands;
                commandsToRunInTerms.push({
                    commands,
                    terminal: term
                });
            }
            for (let i = 1; i < terminalWindow.splitTerminals.length; i++) {
                const splitTerminal = terminalWindow.splitTerminals[i];
                const createdSplitTerm = yield createNewSplitTerminal(splitTerminal.name);
                const commands = splitTerminal.commands;
                commandsToRunInTerms.push({
                    commands,
                    terminal: createdSplitTerm
                });
            }
        }
        //we run the actual commands in parallel
        commandsToRunInTerms.forEach((el) => __awaiter(this, void 0, void 0, function* () {
            yield runCommands(el.commands, el.terminal);
        }));
    });
}
exports.default = restoreTerminals;
function runCommands(commands, terminal) {
    return __awaiter(this, void 0, void 0, function* () {
        for (let j = 0; j < commands.length; j++) {
            const command = commands[j];
            terminal.sendText(command);
        }
    });
}
function createNewSplitTerminal(name) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            yield vscode.commands.executeCommand("workbench.action.terminal.split");
            if (name) {
                yield vscode.commands.executeCommand("workbench.action.terminal.renameWithArg", {
                    name
                });
            }
            vscode.window.onDidChangeActiveTerminal((terminal) => {
                if (terminal) {
                    resolve(terminal);
                }
            });
        }));
    });
}
//# sourceMappingURL=restoreTerminals.js.map