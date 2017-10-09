/**
 * @fileOverview api content script
 * @name api.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'api';

var prefs = {},
    winid;

window.addEventListener('load', () => {
    localization();
    buttonize(['.buttonItem'], commandExec);
    vivify();

    // コンフィグ取得
    Promise.all([
        browser.windows.getCurrent(),
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                      action : TwitSideModule.COMMAND.CONFIG_LOAD })
    ]).then(([win, p]) => {
        prefs = p;
        winid = win.id;
        // オブザーバー開始
        myport = browser.runtime.connect({ name : win.id.toString() });
        myport.onMessage.addListener(UI.observer);

        // UI初期化
        UI.setStyleSheets();

        // ウィンドウ初期化済通知
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_INITED,
                                      suffix : SUFFIX,
                                      id : winid });
    });
});
window.addEventListener('beforeunload', () => {
    UI.finish();
});

// add other event listener
function vivify()
{
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {
    case 'closeButton':
        browser.windows.getCurrent()
            .then((win) => {
                browser.windows.remove(win.id);
            });
        break;
//    case '':
//        break;
    }

    // identify from class
    switch (true) {
//    case btn.classList.contains(''):
//        break;
    }
}


/**
 * Panel operation
 */
function showApi(userid)
{
    // 初期化
    $('#apiContainer .apiRow').remove();

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                  action : TwitSideModule.COMMAND.TWEET_SHOWAPI,
                                  userid : userid,
                                  options : {} })
        .then((result) => {
            console.log(result.data);

            var data = result.data,
                $apiBody = $('#apiBody'),
                reset = new Date();

            for (let category in data) {
                if (category == 'rate_limit_context') continue;

                for (let path in data[category]) {
                    let $apiPathRow = $('#templateContainer .apiPathRow').clone();
                    $apiPathRow.children().eq(0).text(path);
                    $apiBody.append($apiPathRow);

                    for (let api in data[category][path]) {
                        let $apiRow = $('#templateContainer .apiRow').clone();
                        reset.setTime(data[category][path][api].reset * 1000);

                        $apiRow.children().eq(0).text(api);
                        $apiRow.children().eq(1).text(data[category][path][api].remaining);
                        $apiRow.children().eq(2).text(data[category][path][api].limit);
                        $apiRow.children().eq(3).text(
                            TwitSideModule.text.convertTimeStamp(reset, getPref('timeformat')));

                        $apiBody.append($apiRow);
                    }
                }
            }
        });
}
