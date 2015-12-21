#!/usr/bin/env node
'use strict';
var path = require('path');
var fs = require('fs');
var spawn = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var execSync = require('child_process').execSync;
var appRoot = process.env.APP_ROOT || process.cwd();
var xtend = require('xtend');
var cwds = appRoot.replace(/^\/|\/$/g, '').split('/').reverse();
var env = xtend(process.env);
if (Number(cwds[1]) && cwds[2] === 'mr') {
    env.MERGE_REQUEST_IID = cwds[1];
}

/* ccnpm install 应该是 node-deploy 脚本已经做过了
if (process.argv[2] !== 'stop') {
    var npmir = execSync('ccnpm install', {
        cwd: appRoot,
        env: xtend(env, {
            NVM_NODEJS_ORG_MIRROR: "https://npm.taobao.org/mirrors/node",
            NVM_IOJS_ORG_MIRROR: "https://npm.taobao.org/mirrors/iojs",
        }),
    }).toString('utf-8');
}
*/

var port = +(process.env.PORT) || +(process.argv[2]) || 8000;
// 在有 MERGE_REQUEST_IID 环境变量的时候这个配置应该不管用，
// 进程会自动由 seaport 分配

var serviceJsonPath = path.join(appRoot, 'running-service.json');
function getService() {
    try {
        return JSON.parse(fs.readFileSync(serviceJsonPath, 'utf-8'));
    } catch (e) {
        return false;
    }
}

var service = getService();
if (process.argv[2] === 'stop') {
    if (service) {
        process.kill(service.pid);
        fs.unlinkSync(serviceJsonPath);
    }
    console.log(' - service killed');
    return;
}

/* ccnpm run build 应该也是 node-delpoy 做过了
console.log(' - build start - ');
var buildResult = spawnSync(process.execPath, [path.join(appRoot, 'node_modules', '.bin', 'gulp'), 'build'], {
    cwd: appRoot,
    env: process.env,
});

console.log(buildResult.stdout.toString('utf-8'));
console.log(buildResult.stderr.toString('utf-8'));
if (buildResult.error) {
    console.error('build error, exiting...');
    process.exit(buildResult.status);
}
console.log(' - build done - ');
*/

if (process.argv.indexOf('-f') > -1) {
    require('./master');
} else if (service) {
    if (fs.existsSync('/proc/'+service.pid)) {
        console.log(' - service seems to be running, now restarting...');
        fs.writeFileSync(path.join(appRoot, 'touch_to_restart.js'), new Buffer([]));
    } else {
        start();
    }
} else {
    start();
}
function start() {
    console.log(' - starting web server...');
    spawn(process.execPath, [path.join(__dirname, 'master.js')], {
        cwd: appRoot,
        env: xtend(env, {PORT: port}),
        silent: true,
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore']
    }).unref();
}
