'use strict';
var execSync = require('child_process').execSync
var path = require('path');
var fs = require('fs');
var respawn = require('respawn-cluster');
var xtend = require('xtend');
var proagent = require('promisingagent');
var appName = process.env.SERVICE_APP_NAME || 'web';
var log = require('bunyan-hub-logger')({app: appName, name: 'server'});
var appRoot = process.env.APP_ROOT || process.cwd();
var port = +(process.env.PORT || '8000');
var env = {
    NODE_ENV: 'production',
    cwd: appRoot,
}
if ((process.env.HOSTNAME || '').match(/UAT$/)) {
    env.NODE_APP_INSTANCE = 'uat';
}
var clusterWorkers = Number(process.env.CLUSTER_WORKERS);
if (!(clusterWorkers > 0)) {
    clusterWorkers = env.NODE_APP_INSTANCE === 'uat' ? 1 : require('os').cpus().length;
}
var entryScriptPath = process.env.ENTRY || 'index.js';

env.PPID = process.pid;
var service = {
    started: Date.now(),
    pid: process.pid,
    port: port,
    workers: [],
};
for (var i = 0; i < clusterWorkers; i++) {
    var m = respawn([process.execPath, path.join(appRoot, entryScriptPath)], {
        mode: 'cluster',
        cwd: env.cwd,
        env: xtend(process.env, env, {
                 PORT: port,
                 RESTART_DELAY: i * (4000 / clusterWorkers),
             }),
    });
    m.on('spawn', function () {
        log.info(appName + ' instance on port %d spawned', port);
    });
    m.on('start', log.info.bind(log, appName + ' instance on port %d started', port));
    m.on('exit', log.info.bind(log, appName + ' instance on port %d exited', port));
    m.start();
    service.workers.push(m);
}

fs.writeFileSync(path.join(appRoot, 'running-service.json'), JSON.stringify(service, null, '  '), 'utf-8');
