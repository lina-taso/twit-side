/**
 * @fileOverview search content script
 * @name search.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'search';

var prefs = {},
    winid,
    userinfo; // 自身のプロフィール（init parameter）

window.addEventListener('load', () => {
    localization();
    buttonize(['.countboxButton', '.buttonItem',
               '.tweetRetweeterImage', '.tweetMoreBox',
               '.clearRepliesBox', '.tweetMenuButton'],
              commandExec);
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
        return UI.initialize(TwitSideModule.WINDOW_TYPE.SEARCH);
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
    // キーワード入力ボックス
    $('#keyword')
        .on('keypress', keypressSearchbox);
    // カラムコンテナ
    $('#columnContainer')
        .keypress(keyeventChangeFocus)
        .on('focus', '.column', function() {
            UI.setActiveColumn($(this));
        })
        .on('focus', '.timelineBox > .tweetBox', function(e) {
            e.stopPropagation();
            UI.setActiveBox($(this));
        })
        .on('click','.tweetThumbnailImage', showPhotos); // サムネイル
    // タイムライン
    $('#templateContainer .timelineBox')
        .on('scroll', function() {
            // 影
            $(this).siblings('.columnShadowBox')
                .height(this.scrollTop < 10 ? this.scrollTop : 10);

            // オートページャ
            if (this.scrollHeight - this.clientHeight - 200 < this.scrollTop
                && getPref('autopager')
                && this.parentNode.dataset.more == '') {
                // 重複読み込み防止
                this.parentNode.dataset.more = true;
                loadMore(this.lastChild);
            }
        });

    // 自動更新
    $('#autoreload')
        .on('change', function() {
            if (!$('#grayout').hasClass('hidden')) return;
            browser.runtime.sendMessage(
                { command : TwitSideModule.COMMAND.COLUMN_OPE,
                  action : TwitSideModule.COMMAND.COLUMN_EDIT,
                  tl_type : TwitSideModule.TL_TYPE.TEMP_SEARCH,
                  win_type : UI._win_type,
                  columnindex : 0,
                  columninfo : {
                      options : { onstart : false,
                                  autoreload : $(this).prop('checked'),
                                  notif : false,
                                  veil : false }
                  } });
        });
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {

    case 'search':
        searchTweet();
        break;

//    case '':
//        break;
    }

    // identify from class
    switch (true) {

    case btn.classList.contains('clearRepliesBox'): // column
        clearAllReplies(btn);
        break;

    case btn.classList.contains('toTopButton'): // columnMenuBox
        timelineMove('top');
        break;
    case btn.classList.contains('toBottomButton'):
        timelineMove('bottom');
        break;
    case btn.classList.contains('updateButton'):
        loadNewer(getColumnIndexFromBox(btn));
        break;
    case btn.classList.contains('addColumnButton'):
        onClickAddSearch2Column();
        break;
    case btn.classList.contains('tweetMoreBox'): // tweetBox
        loadMore(btn);
        break;
    case btn.classList.contains('clearReplyButton'):
        clearReplies(btn);
        break;
    case btn.classList.contains('tweetRetweeterImage'):
        onClickRetweeterImage(btn);
        break;
    case btn.classList.contains('tweetMenuButton'):
        UI.getTweetMenuFunc(
            UI.getActiveColumn().attr('data-column-type'),
            $(btn).index())(btn);
        break;

//    case btn.classList.contains(''):
//        break;
    }
}

function keypressSearchbox(e)
{
    e = e.originalEvent;
    // 検索
    if (e && e.key == 'Enter') {
        searchTweet();
    }
    return true;
}


/**
 * Panel operation
 */
function initialize()
{
    $('#grayout').toggleClass('hidden', false);

    // カラム初期化
    return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                         action : TwitSideModule.COMMAND.COLUMN_RESET,
                                         win_type : UI._win_type });
}

// 検索実施
async function searchTweet()
{
    // 初期化
    await initialize();

    // キーワード
    var keyword = $('#keyword').val();
    if (keyword.length == 0) {
        $('#keyword').focus();
        return;
    }

    $('#keyword')[0].blur();
    $('#grayout').toggleClass('hidden', true);

    // 自動更新
    var autoreload = $('#autoreload').prop('checked'),
        mute = getPref('mute_onsearch');

    /**
     * 検索タイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_SEARCH,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 0,
          options : { onstart : false,
                      autoreload : autoreload,
                      notif : false,
                      veil : false },
          parameters : {q : keyword} });

    loadNewer(0);
}


/**
 * Column operation
 */
// visible column index
function getColumnIndex()
{
    return [0];
}

// ダミー
function changeTweetUser(){
    return true;
}

// ダミー
function changeColumn()
{
    return true;
}

function onClickAddSearch2Column()
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_GETCOLINFO,
                                  columnindex : 0,
                                  key : null,
                                  win_type : UI._win_type })
        .then((columninfo) => {
            return Promise.all([
                browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.COLUMN_OPE,
                      action : TwitSideModule.COMMAND.COLUMN_ADD,
                      tl_type : TwitSideModule.TL_TYPE.SEARCH,
                      columnlabel : browser.i18n.getMessage('defaultSearch')
                      + ': ' + columninfo.parameters.q,
                      userid : userinfo.user_id,
                      win_type : TwitSideModule.WINDOW_TYPE.MAIN,
                      options : columninfo.options,
                      parameters : columninfo.parameters }),
                browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.MSG_OPE,
                      action : TwitSideModule.COMMAND.MSG_TRANSMSG,
                      error : 'columnAdded' })
            ]); })
        .then(([, message]) => {
            UI.showMessage(message);
        });
}
