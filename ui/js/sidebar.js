/**
 * @fileOverview sidebar content script
 * @name sidebar.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const COLUMN_TAB_WIDTH = 150,
      COLUMN_TAB_MARGIN = 2, // horizontal margin
      HELP_URL = 'https://www2.filewo.net/wordpress/%e8%a3%bd%e4%bd%9c%e7%89%a9/twit-side-%e8%aa%ac%e6%98%8e%e6%9b%b8/',
      TWEET_MAX_LENGTH = 140,
      MAX_PICS = 1,
      LOADWAIT = 1000;

var prefs = {},
    oauth_token,
    cursor = {x:null, y:null};

window.addEventListener('load', () => {
    new Promise((resolve, reject) => {
        localization();
        buttonize(['.buttonItem', '.menuItem', '.notifItem',
                   '.tweetRetweeterImage', '.tweetMoreBox',
                   '.clearRepliesBox', '.tweetMenuButton'],
                  commandExec);
        vivify();

        // waiting for loading background script
        setTimeout(function() {
            $('#loading').addClass('hidden');

            // コンフィグ取得
            resolve(Promise.all([
                browser.windows.getCurrent(),
                browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                              action : TwitSideModule.COMMAND.CONFIG_LOAD })
            ]));
        }, LOADWAIT);
    }).then(([win, p]) => {
        prefs = p;
        // オブザーバー開始
        myport = browser.runtime.connect({ name : win.id.toString() });
        myport.onMessage.addListener(UI.observer);

        // UI初期化
        return UI.initialize(TwitSideModule.WINDOW_TYPE.MAIN);
    }).then(() => {
        // 初期化
        newTweetContainerToggle(getPref('newtweet_pinned'), getPref('newtweet_pinned'));
        // チュートリアル
        if (getPref('tutorial')) runTutorial();
    });
});
window.addEventListener('unload', function() {
//    var ret = [];
//    $('#columnContainer .timelineBox').each(() => {
//        if (this.scrollTop != 0) {
//            // 投票
//            ret.push(browser.runtime.sendMessage({
//                command : TwitSideModule.COMMAND.COLUMN_OPE,
//                action : TwitSideModule.COMMAND.TL_VOTE,
//                columnindex : $(this).closest('.column').index(),
//                win_type : TwitSideModule.WINDOW_TYPE.MAIN,
//                vote : true
//            }));
//        }
//    });
//    return Promise.all(ret);
});

// キーボードショートカット
browser.commands.onCommand.addListener((command) => {
    browser.windows.getCurrent()
        .then((win) => {
            console.log(win);
            if (win.focused)
                return Promise.resolve();
            return Promise.reject();
        })
        .then(() => {
            if (command == "focus-newtweet") newTweetContainerToggle();
        });
});

// add other event listener
function vivify()
{
    $(window).resize(() => {
        // TODO horizontal resize
        $('#mainContainer').scrollLeft(0);
        calcColumns();
        scrollColumns();
    });
    $('#pin').on('click keyup paste', function() { setTimeout(checkPinBox, 10); });

    // 入力ボックス
    $('#newTweet')
        .on('keyup focus', countNewTweet)
        .on('keypress', keypressNewTweet);
    $('#suggestContainer')
        .on('click', 'option', function() {
            suggestOnSelect(false, $('#newTweet'), $('#suggestContainer'));
            return false;
        })
        .on('focus', 'option', function(e) {
            $(this).parent().focus();
            return false;
        })
        .on('keydown', function(e) {
            suggestOnSelect(e, $('#newTweet'), $('#suggestContainer'), $('#tweetButton'));
            return false;
        });
    $('#replyUsersSelection')
        .on('click', '.replyUser:gt(0)', toggleReplyUser);
    // メインコンテナ
    $('#mainContainer')
        .on('scroll', function() {
            if (this.timer) { clearTimeout(this.timer); }
            this.timer = setTimeout(scrollColumns, 150);
        })
        .on('mousedown', function(e) {
            cursor.x = e.originalEvent.clientX;
        })
        .on('mouseup', function() {
            if (cursor.x != null) cursor.x = null;
        })
        .on('mousemove', function(e) {
            // 前のカーソル位置
            if (!cursor.x) return;
            // ドラッグされていない
            if (e.originalEvent.buttons == 0) {
                $(this).mouseup();
                return;
            }
            var dx = cursor.x - e.originalEvent.clientX;
            cursor.x = e.originalEvent.clientX;
            UI.$mainC.scrollLeft(
                UI.$mainC.scrollLeft() + dx * 2
            );
        });
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

            // 最上部
            if (this.scrollTop == 0) {
                if (this.parentNode.dataset.top == 'false') {
                    this.parentNode.dataset.top = true;
                    // 投票
                    browser.runtime.sendMessage({
                        command : TwitSideModule.COMMAND.COLUMN_OPE,
                        action : TwitSideModule.COMMAND.TL_VOTE,
                        columnindex : $(this).index(),
                        win_type : TwitSideModule.WINDOW_TYPE.MAIN,
                        vote : true
                    });
                }
            }
            else {
                if (this.parentNode.dataset.top == 'true') {
                    this.parentNode.dataset.top = false;
                    // 投票
                    browser.runtime.sendMessage({
                        command : TwitSideModule.COMMAND.COLUMN_OPE,
                        action : TwitSideModule.COMMAND.TL_VOTE,
                        columnindex : $(this).index(),
                        win_type : TwitSideModule.WINDOW_TYPE.MAIN,
                        vote : false
                    });
                }
                // オートページャ
                if (this.scrollHeight - this.clientHeight - 200 < this.scrollTop
                    && getPref('autopager')
                    && this.parentNode.dataset.more == '') {
                    // 重複読み込み防止
                    this.parentNode.dataset.more = true;
                    loadMore(this.lastChild);
                }
            }
        });
    // カラムタブ
    $('#columnTabContainer')
        .mousemove(scrollColumnTabC)
        .hover(hoverColumnTabC, unhoverColumnTabC)
        .on('mouseenter', '.columnTab', hoverColumnTab)
        .on('mouseout', '.columnTab', function() {
            UI.$columnTabC.find('.columnTab').removeClass('hoverTab');
        })
        .on('click', '.columnTab', function(ptr) {
            var idx = $(this).index();
            UI.setActiveColumn(UI.$columnC.children().eq(idx));
            scrollColumns(idx, true, ptr);
        });
    // ファイル選択
    $('#filepicker')
        .on('change', function() {
            pickedFile(this);
        });
    // ファイルキャンセル
    $('#pictureThumbnails')
        .on('click', '> div', function() {
            cancelFile(this);
        });
    // グレーアウト
    $('#grayout').on('click', () => {
        leftContainerToggle(false);
        notifContainerToggle(false);
    });
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {

    case 'openLeftC': // topMenuContainer
        leftContainerToggle(true);
        break;
    case 'openNewTweetC':
        newTweetContainerToggle(true, false);
        break;
    case 'sharePicture': // newTweetContainer
        openFile();
        break;
    case 'sharePage':
        sharePage();
        break;
    case 'unpinNewTweetC':
        newTweetContainerToggle(false, false);
        break;
    case 'pinNewTweetC':
        newTweetContainerToggle(true, true);
        break;
    case 'closeNewTweetC':
        newTweetContainerToggle(false, false);
        break;
    case 'tweetButton':
        sendTweet();
        break;
    case 'clearRefButton':
        clearTweetRef();
        break;
    case 'closeLeftC': // leftContainer
        leftContainerToggle(false);
        break;
    case 'openNotifC':
        notifContainerToggle(true);
        break;
    case 'menuProfile':
        leftContainerToggle(false);
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                      action : TwitSideModule.COMMAND.USER_GETINFO,
                                      userid : UI.$tweetUserSelection[0].selectedOptions[0].value,
                                      key : null })
            .then(openProfileWin);
        break;
    case 'menuSearch':
        leftContainerToggle(false);
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                      action : TwitSideModule.COMMAND.USER_GETINFO,
                                      userid : UI.$tweetUserSelection[0].selectedOptions[0].value,
                                      key : null })
            .then(openSearchWin);
        break;
    case 'menuLogin':
        leftContainerToggle(false);
        newUserContainerToggle(true);
        break;
    case 'menuManageColumns':
        leftContainerToggle(false);
        openColumnsWin();
        break;
    case 'menuPreferences':
        leftContainerToggle(false);
        browser.runtime.openOptionsPage();
        break;
    case 'menuHelp':
        leftContainerToggle(false);
        openURL(HELP_URL);
        break;
    case 'menuLogout':
        leftContainerToggle(false);
        onClickLogout();
        break;
    case 'closeNotifC': // notifContainer
        notifContainerToggle(false);
        break;
    case 'clearNotif':
        clearNotifications();
        break;
    case 'clearNotifNext':
        clearNotificationsNext();
        break;
    case 'closeNewUserC': // newUserContainer
        newUserContainerToggle(false);
        break;
    case 'request':
        onClickRequest();
        break;
    case 'access':
        onClickAccess();
        break;
        //    case '':
        //        break;
    }

    // identify from class
    switch (true) {
    case btn.classList.contains('menuProfileItem'):
        leftContainerToggle(false);
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                      action : TwitSideModule.COMMAND.USER_GETINFO,
                                      userid : btn.dataset.userid,
                                      key : null })
            .then((userinfo) => {
                openProfileWin(userinfo, btn.dataset.screenname);
            });
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
    case btn.classList.contains('stopStreamButton'):
        stopStream(getColumnIndexFromBox(btn));
        break;
    case btn.classList.contains('newListButton'):
        break;
    case btn.classList.contains('newDmButton'):
        openNewdmWin(UI.getActiveColumn().attr('data-userid'), '');
        break;
    case btn.classList.contains('addColumnButton'):
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

function runTutorial()
{
    leftContainerToggle(true);
    $('#menuHelp').addClass('blink')
        .delay(6000).queue( function() {
            $(this).removeClass('blink');
        });

    setPref('tutorial', false);
}


/**
 * Panel operation
 */
function leftContainerToggle(open)
{
    $('#leftContainer')[0].dataset.open = open;
    $('#grayout').toggleClass('hidden', !open);
}

function notifContainerToggle(open)
{
    $('#notifContainer')[0].dataset.open = open;
    $('#leftContainer')[0].dataset.open = false;
    $('#grayout').toggleClass('hidden', !open);
}

function newTweetContainerToggle(open, pin)
{
    var pinned = getPref('newtweet_pinned');

    // ピン留め指定
    if (pin != null) {
        $('body')[0].dataset.newtweetPinned = pin;
        if (pinned != pin) {
            setPref('newtweet_pinned', pin);
            pinned = pin;
        }
    }
    pinned
        ? $('#newTweetContainer')[0].dataset.open = true
        : $('#newTweetContainer')[0].dataset.open = open;

    if (open) $('#newTweet').focus();
}

function newUserContainerToggle(open)
{
    $('#newUserContainer')[0].dataset.open = open;
    if (!open) {
        // Clear temporary value
        oauth_token = null;
        $('#pin').val('');
        checkPinBox();
    }
}


/**
 * Posting tweet operation
 */
// 新規ツイート文字数カウント
function countNewTweet(e)
{
    var $suggest = $('#suggestContainer');
    if (e) e = e.originalEvent;

    // TODO:configurationを取得
    var warn = 20;
    var $newTweetCount = $('#newTweetCount'),
        $newTweet = $('#newTweet'),
        $tweetButton = $('#tweetButton'),
        count = twttr.txt.getTweetLength($newTweet.val());

    // URL
    var urls = twttr.txt.extractUrls($newTweet.val());
    $('#tinyUrlEnabled').attr('data-enabled', urls.length ? 'true' : 'false');
    // 画像
    $('#imageEnabled').attr('data-enabled', $('#pictureThumbnails').children().length ? 'true' : 'false');

    // 文字数
    $newTweetCount.text(TWEET_MAX_LENGTH - count);
    if (count > TWEET_MAX_LENGTH) {
        $newTweetCount.attr('data-labelcolor', 'countNg');
        $tweetButton.attr('data-disabled', 'true');
    }
    else if (count > TWEET_MAX_LENGTH - warn) {
        $newTweetCount.attr('data-labelcolor', 'countWarn');
        $tweetButton.attr('data-disabled', 'false');
    }
    else if (count > 0) {
        $newTweetCount.attr('data-labelcolor', 'countOk');
        $tweetButton.attr('data-disabled', 'false');
    }
    else {
        $newTweetCount.attr('data-labelcolor', 'countOk');
        if ($newTweet.attr('data-reply-id') == ''
            && $newTweet.attr('data-attachment-url') == ''
            && $('#pictureThumbnails').children().length == 0)
            $tweetButton.attr('data-disabled', 'true');
        else
            $tweetButton.attr('data-disabled', 'false');
    }

    suggestScreenname($newTweet, $suggest);
    return false;
}

function keypressNewTweet(e)
{
    e = e.originalEvent;
    // サジェスト
    if (e && !e.shiftKey && e.key == 'Tab'
        || e && e.key == 'ArrowDown') {
        if ($('#suggestContainer').is(':visible')) {
            setTimeout(() => {$('#suggestContainer').focus(); }, 0);
            return false;
        }
    }

    // ツイート
    else if (e && e.ctrlKey && e.key == 'Enter') {
        if ($('#tweetButton').attr('data-disabled') == 'false') {
            if (getPref('confirm_tweet')
                && !confirm(browser.i18n.getMessage('confirmTweet'))) return true;

            sendTweet();
        }
    }
    return true;
}

// ツイート送信
function sendTweet()
{
    var userid = UI.$tweetUserSelection[0].selectedOptions[0].value,
        button = $('#tweetButton')[0],
        $newTweet = $('#newTweet');

    var optionsHash = { status : $newTweet.val() };

    // 返信
    if ($newTweet.attr('data-reply-id')) {
        optionsHash.in_reply_to_status_id = $newTweet.attr('data-reply-id');
        optionsHash.auto_populate_reply_metadata = true;
        // 返信除外
        let noreply = [];
        $('#replyUsersSelection').children('.replyUser[data-reply="false"]').each(function() {
            noreply.push(this.dataset.userid);
        });
        optionsHash.exclude_reply_user_ids = noreply.join(',');
    }
    // 引用
    if ($newTweet.attr('data-attachment-url')) {
        optionsHash.attachment_url = $newTweet.attr('data-attachment-url');
    }
    // 画像
    else if ($('#pictureThumbnails').children().length)
        optionsHash.file0 = $('#pictureThumbnails').children()[0].file;

    button.dataset.disabled = true;
    // 通常ツイート
    if (!optionsHash.file0)
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                      action : TwitSideModule.COMMAND.TWEET_TWEET,
                                      userid : userid,
                                      options : optionsHash })
        .then(callback).catch(error);
    else
        browser.windows.getCurrent()
        .then((win) => {
            // 画像付きツイート
            return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                                 action : TwitSideModule.COMMAND.TWEET_TWEET_MEDIA,
                                                 userid : userid,
                                                 options : optionsHash,
                                                 win_type : TwitSideModule.WINDOW_TYPE.MAIN,
                                                 id : win.id }); })
        .then(callback).catch(error);

    function callback(result)
    {
        showProgressbar(100);
        UI.showMessage(result.message);
        $newTweet.val('');
        countNewTweet();
        cancelAllFile();
        clearTweetRef();
        newTweetContainerToggle(false);

        // ツイート後ツイートユーザタイムライン読み込み
        if (getPref('autoreload_aftertweet')) {
            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                          action : TwitSideModule.COMMAND.COLUMN_SEARCH,
                                          win_type : TwitSideModule.WINDOW_TYPE.MAIN,
                                          query_hash : { userid : userid,
                                                         tl_type : TwitSideModule.TL_TYPE.TIMELINE,
                                                         streaming : false }
                                        })
                .then((indexes) => {
                    for (let i of indexes) {
                        if (UI.$columnC.children().eq(i).find('.stopStreamButton')
                            .attr('data-disabled') != 'false')
                            loadNewer(i);
                    }
                });
        }
    }
    function error(result)
    {
        showProgressbar(100);
        button.dataset.disabled = false;
        UI.showMessage(result.message);
    }
}

function openFile()
{
    $('#filepicker').click();
}

function pickedFile(filepicker)
{
    if (!filepicker.files.length) return;
    var $thumbnails = $('#pictureThumbnails');

    var url = URL.createObjectURL(filepicker.files[0]);
    $('<div tabindex="1" />').css('background-image', 'url(' + url + ')')
        .appendTo($thumbnails)[0].file = filepicker.files[0];

    URL.revokeObjectURL(filepicker.files[0]);
    filepicker.value = null;

    if ($thumbnails.children().length >= MAX_PICS)
        $('#sharePicture').attr('data-disabled', 'true');
    countNewTweet();
}

function cancelFile(file)
{
    $('#sharePicture').attr('data-disabled', 'false');
    $(file).remove();
    countNewTweet();
}

function cancelAllFile()
{
    $('#sharePicture').attr('data-disabled', 'false');
    $('#pictureThumbnails').empty();
    countNewTweet();
}

function sharePage()
{
    var $newTweet = $('#newTweet');

    browser.tabs.query({ active : true }).then((tabs) => {
        newTweetContainerToggle(true);
        $newTweet.val(tabs[0].title + '\n' + tabs[0].url);
        $newTweet.focus();
        $newTweet[0].setSelectionRange(0, 0);
    });
}

function toggleReplyUser(e)
{
    var user = e.target;
    user.dataset.reply = user.dataset.reply == 'false';
}

// 返信・引用ツイート非表示
function clearTweetRef()
{
    $('#replyUsersSelection, #refTweetBox').empty();
    $('#refTweetContainer').attr('data-type', '');
    $('#newTweet').attr({
        'data-attachment-url' : '',
        'data-reply-id' : ''
    });
    countNewTweet();
}


/**
 * Column operation
 */
// visible column index
function getColumnIndex()
{
    var ret = [],
        // 一画面に表示するカラム数
        count = parseInt(UI.$columnC.attr('data-count'));

    for (let i=0; i<count; i++)
        ret.push(parseInt(UI.$columnC.attr('data-first')) + i);

    return ret;
}

// scroll snap
function scrollColumns(index_int, edge, ptr)
{
    UI.$mainC.stop(true, true);
    var now = UI.$mainC.scrollLeft(),
        $columns = UI.$columnC.children(),
        count = $columns.length,
        columnsCount = parseInt(UI.$columnC.attr('data-count')),
        left = 0,
        right = null;

    // index_intの値がおかしい場合
    if (index_int
        && (index_int < 0 || index_int >= count))
        return;

    // 自動スクロールイベント（スクロールの最後に必ず実行される）
    if (index_int == null) {
        let start = 0;
        for (start; start < count; start++) {
            let offsetleft = $columns.eq(start).position().left + now;
            now >= offsetleft
                ? left = offsetleft
                : right = offsetleft;
            if (right) break;
        }
        // 右端
        if (right == null) right = left;
        // 右移動
        if (now - left > right - now) left = right;
        // 左移動
        else start--;

        // 移動後カラムタブ
        UI.$columnC.attr('data-first', start);
        colorColumnTab();
        // 移動
        UI.$mainC.animate(
            { scrollLeft : left },
            200, 'swing', function() {
                // 移動後のフォーカス
                let focus = changeFocusIndex();
                if (focus >= 0) {
                    UI.getActiveBox(UI.$columnC.children().eq(focus)).focus();
                }
                else {
                    UI.getActiveBox().focus();
                }
            }
        );
    }
    // 移動先指定（移動必要）
    else {
        if (edge)
            left = $columns.eq(index_int).position().left + now;
        else if (getColumnIndex().indexOf(index_int) < 0) {
            left = $columns.eq(
                index_int < getColumnIndex()[0]
                    ? index_int
                    : index_int - columnsCount + 1
            ).position().left + now;
        }
        // 移動無し、フォーカスのみ
        else {
            UI.getActiveBox().focus();
            return;
        }
        // 移動
        UI.$mainC.animate(
            {scrollLeft : left},
            100, 'swing')
            .queue(function() {
                // カラムタブクリック時
                if (ptr && UI.$columnTabC.attr('data-hover') == 'true') scrollColumnTabC(ptr);
            });
    }

    function changeFocusIndex()
    {
        var columnIndexes = getColumnIndex();
        // より左
        if (UI.getActiveColumn().index() < columnIndexes[0])
            return columnIndexes[0];
        // より右
        else if (UI.getActiveColumn().index() > columnIndexes[columnIndexes.length - 1])
            return columnIndexes[columnIndexes.length - 1];
        // 表示内
        else return -1;
    }
}

// Adjust column's width
function calcColumns()
{
    var winWidth = window.innerWidth,
        minWidth = getPref('column_minwidth'),
        count = Math.floor(winWidth / minWidth),
        len = UI.$columnC.children().length;

    if (count < 1) count = 1;
    if (count > len) count = len;
    // タイムラインコンテナ＋カラムタブの幅
    //    UI.$mainC.css('scroll-snap-points-x', 'repeat( calc( 100vw / ' + count + ' )' );
    UI.$columnC.attr('data-count', count)
        .children().css('width', 'calc(100vw / ' + count + ')');
    UI.$columnTabC.children().css('width', 'calc(100vw / ' + count + ' - '
                                  + COLUMN_TAB_MARGIN + 'px )');
}

function hoverColumnTabC()
{
    if (UI.$columnTabC.timer) clearTimeout(UI.$columnTabC.timer);
    if (UI.$columnTabC[0].dataset.hover == 'true') return;

    UI.$columnTabC.timer = setTimeout(function() {
        // 動作中アニメーション停止
        if (UI.$columnTabC[0].style.transition != '')
            UI.$columnTabC.off('transitionend')
            .css({ transition : '' });

        var count = UI.$columnTabC.children().length,
            winWidth = window.innerWidth,
            tabWidth = COLUMN_TAB_WIDTH - COLUMN_TAB_MARGIN,
            tabCWidth = COLUMN_TAB_WIDTH * count;

        // ウィンドウが大きいときは等分
        if (winWidth > count * COLUMN_TAB_WIDTH) {
            tabWidth = winWidth / count - COLUMN_TAB_MARGIN;
            tabCWidth = winWidth;
        }
        // 画面上の位置を固定
        UI.$columnC.css('margin-top', UI.$columnTabC.height());
        UI.$columnTabC.attr('data-hover', true)
            .css({ width : tabCWidth,
                   position : 'fixed' })
            .children().css({ width : tabWidth });
    }, 200);
}

function unhoverColumnTabC()
{
    if (UI.$columnTabC.timer) clearTimeout(UI.$columnTabC.timer);
    if (UI.$columnTabC[0].dataset.hover != 'true') return;
    UI.$columnTabC.timer = setTimeout(function() {
        // 一旦margin-leftを調整
        UI.$columnTabC.attr('data-hover', false)
            .css({ width : '',
                   transition : '' });
        // タブ幅を戻す
        setTimeout(function() {
            UI.$columnTabC.css({ transition : 'margin-left 0.4s ease 0s',
                                 marginLeft : -1 * $('#mainContainer').scrollLeft() })
                .on('transitionend', function() {
                    $(this).css({ transition : '',
                                  position : '',
                                  marginLeft : 0 })
                        .off('transitionend');
                    // 画面上の位置固定を解除
                    UI.$columnC.css('margin-top', 0);
                    // カラムタブ初期化
                    calcColumns();
                })
                .children().css({ width : UI.$columnC.children().width() - COLUMN_TAB_MARGIN });
        }, 0);
    }, 600);
}

// adjust margin-left on mouse hovering
function scrollColumnTabC(ptr)
{
    var count = UI.$columnTabC.children().length,
        winWidth = window.innerWidth,
        tabWidth = COLUMN_TAB_WIDTH - COLUMN_TAB_MARGIN,
        tabCWidth = COLUMN_TAB_WIDTH * count,
        margin = 0;

    // ウィンドウの方が大きい
    if (winWidth > count * COLUMN_TAB_WIDTH) {
        tabWidth = winWidth / count - COLUMN_TAB_MARGIN;
        tabCWidth = winWidth;
        margin = 0;
    }
    // タブの方が大きい
    else
        margin = (ptr.clientX + 1) * (winWidth - tabCWidth) / winWidth;
    if (UI.$columnTabC[0].dataset.hover == 'true')
        UI.$columnTabC.css({ marginLeft : margin });
}

// color hovering column tab
function hoverColumnTab()
{
    var $tab = $(this),
        columnsCount = parseInt(UI.$columnC.attr('data-count')),
        count = UI.$columnC.children().length,
        index = parseInt($tab.index());

    UI.$columnTabC.children().removeClass('hoverTab');
    // マウス位置が表示カラムタブ左端よりも左側
    if (index + columnsCount < count) {
        for (let i=index; i<index+columnsCount; i++)
            UI.$columnTabC.children().eq(i).addClass('hoverTab');
    }
    // マウス位置が表示カラムタブ左端よりも右側
    else {
        for (let i=-1; i>-1-columnsCount; i--)
            UI.$columnTabC.children().eq(i).addClass('hoverTab');
    }
}

// カラムタブの色（現在表示中）
function colorColumnTab()
{
    // 表示中のカラム番号一覧
    var indexes = getColumnIndex();

    UI.$columnTabC.children().removeClass('displayTab');
    for (let i=0; i<indexes.length; i++) {
        UI.$columnTabC.children().eq(indexes[i]).addClass('displayTab');
    }
}


/**
 * Tweet operation
 */
// change screenname list
function changeTweetUser(userid)
{
    // userid未指定
    if (userid == null) userid = UI.getActiveColumn().attr('data-userid');
    UI.$tweetUserSelection.select2('val', [userid]);
}


/**
 * Authorization
 */
function onClickRequest()
{
    // リクエスト送信
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                  action : TwitSideModule.COMMAND.TWEET_REQUEST })
        .then((result) => {
            // store tokens
            oauth_token = result.userinfo;
            openURL(result.url);
        }).catch((result) => {
            UI.showMessage(result.message, result.text_flag);
        });
}

function onClickAccess()
{
    var $pin = $('#pin'),
        oauth_hash;

    if ($pin.val().length != 7) {
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.MSG_OPE,
                                      action : TwitSideModule.COMMAND.MSG_TRANSMSG,
                                      error : 'enterPinNumber' })
            .then((result) => { UI.showMessage(result); });
        return;
    }

    // アクセス送信
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                  action : TwitSideModule.COMMAND.TWEET_ACCESS,
                                  oauth_token : oauth_token,
                                  pin : $pin.val() })
        .then((result) => {
            oauth_hash = result;
            newUserContainerToggle(false);

            // ユーザー作成
            return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                                 action : TwitSideModule.COMMAND.USER_ADD,
                                                 oauth_hash : oauth_hash });
        })
        .then(() => {
            return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                                 action : TwitSideModule.COMMAND.USER_COUNT });
        })
        .then(async (result) => {
            // 1ユーザ目：初期カラム作成（3つ）
            if (result == 1) {
                await browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.COLUMN_OPE,
                      action : TwitSideModule.COMMAND.COLUMN_ADD,
                      tl_type : TwitSideModule.TL_TYPE.TIMELINE,
                      columnlabel : browser.i18n.getMessage('defaultTimeline')
                      + ' (@' + oauth_hash.screen_name + ')',
                      userid : oauth_hash.user_id,
                      options : { onstart : true,
                                  autoreload : false,
                                  stream : true,
                                  notif : true,
                                  veil : false },
                      parameters : null });
                await  browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.COLUMN_OPE,
                      action : TwitSideModule.COMMAND.COLUMN_ADD,
                      tl_type : TwitSideModule.TL_TYPE.CONNECT,
                      columnlabel : browser.i18n.getMessage('defaultConnect')
                      + ' (@' + oauth_hash.screen_name + ')',
                      userid : oauth_hash.user_id,
                      options : { onstart : true,
                                  autoreload : true,
                                  stream : false,
                                  notif : false,
                                  veil : false },
                      parameters : null });
                await browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.COLUMN_OPE,
                      action : TwitSideModule.COMMAND.COLUMN_ADD,
                      tl_type : TwitSideModule.TL_TYPE.RETWEETED,
                      columnlabel : browser.i18n.getMessage('defaultRetweeted')
                      + ' (@' + oauth_hash.screen_name + ')',
                      userid : oauth_hash.user_id,
                      options : { onstart : true,
                                  autoreload : true,
                                  stream: false,
                                  notif : false,
                                  veil : false },
                      parameters : null });
            }
            // 2ユーザ目以降：タイムラインカラムのみ作成
            else {
                await browser.runtime.sendMessage(
                    { command : TwitSideModule.COMMAND.COLUMN_OPE,
                      action : TwitSideModule.COMMAND.COLUMN_ADD,
                      tl_type : TwitSideModule.TL_TYPE.TIMELINE,
                      columnlabel : browser.i18n.getMessage('defaultTimeline')
                      + ' (@' + oauth_hash.screen_name + ')',
                      userid : oauth_hash.user_id,
                      options : { onstart : true,
                                  autoreload : false,
                                  stream : true,
                                  notif : true,
                                  veil : false },
                      parameters : null });
            }
        }).catch((result) => {
            UI.showMessage(result.message, result.text_flag);
        });
}

function checkPinBox()
{
    $('#access')[0].dataset.disabled =
        oauth_token != null && $('#pin').val().length == 7
        ? false : true;
}

// All users logout
function onClickLogout()
{
    if (!confirm(browser.i18n.getMessage('confirmLogout'))) return;

    // ユーザも一緒にリセット
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_RESET,
                                  win_type : TwitSideModule.WINDOW_TYPE.MAIN });

    // ログイン画面
    newUserContainerToggle(true);
}


/**
 * Notification
 */
// Get notifications
function updateNotifications(unread, count, notifs)
{
    var $notifList = $('#notifItemList'),
        $notifTemplate = $('#templateContainer .notifItem'),
        $clearButton = $('#clearNotif'),
        $nextButton = $('#clearNotifNext');

    readNotifications(unread, count);

    // 通知クリア
    $notifList.children().remove();

    // 通知情報
    for (let notifid in notifs.data) {
        let $notif = $notifTemplate.clone().attr('id', notifid),
            userinfo = notifs.data[notifid].userinfo;

        // from Twit Side
        if (notifs.data[notifid].userid == '-1') {
            $notif.children('.neverNotifyButton')
                .attr('data-notifid', notifs.data[notifid].id)
                .on('click keypress', function() {
                    neverNotify(this.dataset.notifid);
                });
            $notif.find('.notifUserName').text(userinfo.screen_name);
            let $notifUrl = $notif.children('.notifUrl');
            for (let url of notifs.data[notifid].urls)
                $('<div />').addClass('text-link')
                .attr('href', url).text(url).appendTo($notifUrl);
        }
        else
            $notif.find('.notifUserName').text('@' + userinfo.screen_name);

        $notif.find('.notifUserImage').attr('src', userinfo.profile_image_url);
        $notif.children('.notifTitle').text(notifs.data[notifid].title);
        $notif.children('.notifContent').text(notifs.data[notifid].content);
        $notif.children('.notifTime').text(notifs.data[notifid].datetime);

        $notif.on('click keypress', function() { clearNotifications(this); })
            .appendTo($notifList);
    }

    // 通知削除
    $clearButton.text(count
                      ? browser.i18n.getMessage('clear_notif')
                      : browser.i18n.getMessage('no_notif'));

    // 通知続き
    $nextButton.text(browser.i18n.getMessage('clear_notif_next', notifs.count));
    $nextButton.css('display', notifs.next ? '' : 'none');

    // 通知件数0の時
    if (count == 0 && $('#notifContainer').attr('data-open') == 'true')
        notifContainerToggle(false);
}

// read notifications
function readNotifications(unread, count)
{
    document.documentElement.dataset.unreadNotif = unread;
    $('#openLeftC .badge').text(count);
}

// clear specific / all notifications
function clearNotifications(notifItem)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.MSG_OPE,
                                  action : TwitSideModule.COMMAND.MSG_REMOVE,
                                  ids : notifItem ? [notifItem.id] : null });
}

// clear displayed notifications and show continuations
function clearNotificationsNext()
{
    var notifIds = [];
    $('#notifItemList').children().each(
        function() { notifIds.push(this.id); }
    );

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.MSG_OPE,
                                  action : TwitSideModule.COMMAND.MSG_REMOVE,
                                  ids : notifIds });
}

// never notify a message from Twit Side
function neverNotify(notifid)
{
    var hidden_message = JSON.parse(getPref('hidden_message'));
    if (hidden_message.indexOf(notifid) >= 0) return;

    hidden_message.push(parseInt(notifid));

    setPref('hidden_message', JSON.stringify(hidden_message));
}
