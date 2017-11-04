/**
 * @fileOverview newdm content script
 * @name newdm.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'newdm',
      TWEET_MAX_LENGTH = 10000;

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
                                      action : TwitSideModule.COMMAND.CONFIG_LOAD }),
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                      action : TwitSideModule.COMMAND.USER_GETINFO,
                                      userid : null, key : null })
    ]).then(([win, p, all_userinfo]) => {
        prefs = p;
        winid = win.id;
        // オブザーバー開始
        myport = browser.runtime.connect({ name : win.id.toString() });
        myport.onMessage.addListener(UI.observer);

        // UI初期化
        UI.setStyleSheets();

        // ツイートユーザ一覧
        for (let userid in all_userinfo) {
            let userinfo = all_userinfo[userid],
                $useroption = $('#templateContainer .tweetUserOption').clone(),
                $tweetUserSelection = $('#tweetUserSelection');

            $useroption.val(userinfo.user_id)
                .text('@' + userinfo.screen_name)
                .attr('data-image', userinfo.profile_image_url)
                .appendTo($tweetUserSelection);
        }

        // ドロップダウンメニュー
        $('#tweetUserSelection').select2({
            minimumResultsForSearch : Infinity,
            width : 'off',
            templateSelection : function(state) {
                var $i = $('<img class="tweetUserItemImage" />')
                    .attr('src', state.element.dataset.image),
                    $l = $('<span />').text(state.text);
                return $('<span class="tweetUserItemBox" />').append($i, $l);
            }
        });

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
    // 宛先
    $('#recipientScreenname')
        .on('keyup focus', keyupRecipient)
        .on('keypress', keypressRecipient);
    $('#suggestContainer')
        .on('click', 'option', function() {
            suggestOnSelect(false, $('#recipientScreenname'), $('#suggestContainer'));
            return false;
        })
        .on('focus', 'option', function(e) {
            $(this).parent().focus();
            return false;
        })
        .on('keydown', function(e) {
            suggestOnSelect(e, $('#recipientScreenname'), $('#suggestContainer'), $('#newTweet'));
            return false;
        });
    // 入力ボックス
    $('#newTweet')
        .on('keyup focus', countNewTweet)
        .on('keypress', keypressNewTweet);
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {
    case 'tweetButton':
        sendTweet();
        break;
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
function initialize()
{
    var $photoContainer = $('#photoContainer');

    // 初期化
    $photoContainer.empty()
        .attr('data-active-photo', 0);

    // 写真を追加
    for (let i=0; i<photos.length; i++) {
        let $box = $('<video />');
        // 写真
        $box.addClass('photo')
            .attr('poster', photos[i].urls.rawurl);
        // 動画
        if (photos[i].urls.variants) {
            for (let source of photos[i].urls.variants) {
                let $video =  $('<source />')
                    .attr({ src : source.url,
                            type : source.content_type })
                    .appendTo($box);
            }
            $box.addClass('video')
                .attr({ preload : 'auto',
                        loop : 'loop',
                        controls : 'contols',
                        muted : 'muted' });
        }
        $box.appendTo($photoContainer);
    }
}


/**
 * Posting tweet operation
 */
// 新規ツイート文字数カウント
function countNewTweet(e)
{
    if (e) e = e.originalEvent;

    var warn = 20;
    var $newTweetCount = $('#newTweetCount'),
        $newTweet = $('#newTweet'),
        $tweetButton = $('#tweetButton'),
        count = twttr.txt.getTweetLength($newTweet.val());

    // URL
    var urls = twttr.txt.extractUrls($newTweet.val());

    // 文字数
    $newTweetCount.text((TWEET_MAX_LENGTH - count).toString() + '/' + TWEET_MAX_LENGTH);
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
        $tweetButton.attr('data-disabled', 'false');
    }

    return false;
}

function keypressNewTweet(e)
{
    e = e.originalEvent;
    // ツイート
    if (e && e.ctrlKey && e.key == 'Enter') {
        if ($('#tweetButton').attr('data-disabled') == 'false') {
            if (getPref('confirm_tweet')
                && !confirm(browser.i18n.getMessage('confirmMessage'))) return true;

            sendTweet();
        }
    }
    return true;
}

function keyupRecipient(e)
{
    suggestScreenname($('#recipientScreenname'), $('#suggestContainer'));
}

function keypressRecipient(e)
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
    return true;
}


// メッセージ送信
function sendTweet()
{
    var userid = $('#tweetUserSelection')[0].selectedOptions[0].value,
        button = $('#tweetButton')[0],
        $newTweet = $('#newTweet');

    // tweet
    var optionsHash = {
        screen_name : $('#recipientScreenname').val(),
        text : $('#newTweet').val()
    };

    button.dataset.disabled = true;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                  action : TwitSideModule.COMMAND.TWEET_SENDDM,
                                  userid : userid,
                                  options : optionsHash })
        .then(callback).catch(error);

    function callback(result)
    {
        showProgressbar(100);
        UI.showMessage(result.message);
        $newTweet.val('');
        countNewTweet();
    }
    function error(result)
    {
        showProgressbar(100);
        button.dataset.disabled = false;
        UI.showMessage(result.message);
    }
}


/**
 * Tweet operation
 */
// change screenname list
function changeTweetUser(userid)
{
    $('#tweetUserSelection').select2('val', [userid]);
}
