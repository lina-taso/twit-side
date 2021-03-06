/**
 * @fileOverview Main background script
 * @name background_main.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

browser.runtime.onStartup.addListener(startup);
browser.runtime.onInstalled.addListener(install);
browser.runtime.onConnect.addListener(onconnect); // port is only used messaging from background to content
browser.runtime.onMessage.addListener(observer); // this is used messaging from content to background
browser.windows.onRemoved.addListener(onremoved);
browser.browserAction.onClicked.addListener(onclicked);

const firstrun_url = 'https://www2.filewo.net/wordpress/category/twit-side-addon/',
      panel_url = browser.extension.getURL('/ui/sidebar.xhtml');

var ports = [],
    windows = {};


// load preferences
TwitSideModule.config.loadPrefs().then(() => {
    TwitSideModule.debug.log('TwitSide startup');
    init();
});

function startup()
{
}

async function install()
{
    await TwitSideModule.config.loadPrefs();

    var current_version = browser.runtime.getManifest().version,
        config_version = TwitSideModule.config.getPref('version');

    // latest release installed
    if (current_version == config_version) {
        return;
    }

    TwitSideModule.browsers.openURL(firstrun_url);

    // first run
    if (!config_version) {
        TwitSideModule.config.setPref('version', current_version);
        return;
    }

    // do something after upgrading if necessary.
    // from ver 0.9.4 stream disable
    if (config_version < '0.9.4') {
        let columns = JSON.parse(TwitSideModule.config.getPref('columns') || '{}');
        for (let i in columns) {
            if (columns[i].options.stream != null) {
                // if stream is enabled, enable autoreload
                if (columns[i].options.stream) {
                    columns[i].options.autoreload = true;
                }
                delete columns[i].options.stream;
            }
        }
        await TwitSideModule.config.setPref('columns', JSON.stringify(columns));
    }

    await TwitSideModule.config.setPref('version', current_version);
    browser.runtime.reload();
}

function init()
{
    // start TwitSide in background
    TwitSideModule.ManageUsers = new ManageUsers();
    TwitSideModule.ManageColumns = new ManageColumns();
    TwitSideModule.Mutes = new Mutes();

    // modules init
    Promise.all([ TwitSideModule.ManageUsers.initialize(),
                  TwitSideModule.ManageColumns.initialize() ]);
    TwitSideModule.debug.log('TwitSide working in background');
}

// connection from content script
function onconnect(p)
{
    p.onDisconnect.addListener(ondisconnect);
    ports.push(p);
    TwitSideModule.debug.log("Connected from content script. Number of ports:" + ports.length);
}

function ondisconnect(p)
{
    // remove windows of the port origin
    for (let suffix in windows) {
        if (windows[suffix].opener.toString() == p.name) {
            browser.windows.remove(windows[suffix].id);
        }
    }

    // remove the port from ports array
    ports.splice(ports.indexOf(p), 1);
    TwitSideModule.debug.log("Disconnected from content script. Number of ports:" + ports.length);
}

// message from content script
function observer(message, sender, cb)
{
    TwitSideModule.debug.log(message);

    if (message.action == null) throw new Error('ACTION_IS_REQUIRED');

    switch (message.command) {
    case TwitSideModule.COMMAND.CONFIG_OPE:
        cb(CONFIG_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.TWEET_OPE:
        cb(TWEET_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.COLUMN_OPE:
        cb(COLUMN_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.USER_OPE:
        cb(USER_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.FRIEND_OPE:
        cb(FRIEND_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.MSG_OPE:
        cb(MSG_OPE(message).catch(error));
        break;
    case TwitSideModule.COMMAND.WINDOW_OPE:
        cb(WINDOW_OPE(message).catch(error));
        break;
    default:
        throw new Error('COMMAND_IS_NOT_DEFINED');
    }

    function error(e)
    {
        TwitSideModule.Message.throwError(e);
    }
}

// message to all content scripts
function postMessage(data, winname)
{
    for (let p of ports) {
        if (winname != null && p.name != winname) continue;
        p.postMessage(data);
    }
}

function onremoved(winname)
{
    // close port
//    for (let p of ports) {
//        if (p.name == winname.toString()) {
//            ondisconnect(p);
//            break;
//        }
//    }
    // remove from windows hash
    for (let suffix in windows) {
        if (windows[suffix].id.toString() == winname) {
            delete windows[suffix];
            break;
        }
    }
}

function onclicked(tab)
{
    browser.sidebarAction.getPanel({tabId: tab.id});

    // check window id
    for (let p of ports) {
        if (p.name == tab.windowId.toString()) {
            // opened twit-side
            browser.sidebarAction.close();
            return;
        }
    }

    // closed
    browser.sidebarAction.open();
}
