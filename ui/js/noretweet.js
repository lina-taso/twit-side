/**
 * @fileOverview noretweet content script
 * @name noretweet.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'noretweet';

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
        return UI.initialize(TwitSideModule.WINDOW_TYPE.NORETWEET);
    }).then(() => {
        // ウィンドウ初期化済通知
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_INITED,
                                      suffix : SUFFIX,
                                      id : winid });
    });
});
window.addEventListener('beforeunload', () => {
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_RESET,
                                  win_type : UI._win_type });
    UI.finish();
});

// add other event listener
function vivify()
{
    $('#tweetUserSelection').on('select2:select', showNoretweets);
    // カラムコンテナ
    $('#columnContainer')
        .keypress(keyeventChangeFocus)
        .on('focus', '.column',
            function(e) {
                UI.setActiveColumn($(this));
            })
        .on('focus', '.timelineBox > .tweetBox',
            function(e) {
                e.stopPropagation();
                UI.setActiveBox($(this));
            });
    // タイムライン
    $('#templateContainer .timelineBox')
        .on('scroll', function() {
            // 影
            $(this).siblings('.columnShadowBox')
                .height(this.scrollTop < 10 ? this.scrollTop : 10);

            // オートページャ
            if (this.scrollHeight - this.clientHeight - 200 < this.scrollTop
                && getPref('autopager'))
                loadMore(this.lastChild);
        });
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
    case btn.classList.contains('toTopButton'): // columnMenuBox
        timelineMove('top');
        break;
    case btn.classList.contains('toBottomButton'):
        timelineMove('bottom');
        break;
    case btn.classList.contains('updateButton'):
        loadNewer(getColumnIndexFromBox(btn));
        break;

//    case btn.classList.contains(''):
//        break;
    }
}


/**
 * Panel operation
 */
function initialize()
{
    // カラム初期化
    return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                         action : TwitSideModule.COMMAND.COLUMN_RESET,
                                         win_type : UI._win_type });
}

async function showNoretweets()
{
    // 初期化
    await initialize();

    // ユーザ
    var ownid = UI.$tweetUserSelection[0].selectedOptions[0].value,
        userinfo = await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                                       action : TwitSideModule.COMMAND.USER_GETINFO,
                                                       userid : ownid, key : null });

    /**
     * ミュートタイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_NORETWEET,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 0,
          options : { onstart : false,
                      autoreload : false,
                      notif : false,
                      veil : false },
          parameters : null });

    loadNewer(0);
}


/**
 * Tweet operation
 */
// change screenname list
function changeTweetUser(userid)
{
    if (userid == null) return; // _makeColumn
    UI.$tweetUserSelection.select2('val', [userid]);
}
