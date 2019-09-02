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
const cp = require("child_process");
const iconv_lite_1 = require("iconv-lite");
const path = require("path");
const vscode_1 = require("vscode");
const askpassManager_1 = require("./askpass/askpassManager");
const config_1 = require("./config");
const utils_1 = require("./utils");
const EOL_REGEX = /\r\n|\r|\n/g;
const INVALID_BRANCH_REGEX = /^\(.* .*\)$/;
const GIT_LOG_SEPARATOR = 'XX7Nal-YARtTpjCikii9nJxER19D6diSyk-AWkPb';
class DataSource {
    constructor(gitExecutable, logger) {
        this.gitExecutable = gitExecutable;
        this.logger = logger;
        this.generateGitCommandFormats();
        this.askpassManager = new askpassManager_1.AskpassManager();
        this.askpassEnv = this.askpassManager.getEnv();
    }
    isGitExecutableUnknown() {
        return this.gitExecutable === null;
    }
    setGitExecutable(gitExecutable) {
        this.gitExecutable = gitExecutable;
    }
    generateGitCommandFormats() {
        const config = config_1.getConfig();
        let dateType = config.dateType() === 'Author Date' ? '%at' : '%ct';
        let useMailmap = config.useMailmap();
        this.gitLogFormat = ['%H', '%P', useMailmap ? '%aN' : '%an', useMailmap ? '%aE' : '%ae', dateType, '%s'].join(GIT_LOG_SEPARATOR);
        this.gitCommitDetailsFormat = ['%H', '%P', useMailmap ? '%aN' : '%an', useMailmap ? '%aE' : '%ae', dateType, useMailmap ? '%cN' : '%cn'].join(GIT_LOG_SEPARATOR) + '%n%B';
    }
    dispose() {
        this.askpassManager.dispose();
    }
    getBranches(repo, showRemoteBranches) {
        return new Promise((resolve) => {
            let args = ['branch'];
            if (showRemoteBranches)
                args.push('-a');
            args.push('--no-color');
            this.spawnGit(args, repo, (stdout) => {
                let branchData = { branches: [], head: null, error: null };
                let lines = stdout.split(EOL_REGEX);
                for (let i = 0; i < lines.length - 1; i++) {
                    let name = lines[i].substring(2).split(' -> ')[0];
                    if (INVALID_BRANCH_REGEX.test(name))
                        continue;
                    if (lines[i][0] === '*') {
                        branchData.head = name;
                        branchData.branches.unshift(name);
                    }
                    else {
                        branchData.branches.push(name);
                    }
                }
                return branchData;
            }).then((data) => {
                resolve(data);
            }).catch((errorMessage) => {
                resolve({ branches: [], head: null, error: errorMessage });
            });
        });
    }
    getCommits(repo, branches, maxCommits, showRemoteBranches) {
        const config = config_1.getConfig();
        return new Promise(resolve => {
            Promise.all([
                this.getLog(repo, branches, maxCommits + 1, showRemoteBranches, config.commitOrdering()),
                this.getRefs(repo, showRemoteBranches).then((refData) => refData, (errorMessage) => errorMessage),
                this.getRemotes(repo)
            ]).then((results) => __awaiter(this, void 0, void 0, function* () {
                let commits = results[0], refData = results[1], i, unsavedChanges = null;
                let moreCommitsAvailable = commits.length === maxCommits + 1;
                if (moreCommitsAvailable)
                    commits.pop();
                if (typeof refData === 'string') {
                    if (commits.length > 0) {
                        throw refData;
                    }
                    else {
                        refData = { head: null, heads: [], tags: [], remotes: [] };
                    }
                }
                if (refData.head !== null) {
                    for (i = 0; i < commits.length; i++) {
                        if (refData.head === commits[i].hash) {
                            unsavedChanges = config.showUncommittedChanges() ? yield this.getUnsavedChanges(repo) : null;
                            if (unsavedChanges !== null) {
                                commits.unshift({ hash: utils_1.UNCOMMITTED, parentHashes: [refData.head], author: '*', email: '', date: Math.round((new Date()).getTime() / 1000), message: 'Uncommitted Changes (' + unsavedChanges.changes + ')' });
                            }
                            break;
                        }
                    }
                }
                let commitNodes = [];
                let commitLookup = {};
                for (i = 0; i < commits.length; i++) {
                    commitLookup[commits[i].hash] = i;
                    commitNodes.push({ hash: commits[i].hash, parentHashes: commits[i].parentHashes, author: commits[i].author, email: commits[i].email, date: commits[i].date, message: commits[i].message, heads: [], tags: [], remotes: [] });
                }
                for (i = 0; i < refData.heads.length; i++) {
                    if (typeof commitLookup[refData.heads[i].hash] === 'number')
                        commitNodes[commitLookup[refData.heads[i].hash]].heads.push(refData.heads[i].name);
                }
                for (i = 0; i < refData.tags.length; i++) {
                    if (typeof commitLookup[refData.tags[i].hash] === 'number')
                        commitNodes[commitLookup[refData.tags[i].hash]].tags.push({ name: refData.tags[i].name, annotated: refData.tags[i].annotated });
                }
                for (i = 0; i < refData.remotes.length; i++) {
                    if (typeof commitLookup[refData.remotes[i].hash] === 'number') {
                        let name = refData.remotes[i].name;
                        let remote = results[2].find(remote => name.startsWith(remote + '/'));
                        commitNodes[commitLookup[refData.remotes[i].hash]].remotes.push({ name: name, remote: remote ? remote : null });
                    }
                }
                resolve({ commits: commitNodes, head: refData.head, remotes: results[2], moreCommitsAvailable: moreCommitsAvailable, error: null });
            })).catch((errorMessage) => {
                resolve({ commits: [], head: null, remotes: [], moreCommitsAvailable: false, error: errorMessage });
            });
        });
    }
    getCommitDetails(repo, commitHash) {
        return new Promise(resolve => {
            Promise.all([
                this.spawnGit(['show', '--quiet', commitHash, '--format=' + this.gitCommitDetailsFormat], repo, (stdout) => {
                    let lines = stdout.split(EOL_REGEX);
                    let lastLine = lines.length - 1;
                    while (lines.length > 0 && lines[lastLine] === '')
                        lastLine--;
                    let commitInfo = lines[0].split(GIT_LOG_SEPARATOR);
                    return {
                        hash: commitInfo[0],
                        parents: commitInfo[1].split(' '),
                        author: commitInfo[2],
                        email: commitInfo[3],
                        date: parseInt(commitInfo[4]),
                        committer: commitInfo[5],
                        body: lines.slice(1, lastLine + 1).join('\n'),
                        fileChanges: [], error: null
                    };
                }),
                this.getDiffTreeNameStatus(repo, commitHash, commitHash),
                this.getDiffTreeNumStat(repo, commitHash, commitHash)
            ]).then((results) => {
                results[0].fileChanges = generateFileChanges(results[1], results[2], null);
                resolve(results[0]);
            }).catch((errorMessage) => resolve({ hash: '', parents: [], author: '', email: '', date: 0, committer: '', body: '', fileChanges: [], error: errorMessage }));
        });
    }
    getUncommittedDetails(repo) {
        return new Promise(resolve => {
            let details = { hash: utils_1.UNCOMMITTED, parents: [], author: '', email: '', date: 0, committer: '', body: '', fileChanges: [], error: null };
            Promise.all([
                this.getDiffTreeNameStatus(repo, 'HEAD', ''),
                this.getDiffTreeNumStat(repo, 'HEAD', ''),
                this.getStatus(repo)
            ]).then((results) => {
                details.fileChanges = generateFileChanges(results[0], results[1], results[2]);
                resolve(details);
            }).catch((errorMessage) => {
                details.error = errorMessage;
                resolve(details);
            });
        });
    }
    getCommitComparison(repo, fromHash, toHash) {
        return new Promise(resolve => {
            Promise.all([
                this.getDiffTreeNameStatus(repo, fromHash, toHash === utils_1.UNCOMMITTED ? '' : toHash),
                this.getDiffTreeNumStat(repo, fromHash, toHash === utils_1.UNCOMMITTED ? '' : toHash),
                toHash === utils_1.UNCOMMITTED ? this.getStatus(repo) : Promise.resolve(null)
            ]).then((results) => {
                resolve({
                    fileChanges: generateFileChanges(results[0], results[1], results[2]),
                    error: null
                });
            }).catch((errorMessage) => {
                resolve({ fileChanges: [], error: errorMessage });
            });
        });
    }
    getCommitFile(repo, commitHash, filePath, type, diffSide) {
        if ((commitHash === utils_1.UNCOMMITTED && type === 'D') || (diffSide === 'old' && type === 'A') || (diffSide === 'new' && type === 'D')) {
            return new Promise(resolve => resolve(''));
        }
        else {
            return this._spawnGit(['show', commitHash + ':' + filePath], repo, stdout => {
                let encoding = config_1.getConfig().fileEncoding();
                return iconv_lite_1.decode(stdout, iconv_lite_1.encodingExists(encoding) ? encoding : 'utf8');
            });
        }
    }
    getRemoteUrl(repo, remote) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                this.spawnGit(['config', '--get', 'remote.' + remote + '.url'], repo, stdout => stdout.split(EOL_REGEX)[0])
                    .then(value => resolve(value))
                    .catch(() => resolve(null));
            });
        });
    }
    getRepoSettings(repo) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                Promise.all([
                    this.getConfigList(repo, 'local'),
                    this.getRemotes(repo)
                ]).then((results) => {
                    let configNames = [];
                    results[1].forEach(remote => {
                        configNames.push('remote.' + remote + '.url', 'remote.' + remote + '.pushurl');
                    });
                    let configs = getConfigs(results[0], configNames);
                    resolve({
                        settings: {
                            remotes: results[1].map(remote => ({
                                name: remote,
                                url: configs['remote.' + remote + '.url'],
                                pushUrl: configs['remote.' + remote + '.pushurl']
                            }))
                        },
                        error: null
                    });
                }).catch((errorMessage) => {
                    resolve({ settings: null, error: errorMessage });
                });
            });
        });
    }
    getTagDetails(repo, tagName) {
        return new Promise(resolve => {
            this.spawnGit(['for-each-ref', 'refs/tags/' + tagName, '--format=' + ['%(objectname)', '%(taggername)', '%(taggeremail)', '%(taggerdate:unix)', '%(contents)'].join(GIT_LOG_SEPARATOR)], repo, (stdout => {
                let data = stdout.split(GIT_LOG_SEPARATOR);
                return {
                    tagHash: data[0],
                    name: data[1],
                    email: data[2].substring(data[2].startsWith('<') ? 1 : 0, data[2].length - (data[2].endsWith('>') ? 1 : 0)),
                    date: parseInt(data[3]),
                    message: data[4].trim().split(EOL_REGEX).join('\n'),
                    error: null
                };
            })).then((data) => {
                resolve(data);
            }).catch((errorMessage) => {
                resolve({ tagHash: '', name: '', email: '', date: 0, message: '', error: errorMessage });
            });
        });
    }
    areStagedChanges(repo) {
        return this.spawnGit(['diff-index', 'HEAD'], repo, (stdout) => stdout !== '').then(changes => changes, () => false);
    }
    repoRoot(repoPath) {
        return this.spawnGit(['rev-parse', '--show-toplevel'], repoPath, (stdout) => utils_1.getPathFromUri(vscode_1.Uri.file(path.normalize(stdout.trim())))).then((canonicalRoot) => __awaiter(this, void 0, void 0, function* () {
            let path = repoPath;
            let first = path.indexOf('/');
            while (true) {
                if (canonicalRoot === path || canonicalRoot === (yield utils_1.realpath(path)))
                    return path;
                let next = path.lastIndexOf('/');
                if (first !== next && next > -1) {
                    path = path.substring(0, next);
                }
                else {
                    return canonicalRoot;
                }
            }
        })).catch(() => null);
    }
    addRemote(repo, name, url, pushUrl, fetch) {
        return __awaiter(this, void 0, void 0, function* () {
            let status = yield this.runGitCommand(['remote', 'add', name, url], repo);
            if (status !== null)
                return status;
            if (pushUrl !== null) {
                status = yield this.runGitCommand(['remote', 'set-url', name, '--push', pushUrl], repo);
                if (status !== null)
                    return status;
            }
            return fetch ? this.fetch(repo, name, false) : null;
        });
    }
    deleteRemote(repo, name) {
        return this.runGitCommand(['remote', 'remove', name], repo);
    }
    editRemote(repo, nameOld, nameNew, urlOld, urlNew, pushUrlOld, pushUrlNew) {
        return __awaiter(this, void 0, void 0, function* () {
            if (nameOld !== nameNew) {
                let status = yield this.runGitCommand(['remote', 'rename', nameOld, nameNew], repo);
                if (status !== null)
                    return status;
            }
            if (urlOld !== urlNew) {
                let args = ['remote', 'set-url', nameNew];
                if (urlNew === null)
                    args.push('--delete', urlOld);
                else if (urlOld === null)
                    args.push('--add', urlNew);
                else
                    args.push(urlNew, urlOld);
                let status = yield this.runGitCommand(args, repo);
                if (status !== null)
                    return status;
            }
            if (pushUrlOld !== pushUrlNew) {
                let args = ['remote', 'set-url', '--push', nameNew];
                if (pushUrlNew === null)
                    args.push('--delete', pushUrlOld);
                else if (pushUrlOld === null)
                    args.push('--add', pushUrlNew);
                else
                    args.push(pushUrlNew, pushUrlOld);
                let status = yield this.runGitCommand(args, repo);
                if (status !== null)
                    return status;
            }
            return null;
        });
    }
    pruneRemote(repo, name) {
        return this.runGitCommand(['remote', 'prune', name], repo);
    }
    addTag(repo, tagName, commitHash, lightweight, message) {
        let args = ['tag'];
        if (lightweight) {
            args.push(tagName);
        }
        else {
            args.push('-a', tagName, '-m', message);
        }
        args.push(commitHash);
        return this.runGitCommand(args, repo);
    }
    deleteTag(repo, tagName, deleteOnRemote) {
        return __awaiter(this, void 0, void 0, function* () {
            if (deleteOnRemote !== null) {
                let status = yield this.runGitCommand(['push', deleteOnRemote, '--delete', tagName], repo);
                if (status !== null)
                    return status;
            }
            return this.runGitCommand(['tag', '-d', tagName], repo);
        });
    }
    fetch(repo, remote, prune) {
        let args = ['fetch', remote === null ? '--all' : remote];
        if (prune)
            args.push('--prune');
        return this.runGitCommand(args, repo);
    }
    pushBranch(repo, branchName, remote, setUpstream, force) {
        let args = ['push'];
        if (setUpstream)
            args.push('-u');
        args.push(remote, branchName);
        if (force)
            args.push('--force');
        return this.runGitCommand(args, repo);
    }
    pushTag(repo, tagName, remote) {
        return this.runGitCommand(['push', remote, tagName], repo);
    }
    checkoutBranch(repo, branchName, remoteBranch) {
        let args = ['checkout'];
        if (remoteBranch === null)
            args.push(branchName);
        else
            args.push('-b', branchName, remoteBranch);
        return this.runGitCommand(args, repo);
    }
    createBranch(repo, branchName, commitHash, checkout) {
        let args = [];
        if (checkout)
            args.push('checkout', '-b');
        else
            args.push('branch');
        args.push(branchName, commitHash);
        return this.runGitCommand(args, repo);
    }
    deleteBranch(repo, branchName, forceDelete) {
        let args = ['branch', '--delete'];
        if (forceDelete)
            args.push('--force');
        args.push(branchName);
        return this.runGitCommand(args, repo);
    }
    deleteRemoteBranch(repo, branchName, remote) {
        return __awaiter(this, void 0, void 0, function* () {
            let remoteStatus = yield this.runGitCommand(['push', remote, '--delete', branchName], repo);
            if (remoteStatus !== null && (new RegExp('remote ref does not exist', 'i')).test(remoteStatus)) {
                let trackingBranchStatus = yield this.runGitCommand(['branch', '-d', '-r', remote + '/' + branchName], repo);
                return trackingBranchStatus === null ? null : 'Branch does not exist on the remote, deleting the remote tracking branch ' + remote + '/' + branchName + '.\n' + trackingBranchStatus;
            }
            return remoteStatus;
        });
    }
    pullBranch(repo, branchName, remote, createNewCommit, squash) {
        return __awaiter(this, void 0, void 0, function* () {
            let args = ['pull', remote, branchName];
            if (squash)
                args.push('--squash');
            else if (createNewCommit)
                args.push('--no-ff');
            let pullStatus = yield this.runGitCommand(args, repo);
            if (pullStatus === null && squash) {
                if (yield this.areStagedChanges(repo)) {
                    return this.runGitCommand(['commit', '-m', 'Merge branch \'' + remote + '/' + branchName + '\''], repo);
                }
            }
            return pullStatus;
        });
    }
    renameBranch(repo, oldName, newName) {
        return this.runGitCommand(['branch', '-m', oldName, newName], repo);
    }
    merge(repo, obj, type, createNewCommit, squash) {
        return __awaiter(this, void 0, void 0, function* () {
            let args = ['merge', obj];
            if (squash)
                args.push('--squash');
            else if (createNewCommit)
                args.push('--no-ff');
            let mergeStatus = yield this.runGitCommand(args, repo);
            if (mergeStatus === null && squash) {
                if (yield this.areStagedChanges(repo)) {
                    return this.runGitCommand(['commit', '-m', 'Merge ' + type.toLowerCase() + ' \'' + obj + '\''], repo);
                }
            }
            return mergeStatus;
        });
    }
    rebase(repo, obj, type, ignoreDate, interactive) {
        if (interactive) {
            return new Promise(resolve => {
                if (this.gitExecutable === null)
                    return resolve(utils_1.UNABLE_TO_FIND_GIT_MSG);
                utils_1.runGitCommandInNewTerminal(repo, this.gitExecutable.path, 'rebase --interactive ' + (type === 'Branch' ? obj.replace(/'/g, '"\'"') : obj), 'Git Rebase on "' + (type === 'Branch' ? obj : utils_1.abbrevCommit(obj)) + '"');
                setTimeout(() => resolve(null), 1000);
            });
        }
        else {
            let args = ['rebase', obj];
            if (ignoreDate)
                args.push('--ignore-date');
            return this.runGitCommand(args, repo);
        }
    }
    checkoutCommit(repo, commitHash) {
        return this.runGitCommand(['checkout', commitHash], repo);
    }
    cherrypickCommit(repo, commitHash, parentIndex) {
        let args = ['cherry-pick', commitHash];
        if (parentIndex > 0)
            args.push('-m', parentIndex.toString());
        return this.runGitCommand(args, repo);
    }
    resetToCommit(repo, commitHash, resetMode) {
        return this.runGitCommand(['reset', '--' + resetMode, commitHash], repo);
    }
    revertCommit(repo, commitHash, parentIndex) {
        let args = ['revert', '--no-edit', commitHash];
        if (parentIndex > 0)
            args.push('-m', parentIndex.toString());
        return this.runGitCommand(args, repo);
    }
    cleanUntrackedFiles(repo, directories) {
        return this.runGitCommand(['clean', '-f' + (directories ? 'd' : '')], repo);
    }
    getConfigList(repo, type) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.spawnGit(['--no-pager', 'config', '--list', '--' + type], repo, (stdout) => stdout.split(EOL_REGEX));
        });
    }
    getDiffTreeNameStatus(repo, fromHash, toHash) {
        return this.execDiffTree(repo, fromHash, toHash, '--name-status');
    }
    getDiffTreeNumStat(repo, fromHash, toHash) {
        return this.execDiffTree(repo, fromHash, toHash, '--numstat');
    }
    getLog(repo, branches, num, showRemoteBranches, order) {
        let args = ['log', '--max-count=' + num, '--format=' + this.gitLogFormat, '--' + order + '-order'];
        if (branches !== null) {
            for (let i = 0; i < branches.length; i++) {
                args.push(branches[i]);
            }
        }
        else {
            args.push('--branches', '--tags');
            if (showRemoteBranches)
                args.push('--remotes');
            args.push('HEAD');
        }
        args.push('--');
        return this.spawnGit(args, repo, (stdout) => {
            let lines = stdout.split(EOL_REGEX);
            let gitCommits = [];
            for (let i = 0; i < lines.length - 1; i++) {
                let line = lines[i].split(GIT_LOG_SEPARATOR);
                if (line.length !== 6)
                    break;
                gitCommits.push({ hash: line[0], parentHashes: line[1].split(' '), author: line[2], email: line[3], date: parseInt(line[4]), message: line[5] });
            }
            return gitCommits;
        });
    }
    getRefs(repo, showRemoteBranches) {
        let args = ['show-ref'];
        if (!showRemoteBranches)
            args.push('--heads', '--tags');
        args.push('-d', '--head');
        return this.spawnGit(args, repo, (stdout) => {
            let refData = { head: null, heads: [], tags: [], remotes: [] };
            let lines = stdout.split(EOL_REGEX);
            for (let i = 0; i < lines.length - 1; i++) {
                let line = lines[i].split(' ');
                if (line.length < 2)
                    continue;
                let hash = line.shift();
                let ref = line.join(' ');
                if (ref.startsWith('refs/heads/')) {
                    refData.heads.push({ hash: hash, name: ref.substring(11) });
                }
                else if (ref.startsWith('refs/tags/')) {
                    let annotated = ref.endsWith('^{}');
                    refData.tags.push({ hash: hash, name: (annotated ? ref.substring(10, ref.length - 3) : ref.substring(10)), annotated: annotated });
                }
                else if (ref.startsWith('refs/remotes/')) {
                    refData.remotes.push({ hash: hash, name: ref.substring(13) });
                }
                else if (ref === 'HEAD') {
                    refData.head = hash;
                }
            }
            return refData;
        });
    }
    getRemotes(repo) {
        return this.spawnGit(['remote'], repo, (stdout) => {
            let lines = stdout.split(EOL_REGEX);
            lines.pop();
            return lines;
        });
    }
    getUnsavedChanges(repo) {
        return this.spawnGit(['status', '-s', '--branch', '--untracked-files', '--porcelain'], repo, (stdout) => {
            let lines = stdout.split(EOL_REGEX);
            return lines.length > 2
                ? { branch: lines[0].substring(3).split('...')[0], changes: lines.length - 2 }
                : null;
        });
    }
    getStatus(repo) {
        return this.spawnGit(['-c', 'core.quotepath=false', 'status', '-s', '--untracked-files', '--porcelain'], repo, (stdout) => {
            let lines = stdout.split(EOL_REGEX);
            let status = { deleted: [], untracked: [] };
            let path = '', c1 = '', c2 = '';
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].length < 4)
                    continue;
                path = lines[i].substring(3);
                c1 = lines[i].substring(0, 1);
                c2 = lines[i].substring(1, 2);
                if (c1 === 'D' || c2 === 'D')
                    status.deleted.push(path);
                else if (c1 === '?' || c2 === '?')
                    status.untracked.push(path);
            }
            return status;
        });
    }
    execDiffTree(repo, fromHash, toHash, arg) {
        let args = ['-c', 'core.quotepath=false'];
        if (fromHash === toHash) {
            args.push('diff-tree', arg, '-r', '-m', '--root', '--find-renames', '--diff-filter=AMDR', fromHash);
        }
        else {
            args.push('diff', arg, '-m', '--find-renames', '--diff-filter=AMDR', fromHash);
            if (toHash !== '')
                args.push(toHash);
        }
        return this.spawnGit(args, repo, (stdout) => {
            let lines = stdout.split(EOL_REGEX);
            if (fromHash === toHash)
                lines.shift();
            return lines;
        });
    }
    runGitCommand(args, repo) {
        return this._spawnGit(args, repo, () => null).catch((errorMessage) => errorMessage);
    }
    spawnGit(args, repo, resolveValue) {
        return this._spawnGit(args, repo, (stdout) => resolveValue(stdout.toString()));
    }
    _spawnGit(args, repo, resolveValue) {
        return new Promise((resolve, reject) => {
            if (this.gitExecutable === null)
                return reject(utils_1.UNABLE_TO_FIND_GIT_MSG);
            const cmd = cp.spawn(this.gitExecutable.path, args, {
                cwd: repo,
                env: Object.assign({}, process.env, this.askpassEnv)
            });
            Promise.all([
                new Promise((resolve) => {
                    let resolved = false;
                    cmd.on('error', (error) => {
                        resolve({ code: -1, error: error });
                        resolved = true;
                    });
                    cmd.on('exit', (code) => {
                        if (resolved)
                            return;
                        resolve({ code: code, error: null });
                    });
                }),
                new Promise((resolve) => {
                    let buffers = [];
                    cmd.stdout.on('data', (b) => { buffers.push(b); });
                    cmd.stdout.on('close', () => resolve(Buffer.concat(buffers)));
                }),
                new Promise((resolve) => {
                    let stderr = '';
                    cmd.stderr.on('data', (d) => { stderr += d; });
                    cmd.stderr.on('close', () => resolve(stderr));
                })
            ]).then(values => {
                let status = values[0], stdout = values[1];
                if (status.code === 0) {
                    resolve(resolveValue(stdout));
                }
                else {
                    reject(getErrorMessage(status.error, stdout, values[2]));
                }
            });
            this.logger.logCmd('git', args);
        });
    }
}
exports.DataSource = DataSource;
function generateFileChanges(nameStatusResults, numStatResults, status) {
    let fileChanges = [], fileLookup = {}, i = 0;
    for (i = 0; i < nameStatusResults.length - 1; i++) {
        let line = nameStatusResults[i].split('\t');
        if (line.length < 2)
            continue;
        let oldFilePath = utils_1.getPathFromStr(line[1]), newFilePath = utils_1.getPathFromStr(line[line.length - 1]);
        fileLookup[newFilePath] = fileChanges.length;
        fileChanges.push({ oldFilePath: oldFilePath, newFilePath: newFilePath, type: line[0][0], additions: null, deletions: null });
    }
    if (status !== null) {
        let filePath;
        for (i = 0; i < status.deleted.length; i++) {
            filePath = utils_1.getPathFromStr(status.deleted[i]);
            if (typeof fileLookup[filePath] === 'number') {
                fileChanges[fileLookup[filePath]].type = 'D';
            }
            else {
                fileChanges.push({ oldFilePath: filePath, newFilePath: filePath, type: 'D', additions: null, deletions: null });
            }
        }
        for (i = 0; i < status.untracked.length; i++) {
            filePath = utils_1.getPathFromStr(status.untracked[i]);
            fileChanges.push({ oldFilePath: filePath, newFilePath: filePath, type: 'U', additions: null, deletions: null });
        }
    }
    for (i = 0; i < numStatResults.length - 1; i++) {
        let line = numStatResults[i].split('\t');
        if (line.length !== 3)
            continue;
        let fileName = line[2].replace(/(.*){.* => (.*)}/, '$1$2').replace(/.* => (.*)/, '$1');
        if (typeof fileLookup[fileName] === 'number') {
            fileChanges[fileLookup[fileName]].additions = parseInt(line[0]);
            fileChanges[fileLookup[fileName]].deletions = parseInt(line[1]);
        }
    }
    return fileChanges;
}
function getConfigs(configList, configNames) {
    let results = {}, matchConfigs = [];
    configNames.forEach(configName => {
        results[configName] = null;
        matchConfigs.push(configName + '=');
    });
    for (let i = 0; i < configList.length; i++) {
        for (let j = 0; j < configNames.length; j++) {
            if (configList[i].startsWith(matchConfigs[j])) {
                results[configNames[j]] = configList[i].substring(configNames[j].length + 1);
                break;
            }
        }
    }
    return results;
}
function getErrorMessage(error, stdoutBuffer, stderr) {
    let stdout = stdoutBuffer.toString(), lines;
    if (stdout !== '' || stderr !== '') {
        lines = (stderr + stdout).split(EOL_REGEX);
        lines.pop();
    }
    else if (error) {
        lines = error.message.split(EOL_REGEX);
    }
    else {
        lines = [];
    }
    return lines.join('\n');
}
//# sourceMappingURL=dataSource.js.map