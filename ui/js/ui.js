/**
 * @fileOverview UI operation
 * @name ui.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

/**
 * 全ウィンドウ向け変数
 */
var UI = {
    _initialized : false,
    _win_type : null,
    $Activecolumn : null,

    tweetMenuFuncList : {
        retweet :            function(obj) { onClickRetweet($(obj).closest('.tweetBox')[0]); },
        quote :              function(obj) { onClickQuote($(obj).closest('.tweetBox')[0]); },
        rt :                 function(obj) { onClickRt($(obj).closest('.tweetBox')[0]); },
        showtext :           function(obj) { onClickShowtext($(obj).closest('.tweetBox')[0]); },
        opentweeturl :       function(obj) { onClickOpentweeturl($(obj).closest('.tweetBox')[0]); },
        reply :              function(obj) { onClickReply($(obj).closest('.tweetBox')[0]); },
        replyall :           function(obj) { onClickReplyall($(obj).closest('.tweetBox')[0]); },
        favorite :           function(obj) { onClickFavorite($(obj).closest('.tweetBox')[0]); },
        showreply :          function(obj) { onClickShowreply($(obj).closest('.tweetBox')[0]); },
        destroy :            function(obj) { onClickDestroy($(obj).closest('.tweetBox')[0]); },
        showretweetedusers : function(obj) { onClickShowretweetedusers($(obj).closest('.tweetBox')[0]); },
        replydm :            function(obj) { onClickReplydm($(obj).closest('.tweetBox')[0]); },
        destroyuser :        function(obj) { onClickDestroyUser($(obj).closest('.tweetBox')[0]); },
        updatelist :         function(obj) { onClickEditList($(obj).closest('.tweetBox')[0]); },
        showmembers :        function(obj) { onClickShowMembers($(obj).closest('.tweetBox')[0]); },
        showsubscribers :    function(obj) { onClickShowSubscribers($(obj).closest('.tweetBox')[0]); },
        subscribe :          function(obj) { onClickSubscribe($(obj).closest('.tweetBox')[0]); },
        unsubscribe :        function(obj) { onClickUnsubscribe($(obj).closest('.tweetBox')[0]); },
        addlist2column :     function(obj) { onClickAddList2Column($(obj).closest('.tweetBox')[0]); }
    },

    get initialized()
    {
        return this._initialized;
    },

    initialize : function(win_type)
    {
        this._win_type = win_type;
        this.setStyleSheets();

        switch (win_type) {
        case TwitSideModule.WINDOW_TYPE.MAIN:
            // テンプレート
            this.$tweetUserTemplate = $('#templateContainer .tweetUserOption');
            this.$menuItemTemplate = $('#templateContainer .menuProfileItem');
            // コンテナ
            this.$tweetUserSelection = $('#tweetUserSelection');
            this.$leftC = $('#leftContainer');
            this.$leftCmenuList = $('#leftContainer .menuList');
            break;
        case TwitSideModule.WINDOW_TYPE.PROFILE:
            // テンプレート
            this.$friendTemplate = $('#templateFriendBox');
            break;
        case TwitSideModule.WINDOW_TYPE.SEARCH:
            break;
        case TwitSideModule.WINDOW_TYPE.MUTE:
        case TwitSideModule.WINDOW_TYPE.NORETWEET:
            // テンプレート
            this.$tweetUserTemplate = $('#templateContainer .tweetUserOption');
            // コンテナ
            this.$tweetUserSelection = $('#tweetUserSelection');
        case TwitSideModule.WINDOW_TYPE.LISTMEMBER:
            // テンプレート
            this.$tweetUserTemplate = $('#templateContainer .tweetUserOption');
            break;
        }

        // 共通テンプレート
        this.$tweetBoxTemplate = $('#templateContainer .tweetBox');
        this.$tweetMoreBoxTemplate = $('#templateContainer .tweetMoreBox');
        this.$columnTabTemplate = $('#templateContainer .columnTab');
        this.$columnTemplate = $('#templateContainer .column');
        // 共通コンテナ
        this.$mainC = $('#mainContainer'); // 横スクロール
        this.$columnC = $('#columnContainer');
        this.$columnTabC = $('#columnTabContainer');

        // 右クリックメニュー
        $.contextMenu({
            selector : '.tweetBox',
            zindex : 10,
            build : function($trigger, e) {
                return {
                    callback : function(key, options) {
                        UI.tweetMenuFuncList[key]($trigger);
                    },
                    items : $trigger[0].contextMenuItems
                };
            }});

        // 初期化済
        this._initialized = true;

        // 初期UI作成
        switch (win_type) {
        case TwitSideModule.WINDOW_TYPE.MAIN:
            // カラムを左端へ初期化
            this.$mainC.scrollLeft(0);
            // ドロップダウンメニュー
            this.$tweetUserSelection.select2({
                minimumResultsForSearch : Infinity,
                width : 'off',
                templateSelection : function(state) {
                    var $i = $('<img class="tweetUserItemImage" />')
                        .attr('src', state.element.dataset.image),
                        $l = $('<span />').text(state.text);
                    return $('<span class="tweetUserItemBox" />').append($i, $l);
                }
            });

            // ツイートユーザ
            return Promise.all([
                browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                              action : TwitSideModule.COMMAND.USER_GETINFO,
                                              userid : null, key : null }),
                browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                              action : TwitSideModule.COMMAND.COLUMN_GETTLINFO,
                                              columnindex : null, key : null, win_type : null }),
                browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                              action : TwitSideModule.COMMAND.COLUMN_GETCOLINFO,
                                              columnindex : null, key : null, win_type : null })
            ]).then(([all_userinfo, all_tlinfo, all_colinfo]) => {
                for (let userid in all_userinfo) {
                    this._makeTweetUser(all_userinfo[userid]);
                }
                // カラム
                for (let columnidx in all_tlinfo) {
                    this._makeColumn(
                        all_tlinfo[columnidx].id,
                        all_colinfo[columnidx],
                        columnidx
                    );
                    // タイムラインの状態からボタンとプログレスバー
                    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                                  action : TwitSideModule.COMMAND.TL_RENOTIFYSTATUS,
                                                  columnindex : columnidx,
                                                  win_type : this._win_type });
                    }
                // 通知取得
                browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.MSG_OPE,
                                              action : TwitSideModule.COMMAND.MSG_RELOAD });
                });
            break;

        case TwitSideModule.WINDOW_TYPE.MUTE:
        case TwitSideModule.WINDOW_TYPE.NORETWEET:
            // ドロップダウンメニュー
            this.$tweetUserSelection.select2({
                minimumResultsForSearch : Infinity,
                width : 'off',
                templateSelection : function(state) {
                    var $i = $('<img class="tweetUserItemImage" />')
                        .attr('src', state.element.dataset.image),
                        $l = $('<span />').text(state.text);
                    return $('<span class="tweetUserItemBox" />').append($i, $l);
                }
            });

            // ツイートユーザ
            return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                                 action : TwitSideModule.COMMAND.USER_GETINFO,
                                                 userid : null, key : null })
                .then((all_userinfo) => {
                    for (let userid in all_userinfo) {
                        let userinfo = all_userinfo[userid];

                        $('#templateContainer .tweetUserOption').clone()
                            .val(userinfo.user_id)
                            .text('@' + userinfo.screen_name)
                            .attr('data-image', userinfo.profile_image_url)
                            .appendTo('#tweetUserSelection');
                    }
                });
            break;

        default:
            return Promise.resolve();
        }
    },

    finish : function()
    {
        // オブザーバー削除
        //TwitSideModule.removeObserver(this.observer);
    },

    // from background scripts
    observer : function(data)
    {
        // window_typeが不一致の場合無視
        if (data.window_type && data.window_type !== UI._win_type)
            return;

        // debug
        if (getPref('debug')) console.log(data);

        switch (data.reason) {
        case TwitSideModule.UPDATE.TWEET_LOADED:
        case TwitSideModule.UPDATE.REPLACE_LOADED:
            $('#'+data.columnid).attr('data-more', '');
            UI._showTweets(data.tl_type,
                           data.columnid,
                           data.tweets,
                           data.nextid,
                           data.scroll_top);
            break;
        case TwitSideModule.UPDATE.REPLY_LOADED:
            UI._showReply(data.tl_type,
                          data.columnid,
                          data.original_tweetid,
                          data.original_inlineid,
                          data.reply);
            break;
        case TwitSideModule.UPDATE.STREAM_EVENT:
            break;
        case TwitSideModule.UPDATE.PROGRESS:
            showProgressbar(data.data);
            break;
        case TwitSideModule.UPDATE.IMAGE_LOADED:
            UI._updateThumbnail(data.columnid,
                                data.urls);
            break;
        case TwitSideModule.UPDATE.TWEET_DELETED:
            UI._deleteTweet(data.columnid,
                            data.id);
            break;
        case TwitSideModule.UPDATE.TWEET_ALLDELETED:
            UI._deleteAllTweet(data.columnid);
            break;
        case TwitSideModule.UPDATE.STATE_CHANGED:
            stateChanged();
            break;
        case TwitSideModule.UPDATE.STATE_CHANGED:
            stateChanged();
            break;
        case TwitSideModule.UPDATE.ACTION_COMPLETED:
            {
                let message = browser.i18n.getMessage(data.action + '_' + data.result);
                if (data.message) message += '\n' + data.message;
                UI.showMessage(message);
            }
            break;
        case TwitSideModule.UPDATE.CONFIG_CHANGED:
            configChanged();
            break;
        case TwitSideModule.UPDATE.MESSAGE_RCVD:
            messageReceived();
            break;
        case TwitSideModule.UPDATE.NOTIF_CHANGED:
            notifChanged();
            break;
        case TwitSideModule.UPDATE.UI_CHANGED:
            break;
        case TwitSideModule.UPDATE.COLUMN_CHANGED:
            columnChanged();
            break;
        case TwitSideModule.UPDATE.WINDOW_CHANGED:
            windowChanged();
            break;
        case TwitSideModule.UPDATE.USER_CHANGED:
            userChanged();
            break;
        case TwitSideModule.UPDATE.FUNCTION_RECIEVED:
            runFunction();
            break;
        case TwitSideModule.UPDATE.ERROR:
            messageReceived();
            break;
        }

        /**
         * CONFIG_CHANGED
         */
        function configChanged()
        {
            // コンフィグ取得
            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                          action : TwitSideModule.COMMAND.CONFIG_LOAD })
                .then((p) => {
                    prefs = p;
                    UI.setStyleSheets();
                });
        }

        /**
         * STATE_CHANGED
         */
        function stateChanged()
        {
            var columnid = data.columnid;

            var $column = $('#'+columnid),
                $update_button = $column.find('.updateButton'),
                $stream_button = $column.find('.stopStreamButton');

            switch (data.state) {
            case TwitSideModule.TL_STATE.STOPPED:
                showLoadingProgressbar(false, columnid);
                $update_button.attr('data-disabled', 'false');
                break;
            case TwitSideModule.TL_STATE.STREAM_STOPPED:
                $column.attr('data-stream-waiting', '');
                $stream_button.attr('data-disabled', 'true');
                break;
            case TwitSideModule.TL_STATE.STARTING:
                showLoadingProgressbar(true, columnid);
                $update_button.attr('data-disabled', 'true');
                break;
            case TwitSideModule.TL_STATE.STARTED:
                showLoadingProgressbar(false, columnid);
                $update_button.attr('data-disabled', 'false');
                break;
            case TwitSideModule.TL_STATE.LOADING:
                showLoadingProgressbar(true, columnid);
                break;
            case TwitSideModule.TL_STATE.LOADED:
                showLoadingProgressbar(false, columnid);
                break;
            case TwitSideModule.TL_STATE.STARTING_STREAM:
                $column.attr('data-stream-waiting', '');
                $stream_button.attr('data-disabled', 'false');
                break;
            case TwitSideModule.TL_STATE.STREAMING:
                $column.attr('data-stream-waiting', '');
                $stream_button.attr('data-disabled', 'false');
                break;
            case TwitSideModule.TL_STATE.WAITING_START:
                $update_button.attr('data-disabled', 'true');
                $column.attr('data-stream-waiting', '');
                $stream_button.attr('data-disabled', 'false');
                break;
            case TwitSideModule.TL_STATE.WAITING_STREAM:
                $update_button.attr('data-disabled', 'false');
                $column.attr('data-stream-waiting', 'true');
                $stream_button.attr('data-disabled', 'false');
                break;
            }

            if (data.message) {
                UI.showMessage(data.message);
            }
        }

        /**
         * MESSAGE_RCVD
         */
        function messageReceived()
        {
            UI.showMessage(data.message);
        }

        /**
         * NOTIF_CHANGED (to sidebar.js)
         */
        function notifChanged()
        {
            // window_typeがmainじゃないときは無視
            if (UI._win_type !== TwitSideModule.WINDOW_TYPE.MAIN)
                return;

            switch (data.action) {
            case TwitSideModule.ACTION.ADD:
            case TwitSideModule.ACTION.DELETE:
            case TwitSideModule.ACTION.DELETE_ALL:
                updateNotifications(data.unread,
                                    data.count,
                                    data.notifications);
                break;
            case TwitSideModule.ACTION.READ:
                readNotifications(data.unread,
                                  data.count);
                break;
            }
        }

        /**
         * COLUMN_CHANGED
         */
        function columnChanged()
        {
            switch (data.action) {
            case TwitSideModule.ACTION.ADD:
                UI._makeColumn(
                    data.columnid,
                    data.columninfo,
                    data.index
                );
                break;
            case TwitSideModule.ACTION.EDIT:
                UI._changeColumnConf(
                    data.columnid,
                    data.columninfo
                );
                break;
            case TwitSideModule.ACTION.SORT:
                UI._sortColumn(
                    data.old_index,
                    data.new_index
                );
                break;
            case TwitSideModule.ACTION.DELETE:
                UI._deleteColumn(
                    data.columnid,
                    data.old_index
                );
                break;
            case TwitSideModule.ACTION.DELETE_ALL:
                UI.$columnC.empty();
                UI.$columnTabC.empty();
                break;
            }
        }

        /**
         * WINDOW_CHANGED
         */
        function windowChanged()
        {
            switch (data.suffix) {
            case 'profile':
                // 初期値
                userinfo = data.parameters.userinfo;
                $('#screenname').val(data.parameters.screenname);
                // 自分のプロフィール
                setOwnProfile();
                // 検索
                searchUser();
                break;
            case 'search':
                // 初期値
                userinfo = data.parameters.userinfo;
                $('#keyword').val(data.parameters.keyword);
                // 検索
                searchTweet();
                break;
            case 'columns':
                // 初期値
                // カラム一覧
                showColumns();
                break;
            case 'newdm':
                $('#recipientScreenname').val(data.parameters.recipient);
                changeTweetUser(data.parameters.ownid);
                break;
            case 'text':
                $('#tweetText').val(data.parameters.text);
                break;
            case 'mute':
                // 初期値
                changeTweetUser(data.parameters.userid);
                // ミュート一覧
                showMutes();
                break;
            case 'noretweet':
                // 初期値
                changeTweetUser(data.parameters.userid);
                // ミュート一覧
                showNoretweets();
                break;
            case 'listmember':
                // 初期値
                userinfo = data.parameters.userinfo;
                // リストメンバー、購読者一覧
                showListMembers(data.parameters.listid, data.parameters.tl_type, data.parameters.own_list);
                break;
            case 'photo':
                // 初期値
                photos = data.parameters.photos;
                // 写真表示
                initialize();
                changePhoto(data.parameters.index);
                break;
            case 'api':
                // API
                showApi(data.parameters.userid);
                break;
            }
        }

        /**
         * USER_CHANGED
         */
        function userChanged()
        {
            switch (data.action) {
            case TwitSideModule.ACTION.ADD:
                UI._makeTweetUser(data.userinfo);
                break;
            case TwitSideModule.ACTION.EDIT:
                UI._changeTweetUserConf(data.userinfo);
                break;
            case TwitSideModule.ACTION.DELETE:
                UI._deleteUser(data.userid);
                break;
            case TwitSideModule.ACTION.DELETE_ALL:
                UI.$tweetUserSelection
                    .find('option').remove();
                $('#menuProfileSeparator')
                    .prevAll('.menuProfileItem').remove();
                break;
            }
        }

        /**
         * FUNCTION_RECIEVED
         */
        function runFunction()
        {
            switch (data.function) {
            case TwitSideModule.FUNCTION_TYPE.OPENURL:
                openURL(data.parameters.url);
                break;
            case TwitSideModule.FUNCTION_TYPE.QUOTE:
            case TwitSideModule.FUNCTION_TYPE.RT:
            case TwitSideModule.FUNCTION_TYPE.REPLY:
                Promise.all([
                    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                                  action : TwitSideModule.COMMAND.TL_GETTWEETINFO,
                                                  tweetid : data.parameters.tweetid,
                                                  columnindex : data.parameters.columnindex,
                                                  win_type : data.parameters.win_type }),
                    browser.runtime.sendMessage({ command: TwitSideModule.COMMAND.COLUMN_OPE,
                                                  action : TwitSideModule.COMMAND.COLUMN_GETTLINFO,
                                                  columnindex : data.parameters.columnindex,
                                                  key : 'timeline',
                                                  win_type : data.parameters.win_type }) ])
                    .then(([tweetinfo, tlinfo]) => {
                        var tweetBox = UI._createTweetBox(
                            tlinfo._tl_type,
                            tweetinfo,
                            'tweetRef_' + tweetinfo.raw.id_str,
                            false
                        );
                        switch (data.function) {
                        case TwitSideModule.FUNCTION_TYPE.QUOTE:
                            onClickQuote(tweetBox, tweetinfo);
                            break;
                        case TwitSideModule.FUNCTION_TYPE.RT:
                            onClickRt(tweetBox);
                            break;
                        case TwitSideModule.FUNCTION_TYPE.REPLY:
                            onClickReply(tweetBox, tweetinfo);
                            break;
                        case TwitSideModule.FUNCTION_TYPE.REPLYALL:
                            onClickReplyall(tweetBox, tweetinfo);
                            break;
                        }
                        changeTweetUser(tlinfo._own_userid);
                    });
                break;
            }
        }
    },

    /**
     * ツイート操作
     */
    // ツイートを表示
    _showTweets : function(type, columnid, tweets, nextid, keep)
    {
        if (!tweets.length) return;
        var len = tweets.length,
            minid = tweets[len-1].raw.id_str, // 最古（最小）
            timelineBox = $('#'+columnid).children('.timelineBox')[0];

        if (!timelineBox) return;

        // 高さを維持
        if (keep && timelineBox.children.length != 0)
            var offsetBottom = timelineBox.scrollHeight - timelineBox.scrollTop;
        // 最上部を維持
        if (getPref('autoreload_totop')
            && timelineBox.scrollTop == 0)
            var keepTop = true;

        // 小さいID（古いツイート・逆）順にinsertbefore
        switch (type) {
        case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
        case TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE:
            for (let idx=len-1; idx>=0; idx--) {
                let id = tweets[idx].raw.id_str,
                    box = document.getElementById(columnid+'_'+id),
                    nextBox = nextid
                    ? document.getElementById(columnid+'_'+nextid)
                    : null;

                // 存在する場合はツイートを置換
                if (box) {
                    nextBox = box.nextSibling;
                    $(box).remove();
                }
                // ツイートを挿入
                timelineBox.insertBefore(
                    this._createDmTweetBox(
                        type,
                        tweets[idx],
                        columnid+'_'+id,
                        false
                    ),
                    nextBox
                );
                // nextid更新
                nextid = id;
            }
            break;
        case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
        case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
            for (let idx=len-1; idx>=0; idx--) {
                let id = tweets[idx].raw.id_str,
                    box = document.getElementById(columnid+'_'+id),
                    nextBox = nextid
                    ? document.getElementById(columnid+'_'+nextid)
                    : null;

                // 存在する場合はツイートを置換
                if (box) {
                    nextBox = box.nextSibling;
                    $(box).remove();
                }
                // ツイートを挿入
                timelineBox.insertBefore(
                    this._createFriendTweetBox(
                        type,
                        tweets[idx],
                        columnid+'_'+id,
                        false
                    ),
                    nextBox
                );
                // nextid更新
                nextid = id;
            }
            break;
        case TwitSideModule.TL_TYPE.TEMP_MUTE:
        case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
        case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
        case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            for (let idx=len-1; idx>=0; idx--) {
                let id = tweets[idx].raw.id_str,
                    box = document.getElementById(columnid+'_'+id),
                    nextBox = nextid
                    ? document.getElementById(columnid+'_'+nextid)
                    : null;

                // 存在する場合はツイートを置換
                if (box) {
                    nextBox = box.nextSibling;
                    $(box).remove();
                }
                // ツイートを挿入
                timelineBox.insertBefore(
                    this._createUserListBox(
                        type,
                        tweets[idx],
                        columnid+'_'+id
                    ),
                    nextBox
                );
                // nextid更新
                nextid = id;
            }
            break;
        case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
        case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
        case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            for (let idx=len-1; idx>=0; idx--) {
                let id = tweets[idx].raw.id_str,
                    box = document.getElementById(columnid+'_'+id),
                    nextBox = nextid
                    ? document.getElementById(columnid+'_'+nextid)
                    : null;

                // 存在する場合はツイートを置換
                if (box) {
                    nextBox = box.nextSibling;
                    $(box).remove();
                }
                // ツイートを挿入
                timelineBox.insertBefore(
                    this._createListTweetBox(
                        type,
                        tweets[idx],
                        columnid+'_'+id,
                        false
                    ),
                    nextBox
                );
                // nextid更新
                nextid = id;
            }
            break;
        default:
            for (let idx=len-1; idx>=0; idx--) {
                let id = tweets[idx].raw.id_str,
                    box = document.getElementById(columnid+'_'+id),
                    nextBox = nextid
                    ? document.getElementById(columnid+'_'+nextid)
                    : null;

                // 存在する場合はツイートを置換
                if (box) {
                    nextBox = box.nextSibling;
                    $(box).remove();
                }
                // ツイートを挿入
                timelineBox.insertBefore(
                    this._createTweetBox(
                        type,
                        tweets[idx],
                        columnid+'_'+id,
                        false
                    ),
                    nextBox
                );
                // nextid更新
                nextid = id;
            }
        }

        // 挿入後にスクロール位置修正
        // 一番上を維持
        if (keepTop)
            timelineBox.scrollTop = 0;
        // 高さを維持
        else if (keep && offsetBottom)
            timelineBox.scrollTop = timelineBox.scrollHeight - offsetBottom;
//
//
//        function checkActive()
//        {
//            // フォーカス中が更新対象のカラムの場合
//            var activeElement = document.activeElement;
//            if ($(timelineBox).children().index(activeElement) < 0)
//                activeElement = null;
//
//            return activeElement;
//        }
    },

    // リプライを表示
    _showReply : function(type, columnid, tweetid, inlineid, reply)
    {
        var tweetboxid = inlineid
            ? '#'+columnid+'_'+tweetid+'_'+inlineid+'_inline'
            : '#'+columnid+'_'+tweetid,
            $replyBox = $(tweetboxid).find('.replyTweetBox').eq(0),
            $replies = $replyBox.find('> .replies'),
            replyboxid = tweetboxid+'_reply_'+reply.raw.id_str;

        // 閉じられているときは表示しない
        if ($replyBox.attr('data-reply-open') != 'true') return;

        $replies.append(this._createTweetBox(type, reply, replyboxid));
    },

    // サムネイル更新
    _updateThumbnail : function(columnid, urls)
    {
        var provider = urls.provider,
            imageid = urls.id,
            $thumbimg = $('#'+columnid)
            .find('.tweetThumbnailImage'
                  +'[data-provider="'+ provider+'"]'
                  +'[data-imageid="'+ imageid+'"]');

        $thumbimg[0].urls = urls;
        $thumbimg.removeAttr('data-provider data-imageid')
            .attr('src', urls.thumburl);
    },

    // ツイート削除
    _deleteTweet : function(columnid, id)
    {
        var $column = $('#'+columnid),
            $target = $('#'+columnid+'_'+id);

        // 削除される前にフォーカスを前に移す
        if ($target.is(':focus'))
            $target.prev().focus();
        // 削除される前にactiveBox前に移す
        else if ($column[0].$activeBox && $target[0] === $column[0].$activeBox[0])
            $column[0].$activeBox = $target.prev();

        $target.remove();
    },

    // ツイート削除
    _deleteAllTweet : function(columnid)
    {
        $('#'+columnid).children('.timelineBox').empty();
    },

    // ツイート用
    _createTweetBox : function(type, record, boxid, inline)
    {
        // more
        if (/_more$/.test(boxid)) {
            return this.$tweetMoreBoxTemplate.clone()
                .attr({
                    id : boxid,
                    'data-rawid' : record.raw.id_str
                })[0];
        }

        var $tweetBox = this.$tweetBoxTemplate.clone().attr('id', boxid),
            $tweetContent = $tweetBox.children('.tweetContent').eq(0),
            $tweetInline = $tweetContent.children('.inlineTweetBox').eq(0);

        // 属性設定
        $tweetBox.attr('data-tweetid', record.raw.id_str);
        if (record.meta.isMine) $tweetContent.attr('data-mine', 'true');
        if (record.meta.isForMe) $tweetContent.attr('data-forme', 'true');
        if (record.raw.retweeted) $tweetContent.attr('data-retweeted', 'true');

        /**
         * リツイートされた・されてないツイート共通
         */
        {
            let recordStatus;
            if (record.raw.retweeted_status)
                recordStatus = record.raw.retweeted_status;
            else
                recordStatus = record.raw;

            // ツイートの情報
            $tweetBox.attr({
                'data-rawid'      : recordStatus.id_str,
                'data-rawcontent' : record.meta.text,
                'data-screenname' : '@' + recordStatus.user.screen_name
            });
            // ユーザ情報
            $tweetContent.find('.tweetUserImage')
                .attr('src', recordStatus.user.profile_image_url_https);
            $tweetContent.find('.tweetUserName').attr({
                'data-screenname' : '@' + recordStatus.user.screen_name,
                'data-username'   : recordStatus.user.name
            });
            // place
            if (recordStatus.geo && recordStatus.place) {
                let $place = $tweetContent.find('.tweetStatusPlace');
                let ll = recordStatus.geo.coordinates.join(',');
                $place.attr({
                    'title'  : recordStatus.place.full_name,
                    'data-mapurl' : 'http://maps.google.com/?q=' + ll
                }).on('click', function() {
                    openURL(this.dataset.mapurl);
                });
            }
            else if (recordStatus.place) {
                let $place = $tweetContent.find('.tweetStatusPlace');
                $place.attr({
                    'title'  : recordStatus.place.full_name,
                    'data-mapurl' : 'http://maps.google.com/?q=' + recordStatus.place.full_name
                });
            }
            // verified
            if (recordStatus.user.verified)
                $tweetContent.attr('data-verified', 'true');
            // 本文
            $tweetContent.find('.tweetText')
                .text(TwitSideModule.text.unescapeHTML(record.meta.text));
            // 投稿ソース
            $tweetContent.find('.tweetSource')
                .text('from ' + analyzeSource(recordStatus.source));
            // タイムスタンプ
            $tweetContent.find('.tweetTime')
                .text(TwitSideModule.text.convertTimeStamp(
                    TwitSideModule.text.analyzeTimestamp(recordStatus.created_at),
                    getPref('timeformat')
                ));
        }

        /**
         * リツイートされたツイート
         */
        if (record.raw.retweeted_status) {
            $tweetContent.attr('data-retweet', 'true');

            $tweetContent.find('.tweetRetweeter');
            $tweetContent.find('.tweetRetweeterImage')
                .attr({ src : record.raw.user.profile_image_url,
                        title : '@' + record.raw.user.screen_name });
            $tweetContent.find('.tweetRetweeterName')
                .attr({
                    'data-screenname' : '@' + record.raw.user.screen_name,
                    'data-username'   : record.raw.user.name
                });
            $tweetContent.find('.tweetRetweeterCount')
                .attr('data-count', record.raw.retweeted_status.retweet_count);
        }
        /**
         * リツイートされていないツイート
         */
        else {
            // リツイートされた自分のツイート
            if (type == TwitSideModule.TL_TYPE.RETWEETED
                || record.raw.retweet_count) {
                $tweetContent.find('.tweetRetweeter');
                $tweetContent.find('.tweetRetweeterCount')
                    .attr('data-count', record.raw.retweet_count);
            }
            // protected
            if (record.raw.user.protected)
                $tweetContent.attr('data-protected', 'true');
        }

        /**
         * 基本メニュー
         */
        var entities = record.meta.entities,
            contextMenu = {};

        // 返信
        contextMenu.reply = {
            name : browser.i18n.getMessage('tweet.reply'),
            icon : 'fa-reply',
            visible : function() { return document.body.dataset.menuReply == 'true'; }
        };
        // 全員に返信
        $tweetBox.attr('data-screennames', record.meta.screennames.join(' '));
        if (record.meta.screennames.length > 1)
            contextMenu.replyall = {
                name : browser.i18n.getMessage('tweet.replyall'),
                icon : 'fa-reply-all',
                visible : function() { return document.body.dataset.menuReply == 'true'; }
            };
        // 公式RT
        {
            contextMenu.retweet = {
                name : browser.i18n.getMessage('tweet.retweet'),
                icon : 'fa-retweet'
            };
            if ( record.raw.retweeted
               || (record.raw.retweeted_status && record.meta.isMine)
               || (!record.raw.retweeted_status && record.raw.user.protected))
                contextMenu.retweet.disabled = true;
        };
        // 引用リツイート
        contextMenu.quote = {
            name : browser.i18n.getMessage('tweet.quote'),
            icon : 'fa-retweet'
        };
        // 引用してRT
        contextMenu.rt = {
            name : browser.i18n.getMessage('tweet.rt'),
            icon : 'fa-quote-left'
        };
        // お気に入り
        if (record.raw.favorited) {
            $tweetContent.attr('data-favorited', 'true');
            // お気に入り解除
            contextMenu.favorite = {
                name : browser.i18n.getMessage('tweet.unfavorite'),
                icon : 'fa-star',
                visible : function() { return document.body.dataset.menuFavorite == 'true'; }
            };
        }
        else {
            // お気に入り追加
            contextMenu.favorite = {
                name : browser.i18n.getMessage('tweet.favorite'),
                icon : 'fa-star',
                visible : function() { return document.body.dataset.menuFavorite == 'true'; }
            };
        }
        // ツイートテキスト
        contextMenu.showtext = {
            name : browser.i18n.getMessage('tweet.showtext'),
            icon : 'fa-clipboard'
        };
        // ツイートを開く
        contextMenu.opentweeturl = {
            name : browser.i18n.getMessage('tweet.opentweeturl'),
            icon : 'fa-external-link'
        };
        // 会話
        if (!/_reply_/.test(boxid) && record.raw.retweeted_status
            ? record.raw.retweeted_status.in_reply_to_status_id_str
            : record.raw.in_reply_to_status_id_str) {

            $tweetContent.attr('data-inreply', 'true');
            contextMenu.showreply = {
                name : browser.i18n.getMessage('tweet.showreply'),
                icon : 'fa-commenting',
                visible : function() { return document.body.dataset.menuConversation == 'true'; }
            };
        }
        // 削除
        if (record.meta.isMine || record.raw.retweeted)
            contextMenu.destroy = {
                name : browser.i18n.getMessage('tweet.destroy'),
                icon : 'fa-trash'
            };
        // リツイートされたツイート
        if (record.raw.retweet_count
            || record.raw.retweeted_status && record.raw.retweeted_status.retweet_count)
            contextMenu.showretweetedusers = {
                name : browser.i18n.getMessage('tweet.showretweetedusers'),
                icon : 'fa-users'
            };
        // 既にメタデータ取得済み
        if (record.meta.retweeters) {
            let $tweetRetweeterList = $tweetContent.find('.tweetRetweeterList'),
                $imageTemplate = $('#templateContainer > .tweetRetweeterImage');

            for (let rt of record.meta.retweeters) {
                $imageTemplate.clone().attr(rt)
                    .appendTo($tweetRetweeterList);
            }
        }
        // スクリーンネーム
        if (record.meta.screennames.length) {
            contextMenu.users = {
                name : browser.i18n.getMessage('tweet.users'),
                icon : 'fa-user-circle',
                items : {}
            };
            for (let sn of record.meta.screennames) {
                contextMenu.users.items[sn] = {
                    name : sn,
                    icon : 'fa-at',
                    callback : function(key, opt) {
                        browser.runtime
                            .sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                           action : TwitSideModule.COMMAND.USER_GETINFO,
                                           userid : UI.getActiveColumn().attr('data-userid'),
                                           key : null })
                            .then((userinfo) => {
                                openProfileWin(userinfo, sn);
                            });
                    }
                };
            }
        }
        // ハッシュタグ
        if (entities.hashtags.length) {
            contextMenu.hashtags = {
                name : browser.i18n.getMessage('tweet.hashtags'),
                icon : 'fa-tag',
                items : {}
            };
            for (let ht of entities.hashtags) {
                contextMenu.hashtags.items['#'+ht.text] = {
                    name : '#'+ht.text,
                icon : 'fa-hashtag',
                    callback : function(key, opt) {
                        browser.runtime
                            .sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                           action : TwitSideModule.COMMAND.USER_GETINFO,
                                           userid : UI.getActiveColumn().attr('data-userid'),
                                           key : null })
                            .then((userinfo) => {
                                openSearchWin(userinfo, '#'+ht.text);
                            });
                    }
                };
            }
        }
        // URLの数だけメニュー化＆本文置換
        contextMenu.urls = {
            name : browser.i18n.getMessage('tweet.urls'),
            icon : 'fa-link',
            items : {},
            visible : function() { return document.body.dataset.menuUrl == 'true'; }
        };
        {
            let $tweetText = $tweetContent.find('.tweetText'),
                $tweetThumbnail = $tweetContent.find('.tweetThumbnail'),
                $templateImg = $('#templateContainer .tweetThumbnailImage'),
                index = 0;
            for (let url of entities.urls) {
                index++;
                // 右クリックメニュー
                contextMenu.urls.items['url'+index] = {
                    name : url.display_url,
                    icon : 'fa-external-link',
                    callback : function(key, opt) { openURL(url.url); }
                };

                // URL置換先オブジェクト
                let span = document.createElement('span');
                span.classList.add('text-link');
                if (getPref('exURL') && getPref('exURL_cut'))
                    span.textContent = url.display_url;
                else if (getPref('exURL'))
                    span.textContent = url.expanded_url;
                span.dataset.fullurl = url.url;
                span.addEventListener('click', function() {
                    openURL(this.dataset.fullurl);
                });
                // URL置換
                UI.insertNodeIntoText($tweetText[0], url.url, span);
            }

            // サードパーティのメディア
            for (let pic of record.meta.pics) {
                let $thumbimg = $templateImg.clone();
                $thumbimg[0].urls = pic;
                $thumbimg.attr('src', pic.thumburl);
                if (pic.loading) {
                    $thumbimg.attr({
                        'data-provider' : pic.provider,
                        'data-imageid' : pic.id
                    });
                }
                $thumbimg.appendTo($tweetThumbnail);
            }

            // pic.twitter
            let media = entities.media;
            if (media && media.length) {
                index++;
                // 右クリックメニュー
                contextMenu.urls.items['url'+index] = {
                    name : media[0].display_url,
                    icon : 'fa-external-link',
                    callback : function(key, opt) { openURL(media[0].url); }
                };

                // URL置換先オブジェクト
                let span = document.createElement('span');
                span.classList.add('text-link');
                if (getPref('exURL') && getPref('exURL_cut'))
                    span.textContent = media[0].display_url;
                else if (getPref('exURL'))
                    span.textContent = media[0].expanded_url;
                span.dataset.fullurl = media[0].url;
                span.addEventListener('click', function() {
                    openURL(this.dataset.fullurl);
                });
                // URL置換
                UI.insertNodeIntoText($tweetText[0], media[0].url, span);

                // サムネイル追加
                for (let medium of media) {
                    let $thumbimg = $templateImg.clone();
                    $thumbimg[0].urls = {
                        fullurl : medium.expanded_url,
                        rawurl : medium.media_url,
                        variants : medium.video_info ? medium.video_info.variants : null
                    };
                    $thumbimg.attr('src', medium.media_url+':medium')
                        .appendTo($tweetThumbnail);
                }
            }

            if (!index) delete contextMenu.urls;
        }

        // Quote
        if (!inline) {
            let inlineId, inlineBoxId, inlineData;

            if (record.raw.retweeted_status
                && record.raw.retweeted_status.is_quote_status
                && record.raw.retweeted_status.quoted_status) {
                inlineId = record.raw.retweeted_status.quoted_status_id_str,
                inlineBoxId = boxid+'_'+inlineId+'_inline',
                inlineData = {
                    meta : record.meta.quote,
                    raw : record.raw.retweeted_status.quoted_status
                };
                let result = this._createTweetBox(type, inlineData, inlineBoxId, true);
                if (result)
                    $tweetInline.append(result);
            }
            else if (record.raw.is_quote_status
                  && record.raw.quoted_status) {
                inlineId = record.raw.quoted_status_id_str,
                inlineBoxId = boxid+'_'+inlineId+'_inline',
                inlineData = {
                    meta : record.meta.quote,
                    raw : record.raw.quoted_status
                };
                let result = this._createTweetBox(type, inlineData, inlineBoxId, true);
                if (result)
                    $tweetInline.append(result);
            }
        }
        // コンテクストメニューを登録
        $tweetBox[0].contextMenuItems = contextMenu;

        return $tweetBox[0];

        // 投稿ソース認識
        function analyzeSource(source)
        {
            return $('<span>' + source.replace(/&/g, '&amp;') + '</span>').text();
        }
    },

    // リスト用
    _createListTweetBox : function(type, record, boxid)
    {
        // more
        if (/_more$/.test(boxid)) {
            return this.$tweetMoreBoxTemplate.clone()
                .attr({
                    id : boxid,
                    'data-rawid' : record.raw.id_str
                })[0];
        }

        var $tweetBox = this.$tweetBoxTemplate.clone().attr('id', boxid),
            $tweetContent = $tweetBox.children('.tweetContent').eq(0),
            $tweetInline = $tweetContent.children('.inlineTweetBox').eq(0),
            recordStatus = record.raw;

        // 属性設定
        $tweetBox.attr({
            'data-tweetid'    : recordStatus.id_str,
            'data-screenname' : '@' + recordStatus.user.screen_name
        });
        // TODO
        $tweetContent.attr({
            'data-subscriber' : recordStatus.subscriber_count,
            'data-member'     : recordStatus.member_count,
            'data-mode'       : recordStatus.mode
        });
        if (record.meta.isMine) $tweetContent.attr('data-mine', 'true');

        // ユーザ情報
        $tweetContent.find('.tweetUserImage')
            .attr('src', recordStatus.user.profile_image_url_https);
        $tweetContent.find('.listName').attr({
            'data-listname'   : recordStatus.name
        });
        $tweetContent.find('.listOwnerName').attr({
            'data-screenname' : '@' + recordStatus.user.screen_name,
            'data-username'   : recordStatus.user.name
        });

        // 説明
        $tweetContent.find('.tweetText').text(recordStatus.description);

        /**
         * 基本メニュー
         */
        var contextMenu = {};

        if (record.meta.isMine) {
            // 削除
            contextMenu.destroy = {
                name : browser.i18n.getMessage('tweet.destroylist'),
                icon : 'fa-trash'
            };
            // 編集
            contextMenu.updatelist = {
                name : browser.i18n.getMessage('tweet.updatelist'),
                icon : 'fa-pencil'
            };
        }
        // メンバー一覧
        contextMenu.showmembers = {
            name : browser.i18n.getMessage('tweet.showmembers'),
            icon : 'fa-users'
        };
        // 購読者一覧
        contextMenu.showsubscribers = {
            name : browser.i18n.getMessage('tweet.showsubscribers'),
            icon : 'fa-users'
        };
        // リストを購読
        if (record.meta.subscriptionable)
            contextMenu.subscribe = {
                name : browser.i18n.getMessage('tweet.subscribe'),
                icon : 'fa-plus-circle'
            };
        // リストの購読解除
        if (record.meta.unsubscriptionable)
            contextMenu.unsubscribe = {
                name : browser.i18n.getMessage('tweet.unsubscribe'),
                icon : 'fa-minus-circle'
            };
        // カラムに追加
        if (record.meta.registrable)
            contextMenu.addlist2column = {
                name : browser.i18n.getMessage('tweet.addcolumn'),
                icon : 'fa-plus'
            };
        // スクリーンネーム
        var sn = '@' + recordStatus.user.screen_name;
        contextMenu[sn] = {
            name : sn,
            icon : 'fa-at',
            callback : function(key, opt) {
                browser.runtime
                    .sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                   action : TwitSideModule.COMMAND.USER_GETINFO,
                                   userid : UI.getActiveColumn().attr('data-userid'),
                                   key : null })
                    .then((userinfo) => {
                        openProfileWin(userinfo, sn);
                    });
            }
        };

        // コンテクストメニューを登録
        $tweetBox[0].contextMenuItems = contextMenu;

        return $tweetBox[0];
    },

    // フォロー、フォロワー用
    _createFriendTweetBox : function(type, record, boxid)
    {
        // more
        if (/_more$/.test(boxid)) {
            return this.$tweetMoreBoxTemplate.clone()
                .attr({
                    id : boxid,
                    'data-rawid' : record.raw.id_str
                })[0];
        }

        var $tweetBox = this.$tweetBoxTemplate.clone().attr('id', boxid),
            $tweetContent = $tweetBox.children('.tweetContent').eq(0),
            recordStatus = record.raw;

        // 属性設定
        $tweetBox.attr({
            'data-tweetid'    : recordStatus.id_str,
            'data-screenname' : '@' + recordStatus.screen_name
        });

        // ユーザ情報
        $tweetContent.find('.tweetUserImage')
            .attr('src', recordStatus.profile_image_url_https);
        $tweetContent.find('.tweetUserName').attr({
            'data-screenname' : '@' + recordStatus.screen_name,
            'data-username'   : recordStatus.name
        });

        // protected
        if (recordStatus.protected)
            $tweetContent.attr('data-protected', 'true');
        // verified
        if (recordStatus.verified)
            $tweetContent.attr('data-verified', 'true');
        // 説明
        if (recordStatus.description)
            $tweetContent.find('.tweetText').text(recordStatus.description);

        return $tweetBox[0];
    },

    // ダイレクトメッセージ用
    _createDmTweetBox : function(type, record, boxid, inline)
    {
        // more
        if (/_more$/.test(boxid)) {
            return this.$tweetMoreBoxTemplate.clone()
                .attr({
                    id : boxid,
                    'data-rawid' : record.raw.id_str
                })[0];
        }

        var $tweetBox = this.$tweetBoxTemplate.clone().attr('id', boxid),
            $tweetContent = $tweetBox.children('.tweetContent').eq(0),
            $tweetInline = $tweetContent.children('.inlineTweetBox').eq(0),
            recordStatus = record.raw;

        // 属性設定
        $tweetBox.attr({
            'data-tweetid'    : recordStatus.id_str,
            'data-rawcontent' : record.meta.text,
            'data-screenname' : '@' + recordStatus.sender.screen_name
        });
        if (record.meta.isMine) $tweetContent.attr('data-mine', 'true');
        if (record.meta.isForMe) $tweetContent.attr('data-forme', 'true');

        // ユーザ情報
        $tweetContent.find('.tweetUserImage')
            .attr('src', recordStatus.sender.profile_image_url_https);
        $tweetContent.find('.tweetUserName').attr({
            'data-screenname' : '@' + recordStatus.sender.screen_name,
            'data-username'   : recordStatus.sender.name
        });
        $tweetContent.find('.tweetUserRecipient').attr({
            'data-screenname' : '@' + recordStatus.recipient.screen_name,
            'data-username'   : recordStatus.recipient.name,
            'data-userid'     : recordStatus.recipient.id_str
        });

        // 本文
        $tweetContent.find('.tweetText')
            .text(TwitSideModule.text.unescapeHTML(record.raw.text));
        // タイムスタンプ
        $tweetContent.find('.tweetTime')
            .text(TwitSideModule.text.convertTimeStamp(
                TwitSideModule.text.analyzeTimestamp(recordStatus.created_at),
                getPref('timeformat')
            ));

        /**
         * 基本メニュー
         */
        var entities = record.meta.entities,
            contextMenu = {};

        // 返信
        contextMenu.replydm = {
            name : browser.i18n.getMessage('tweet.reply'),
            icon : 'fa-reply'
        };
        // ツイートテキスト
        contextMenu.showtext = {
            name : browser.i18n.getMessage('tweet.showtext'),
            icon : 'fa-clipboard'
        };
        // 削除
        contextMenu.destroy = {
            name : browser.i18n.getMessage('tweet.destroy'),
            icon : 'fa-trash'
        };
        // スクリーンネーム
        if (record.meta.screennames.length) {
            contextMenu.users = {
                name : browser.i18n.getMessage('tweet.users'),
                icon : 'fa-users',
                items : {}
            };
            for (let sn of record.meta.screennames) {
                contextMenu.users.items[sn] = {
                    name : sn,
                    icon : 'fa-at',
                    callback : function(key, opt) {
                        browser.runtime
                            .sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                           action : TwitSideModule.COMMAND.USER_GETINFO,
                                           userid : UI.getActiveColumn().attr('data-userid'),
                                           key : null })
                            .then((userinfo) => {
                                openProfileWin(userinfo, sn);
                            });
                    }
                };
            }
        }
        // URLの数だけメニュー化＆本文置換
        contextMenu.urls = {
            name : browser.i18n.getMessage('tweet.urls'),
            icon : 'fa-link',
            items : {},
            visible : function() { return document.body.dataset.menuUrl == 'true'; }
        };
        {
            let $tweetText = $tweetContent.find('.tweetText'),
                $tweetThumbnail = $tweetContent.find('.tweetThumbnail'),
                $templateImg = $('#templateContainer .tweetThumbnailImage'),
                index = 0;
            for (let url of entities.urls) {
                index++;
                // 右クリックメニュー
                contextMenu.urls.items['url'+index] = {
                    name : url.display_url,
                    icon : 'fa-external-link',
                    callback : function(key, opt) { openURL(url.url); }
                };

                // URL置換先オブジェクト
                let span = document.createElement('span');
                span.classList.add('text-link');
                if (getPref('exURL') && getPref('exURL_cut'))
                    span.textContent = url.display_url;
                else if (getPref('exURL'))
                    span.textContent = url.expanded_url;
                span.dataset.fullurl = url.url;
                span.addEventListener('click', function() {
                    openURL(this.dataset.fullurl);
                });
                // URL置換
                UI.insertNodeIntoText($tweetText[0], url.url, span);
            }

            // サードパーティのメディア
            for (let pic of record.meta.pics) {
                let $thumbimg = $templateImg.clone();
                $thumbimg[0].urls = pic;
                $thumbimg.attr('src', pic.thumburl);
                if (pic.loading) {
                    $thumbimg.attr({
                        'data-provider' : pic.provider,
                        'data-imageid' : pic.id
                    });
                }
                $thumbimg.appendTo($tweetThumbnail);
            }

            if (!index) delete contextMenu.urls;
        }
        // コンテクストメニューを登録
        $tweetBox[0].contextMenuItems = contextMenu;

        return $tweetBox[0];
    },

    // mute, noretweet用
    _createUserListBox : function(type, record, boxid)
    {
        // more
        if (/_more$/.test(boxid)) {
            return this.$tweetMoreBoxTemplate.clone()
                .attr({
                    id : boxid,
                    'data-rawid' : record.raw.id_str
                })[0];
        }

        var $tweetBox = this.$tweetBoxTemplate.clone().attr('id', boxid),
            $tweetContent = $tweetBox.children('.tweetContent').eq(0),
            recordStatus = record.raw;

        // 属性設定
        $tweetBox.attr({
            'data-userid'    : recordStatus.id_str,
            'data-screenname' : '@' + recordStatus.screen_name
        });

        // ユーザ情報
        $tweetContent.find('.tweetUserImage')
            .attr('src', recordStatus.profile_image_url_https);
        $tweetContent.find('.tweetUserName').attr({
            'data-screenname' : '@' + recordStatus.screen_name,
            'data-username'   : recordStatus.name
        });

        /**
         * 基本メニュー
         */
        var entities = record.meta.entities,
            contextMenu = {};

        // 削除
        contextMenu.destroyuser = {
            name : browser.i18n.getMessage('tweet.destroyuser'),
            icon : 'fa-user-times',
            visible : function() { return document.body.dataset.ownList == 'true'; }
        };
        // スクリーンネーム
        var sn = '@' + recordStatus.screen_name;
        contextMenu[sn] = {
            name : sn,
            icon : 'fa-at',
            callback : function(key, opt) {
                browser.runtime
                    .sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                   action : TwitSideModule.COMMAND.USER_GETINFO,
                                   userid : UI.getActiveColumn().attr('data-userid'),
                                   key : null })
                    .then((userinfo) => {
                        openProfileWin(userinfo, sn);
                    });
            }
        };
        // コンテクストメニューを登録
        $tweetBox[0].contextMenuItems = contextMenu;

        return $tweetBox[0];
    },

    insertNodeIntoText : function(parentObj, replaceText, newNode)
    {
        // textNode全てから置換対象の文字列を検索
        var childNodes = parentObj.childNodes,
            targetNode = null,
            targetIndex = null;

        for (let child of childNodes) {
            if (child.nodeType === Node.TEXT_NODE
                && child.textContent.match(replaceText)) {
                targetNode = child;
                targetIndex = child.textContent.search(replaceText);
                break;
            }
        }
        // 対象無し
        if (targetNode == null) return false;

        // textNodeを分割（対象文字列の前後）
        var oldNode = null;
        oldNode = targetNode.splitText(targetIndex);
        oldNode.splitText(replaceText.length);
        // 分割後textNodeとnewNodeを置換
        parentObj.replaceChild(newNode, oldNode);
        // 置換成功
        return true;
    },

    /**
     * ユーザ操作
     */
    // スクリーンネームアイテム作成して末尾に追加
    _makeTweetUser : function(userinfo)
    {
        var $useroption = this.$tweetUserTemplate.clone(),
            $menuitem = this.$menuItemTemplate.clone();

        // メニューアイテム
        $useroption.val(userinfo.user_id).appendTo(this.$tweetUserSelection);

        // 左パネル
        $menuitem.attr('data-userid', userinfo.user_id).insertBefore($('#menuProfileSeparator'));

        this._changeTweetUserConf(userinfo);
    },

    // スクリーンネームアイテムの設定変更
    _changeTweetUserConf : function(userinfo)
    {
        var $useroption = this.$tweetUserSelection.children('[value="' + userinfo.user_id + '"]'),
            $menuitem = this.$leftCmenuList.children('.menuProfileItem[data-userid="' + userinfo.user_id + '"]');

        // スクリーンネーム変更
        if (userinfo.screen_name) {
            $useroption.text('@' + userinfo.screen_name);
            $menuitem.attr({ 'data-screenname' : '@' + userinfo.screen_name,
                             'data-label' : '@' + userinfo.screen_name });
        }
        // プロフィール画像変更
        if (userinfo.profile_image_url) {
            $useroption.attr('data-image', userinfo.profile_image_url);
            $menuitem.children('.menuImage').attr('src', userinfo.profile_image_url);
        }
    },

    _deleteUser : function(userid)
    {
        this.$tweetUserSelection.children('[value="' + userid + '"]').remove();
        this.$leftCmenuList.children('.menuProfileItem[data-userid="' + userid + '"]').remove();
    },

    /**
     * カラム操作
     */
    // カラムを作成して末尾に追加
    _makeColumn : function(columnid, columninfo, index)
    {
        var $column = this.$columnTemplate.clone(true),
            $columnTab = this.$columnTabTemplate.clone();

        $column.attr({ id : columnid,
                       // タイムライン種別
                       'data-column-type' : TwitSideModule.getTimelineName(columninfo.tl_type),
                       'data-userid' : columninfo.userid })
            .appendTo(this.$columnC);
        $columnTab.attr({ id : columnid + '_tab',
                          'data-column-type' : TwitSideModule.getTimelineName(columninfo.tl_type),
                          'data-userid' : columninfo.userid })
            .appendTo(this.$columnTabC);

        // カラム設定
        this._changeColumnConf(columnid, columninfo);

        // 1カラム目
        if ($column.index() == 0) {
            // アクティブカラム
            this.$activeColumn = this.$columnC.children('.column').first();
            // スクリーンネーム
            changeTweetUser();
        }

        // メインウィンドウのみ
        if (this._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
            calcColumns();
            colorColumnTab();

            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                          action : TwitSideModule.COMMAND.COLUMN_GETTWEETS,
                                          columnindex : index, win_type : UI._win_type })
                .then((tweets) => {
                    this._showTweets(columninfo.tl_type,
                                     columnid,
                                     tweets,
                                     null, null);
              });
        }
    },

    // カラムの設定変更
    _changeColumnConf : function(columnid, columninfo)
    {
        var $column = $('#'+columnid),
            $columnTab = $('#'+columnid+'_tab');

        // カラムラベル変更
        $columnTab.text(columninfo.columnlabel);

        // 新しいリストボタン表示
        if (columninfo.tl_type === TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS
            && columninfo.userid == columninfo.options.userid)
            $column.find('.newListButton').css('display', '');

        // プライバシーモード
        $column.attr('data-veil', columninfo.options.veil ? 'true' : 'false');
    },

    // カラムの削除
    _deleteColumn : function(columnid, old_index)
    {
        // 削除するカラムが現在アクティブ
        if (old_index == this.$activeColumn.index())
            this.$activeColumn.next()
            ? this.$activeColumn = this.$activeColumn.next()
            : this.$activeColumn = this.$activeColumn.prev();
        // DOMから削除
        $('#'+columnid).remove();
        $('#'+columnid+'_tab').remove();

        // メインウィンドウのみ
        if (this._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
            calcColumns();
            colorColumnTab();
        }
    },

    // カラムの順番変更
    _sortColumn : function(old_index, new_index)
    {
        var $column = this.$columnC.children().eq(old_index),
            $columnTab = this.$columnTabC.children().eq(old_index);

        if (!$column[0]) return;

        // 後ろへ
        if (old_index < new_index) {
            this.$columnC.children().eq(new_index).after($column);
            this.$columnTabC.children().eq(new_index).after($columnTab);
        }
        // 前へ
        else {
            this.$columnC.children().eq(new_index).before($column);
            this.$columnTabC.children().eq(new_index).before($columnTab);
        }

        // メインウィンドウのみ
        if (this._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
            colorColumnTab();
        }
    },

    /**
     * 全体
     */
    // スタイルシート設定
    setStyleSheets : function()
    {
        // style settings
        // テーマ
        document.body.dataset.theme =            getPref('theme');
        document.body.dataset.colorRetweets =    getPref('color_retweets');
        // 画像
        document.body.dataset.viewthumbnail =    getPref('viewthumbnail');
        // スクリーンネーム
        document.body.dataset.screennameFirst =  getPref('screenname_first');
        // ソース
        document.body.dataset.viewsource =       getPref('viewsource');
        // 改行
        document.body.dataset.linefeed =         getPref('linefeed');
        // アニメーション
        document.body.dataset.animation =        getPref('animation');
        jQuery.fx.off =                        ! getPref('animation');

        // scale settings
        // フォント
        $('body').css('font-size',               getPref('font_size'));
        // アイコンサイズ
        document.body.dataset.iconSize =         getPref('icon_size');
        document.body.dataset.buttonSize =       getPref('button_size');
        // サークルアイコン
        document.body.dataset.circleIcon =       getPref('circle_icon');

        // tweetmenu settings
        // 右クリックメニュー
        document.body.dataset.menuReply =        getPref('menu_reply', 'boolean');
        document.body.dataset.menuFavorite =     getPref('menu_favorite', 'boolean');
        document.body.dataset.menuConversation = getPref('menu_conversation', 'boolean');
        document.body.dataset.menuUrl =          getPref('menu_url', 'boolean');
        // ツイートメニュー
        this.setTweetMenuFunc(0, getPref('hover_menu0'));
        this.setTweetMenuFunc(1, getPref('hover_menu1'));
        this.setTweetMenuFunc(2, getPref('hover_menu2'));
        this.setTweetMenuFunc(3, getPref('hover_menu3'));
    },

    // アクティブカラムを設定
    setActiveColumn : function($column, fromBox)
    {
        changeTweetUser($column.attr('data-userid'));
        if (this.$activeColumn[0] === $column[0]) return;

        // setActiveBoxから
        if (fromBox) {
            this.$activeColumn = $column;

            // メインウィンドウのみ
            if (this._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
                scrollColumns($column.index());
            }
        }
        else {
            let $activeBox = this.getActiveBox($column);
            // アクティブボックスがあるときはフォーカス
            $activeBox[0]
                ? this.setActiveBox($activeBox)
                : this.setActiveColumn($column, true);
        }
    },

    getActiveColumn : function()
    {
        return this.$activeColumn;
    },

    // アクティブボックス＋カラムを設定
    setActiveBox : function($tweetBox)
    {
        if ($tweetBox[0] === document.activeElement) {
            let $column = $tweetBox.closest('.column');

            // 一番上の時はactiveBoxを持たない
            if ($tweetBox.index() == 0) {
                $column[0].$activeBox = null;
                // 余白を詰める
                if ($column.find('.timelineBox').scrollTop()
                    <= parseInt($tweetBox.css('margin-top')))
                    $column.find('.timelineBox').scrollTop(0);
            }
            else
                $column[0].$activeBox = $tweetBox;

            // アクティブカラムも変更
            this.setActiveColumn($column, true);
        }
        else {
            $tweetBox.focus();
        }
    },

    getActiveBox : function($column)
    {
        if ($column == null) $column = this.$activeColumn;
        // activeBoxがnullなら一番上
        return $column[0].$activeBox == null
            ? $column.find('.tweetBox:first')
            : $column[0].$activeBox;
    },

    // ツイートボタンの機能を取得
    getTweetMenuFunc : function(column_type, menuindex_int)
    {
        if (column_type == 'directmessage') {
            return this.tweetMenuFuncList.replydm;
        }

        else {
            let command = $(document.body).attr('data-tweet-menu-button'+menuindex_int);
            if (command) return this.tweetMenuFuncList[command];
            else return function() {};
        }
    },

    // ボタンと関数の紐付け、設定に保存
    setTweetMenuFunc : function(menuindex_int, command_str)
    {
        // コマンドを割り当てない
        if (command_str == null
            || !this.tweetMenuFuncList[command_str])
            $(document.body).attr('data-tweet-menu-button'+menuindex_int, '');
        // コマンドを割り当て
        else
            $(document.body).attr('data-tweet-menu-button'+menuindex_int, command_str);
    },

    // メッセージ
    showMessage : function(message, text_flag)
    {
        if (message == null) return;
        // transMessageの返値
        if (Array.isArray(message)) [message, text_flag] = message;

        var $messageC = $('#messageContainer');

        $messageC.text('');
        text_flag
            ? $messageC.text(message)
            : $messageC.html(message);

        // 表示
        $messageC.removeClass('hidden').addClass('visible')
            .delay(5000).queue(function() {
                $(this).removeClass('visible').addClass('hidden').dequeue();
            });
    }
};


/**
 * 全体
 */
// localization content ui
function localization()
{
    for (let datum of l10nDefinition) {
        if (datum.selector == 'title') {
            document.title = browser.i18n.getMessage(datum.word);
            continue;
        }

        switch (datum.place) {
        case "text":
            $(datum.selector).text(browser.i18n.getMessage(datum.word));
            break;
        case "html":
            $(datum.selector).html(browser.i18n.getMessage(datum.word));
            break;
        case "attr":
            $(datum.selector).attr(datum.attr, browser.i18n.getMessage(datum.word));
            break;
        }
    }
}

// add click or press Enter key event listener
function buttonize(buttonItems, commandExec)
{
    // common buttons
    $(document).on('click keypress', buttonItems.join(','), function(e) {
        // click or on press Enter
        if (e.type == 'keypress'
            && !(e.originalEvent.key == 'Enter'
                 || e.originalEvent.key == 'Space')) return;
        // stop if disabled
        if (this.dataset.disabled == "true") return;

        commandExec(this);
    });
}

// プログレスバー
function showProgressbar(progress)
{
    // debug message
    if (getPref('debug')) console.log('progress: ' + progress);

    var $bar = $('#progressBar');

    if ($bar.attr('data-progress') > progress)
        $bar.stop(true, true).css('width', 0);
    $bar.attr('data-progress', progress).css('display', '');

    if (progress >= 100) {
        $bar.stop(true, false).animate(
            { width : '100%' },
            200, 'swing', function() {
                $(this).delay(400).fadeOut(400).queue(function() {
                    $(this).attr('data-progress', 0)
                        .css({ width : 0, display : 'none' }).dequeue();
                });
            });
    }
    else {
        $bar.stop(true, false).animate(
            { width : progress + '%' },
            200, 'swing'
        );
    }
}

// ローディング
function showLoadingProgressbar(sw, columnid)
{
    var len = UI.$columnC.children().length;

    if (sw) {
        columnid
            ? $('#'+columnid).find('.progressBarColumn').attr('data-loading', 'true')
            : $('#progressBarOther').attr('data-loading', 'true'); // 全体のバー
    }
    else {
        columnid
            ? $('#'+columnid).find('.progressBarColumn').attr('data-loading', 'false')
            : $('#progressBarOther').attr('data-loading', 'false'); // 全体のバー
    }
}


/**
 * タイムライン操作
 */
// ツイートが含まれるカラムインデックスを取得
function getColumnIndexFromBox(obj)
{
    return $(obj).closest(UI.$columnC.children('.column')).index();
}

// タイムライン更新ボタン
function loadNewer(columnindex_int)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_GETNEWER,
                                  columnindex : columnindex_int,
                                  win_type : UI._win_type });
}

// タイムライン途中ツイート読み込み
function loadMore(morebox)
{
    if (!/_more$/.test(morebox.id)) return;
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_GETMORE,
                                  columnindex : getColumnIndexFromBox(morebox),
                                  win_type : UI._win_type,
                                  tweetid : morebox.dataset.rawid });
}

// タイムライン過去ツイート読み込み
function loadOlder(columnindex_int)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_GETOLDER,
                                  columnindex : columnindex_int,
                                  win_type : UI._win_type });
}

// タイムライン最上部・最下部移動
function timelineMove(dir_str)
{
    if (dir_str == 'top')
        UI.getActiveColumn().children('.timelineBox').children().first().focus();
    else if (dir_str == 'bottom')
        UI.getActiveColumn().children('.timelineBox').children().last().focus();
}

// ストリーム停止
function stopStream(columnindex_int)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_STOPSTREAM,
                                  columnindex : columnindex_int,
                                  win_type : UI._win_type });
}

// キーボードイベント
function keyeventChangeFocus(event)
{
    var key = event.key.toUpperCase();
    // debug message
    if (getPref('debug')) console.log(key);

    switch (key) {
    case 'J':
        UI.getActiveBox().next().focus();
        break;
    case 'K':
        UI.getActiveBox().prev().focus();
        break;
    case 'H':
    case 'L':
        // メインウィンドウだけ対象
        if (UI._win_type !== TwitSideModule.WINDOW_TYPE.MAIN) return;
        // 連打禁止タイマー
        if (UI.$columnC[0].keyblockTimer) return;

        // 連打禁止
        UI.$columnC[0].keyblockTimer = setTimeout(function() {
            UI.$columnC[0].keyblockTimer = null;
        }, 200);
        // フォーカス横移動
        let $activeColumn = UI.getActiveColumn();
        if (key == 'H' && $activeColumn.prev()[0])
            $activeColumn.prev().focus();
        else if (key == 'L' && $activeColumn.next()[0])
            $activeColumn.next().focus();
        break;
    case 'G':
        event.shiftKey
            ? timelineMove('bottom')
            : timelineMove('top');
        break;
    }
}

/**
 * ツイートメニュー
 */
// 返信・引用ツイート表示
function showTweetRef(tweetBox, type, tweetinfo)
{
    var $replyUsersSelection = $('#replyUsersSelection').empty();
    $(tweetBox).children('.tweetContent').eq(0).clone()
        .appendTo($('#refTweetBox').empty())
        .children().remove(':not(.tweetMainContent)');
    $('#refTweetContainer').attr('data-type', type);

    // 返信ユーザ
    if (type == 'reply' || type == 'replyall') {
        let $templateReplyUser = $('#templateContainer .replyUser');

        (tweetinfo
         ? Promise.resolve(tweetinfo)
         : browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                         action : TwitSideModule.COMMAND.TL_GETTWEETINFO,
                                         columnindex : getColumnIndexFromBox(tweetBox),
                                         win_type : UI._win_type,
                                         tweetid : tweetBox.dataset.tweetid }))
            .then((tweetinfo) => {
                // ツイートしたユーザ
                if (!tweetinfo.raw.retweeted_status) {
                    $templateReplyUser.clone()
                        .attr('data-userid', tweetinfo.raw.user.id_str)
                        .text('@'+tweetinfo.raw.user.screen_name)
                        .appendTo($replyUsersSelection);
                }
                else {
                    $templateReplyUser.clone()
                        .attr('data-userid', tweetinfo.raw.retweeted_status.user.id_str)
                        .text('@'+tweetinfo.raw.retweeted_status.user.screen_name)
                        .appendTo($replyUsersSelection);
                }
                // メンション
                for (let mention of tweetinfo.meta.entities.user_mentions) {
                    $templateReplyUser.clone()
                        .attr('data-userid', mention.id_str)
                        .text('@'+mention.screen_name)
                        .appendTo($replyUsersSelection);
                }
                // リツイートしたユーザ
                if (tweetinfo.raw.retweeted_status) {
                    $templateReplyUser.clone()
                        .attr('data-userid', tweetinfo.raw.user.id_str)
                        .text('@'+tweetinfo.raw.user.screen_name)
                        .appendTo($replyUsersSelection);
                }
                if (type == 'reply') {
                    $replyUsersSelection.children().first().nextAll()
                        .attr('data-reply', 'false');
                }
            });
    }

    countNewTweet();
    $('#newTweet').focus();
}

// 公式リツイート
function onClickRetweet(tweetBox)
{
    // ツイート情報
    if (getPref('confirm_retweet')
        && !confirm(browser.i18n.getMessage('confirmRetweet'))) return;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_RETWEET,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : tweetBox.dataset.tweetid });
}

// [MAIN] コメントつきリツイート
function onClickQuote(tweetBox, tweetinfo)
{
    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        // ツイート情報
        var rawid = tweetBox.dataset.rawid,
            screenname = tweetBox.dataset.screenname,
            status = 'https://twitter.com/' + screenname.replace(/^@/, '') + '/status/' + rawid;

        newTweetContainerToggle(true);
        $('#newTweet').attr({
            'data-attachment-url' : status,
            'data-reply-id' : ''
        });

        // ファイル選択解除
        cancelAllFile();
        // 引用ツイート表示
        showTweetRef(tweetBox, 'inline', tweetinfo);
    }
    else
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_RUNINMAINUI,
                                      function : TwitSideModule.FUNCTION_TYPE.QUOTE,
                                      parameters : { tweetid : tweetBox.dataset.tweetid,
                                                     columnindex : UI.getActiveColumn().index(),
                                                     win_type : UI._win_type },
                                      suffix : SUFFIX });
}

// [MAIN] 非公式リツイート
function onClickRt(tweetBox)
{
    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        // ツイート情報
        var screenname = tweetBox.dataset.screenname,
            content = TwitSideModule.text.unescapeHTML(tweetBox.dataset.rawcontent)
            .replace(/\n/g, getPref('linefeed') ? '\n' : ' ');

        // 入力ボックス
        var $newTweet = $('#newTweet');
        newTweetContainerToggle(true);
        $newTweet.val(' RT ' + screenname + ': ' + content);
        countNewTweet();
        $newTweet.focus();
        $newTweet[0].setSelectionRange(0, 0);
    }
    else
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_RUNINMAINUI,
                                      function : TwitSideModule.FUNCTION_TYPE.RT,
                                      parameters : { tweetid : tweetBox.dataset.tweetid,
                                                     columnindex : UI.getActiveColumn().index(),
                                                     win_type : UI._win_type },
                                      suffix : SUFFIX });
}

// ツイートテキスト
function onClickShowtext(tweetBox)
{
    openTextWin(tweetBox.dataset.rawcontent);
}

// ツイートのURLを開く
function onClickOpentweeturl(tweetBox)
{
    // ツイート情報
    var rawid = tweetBox.dataset.rawid,
        screenname = tweetBox.dataset.screenname;

    openURL('https://twitter.com/' + screenname.replace(/^@/, '') + '/status/' + rawid);
}

// [MAIN] 返信
function onClickReply(tweetBox, tweetinfo)
{
    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        // ツイート情報
        var rawid = tweetBox.dataset.rawid;

        newTweetContainerToggle(true);
        $('#newTweet').attr({
            'data-attachment-url' : '',
            'data-reply-id' : rawid
        });

        // 返信ツイート表示
        showTweetRef(tweetBox, 'reply', tweetinfo);
    }
    else
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_RUNINMAINUI,
                                      function : TwitSideModule.FUNCTION_TYPE.REPLY,
                                      parameters : { tweetid : tweetBox.dataset.tweetid,
                                                     columnindex : UI.getActiveColumn().index(),
                                                     win_type : UI._win_type },
                                      suffix : SUFFIX });
}

// [MAIN] 全員に返信
function onClickReplyall(tweetBox, tweetinfo)
{
    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        // ツイート情報
        var rawid = tweetBox.dataset.rawid;

        newTweetContainerToggle(true);
        $('#newTweet').attr({
            'data-attachment-url' : '',
            'data-reply-id' : rawid
        });

        // 返信ツイート表示
        showTweetRef(tweetBox, 'replyall', tweetinfo);
    }
    else
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_RUNINMAINUI,
                                      function : TwitSideModule.FUNCTION_TYPE.REPLY,
                                      parameters : { tweetid : tweetBox.dataset.tweetid,
                                                     columnindex : UI.getActiveColumn().index(),
                                                     win_type : UI._win_type },
                                      suffix : SUFFIX });
}

// お気に入りへ追加
function onClickFavorite(tweetBox)
{
    // ツイート情報
    var tweetid = tweetBox.dataset.rawid,
        state = $(tweetBox).children('.tweetContent').attr('data-favorited') == 'true';

    if (state) {
        if (getPref('confirm_favorite')
            && !confirm(browser.i18n.getMessage('confirmRemoveFavorite'))) return;
    }
    else {
        if (getPref('confirm_favorite')
            && !confirm(browser.i18n.getMessage('confirmAddFavorite'))) return;
    }

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_FAVORITE,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : tweetBox.dataset.tweetid,
                                  sw : !state });
}

// 会話を表示
function onClickShowreply(tweetBox)
{
    // 既に読み込まれているときは何もしない
    if ($(tweetBox).find('.replyTweetBox').eq(0).attr('data-reply-open') == 'true') return;

    var tweetid,
        inlineid;

    if (tweetBox.id.match(/_inline$/)) {
        tweetid = $(tweetBox).parent().closest('.tweetBox').attr('data-tweetid');
        inlineid = tweetBox.dataset.tweetid;
    }
    else
        tweetid = tweetBox.dataset.tweetid;

    // 会話を全て閉じるボタン
    $(tweetBox).closest('.timelineBox').siblings('.clearRepliesBox').attr('data-replies-open', 'true');

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_REPLIES,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : tweetid,
                                  inlineid : inlineid });

    $(tweetBox).find('.replyTweetBox').eq(0).attr('data-reply-open', 'true');
}

// 会話を消す
function clearReplies(button)
{
    var $replyBox = $(button).closest('.replyTweetBox');
    $replyBox.attr('data-reply-open', 'false').children('.replies').empty();

    // 会話を全て閉じるボタン
    if (!$replyBox.closest('.timelineBox').find('.replyTweetBox[data-reply-open="true"]').length) {
        $replyBox.closest('.timelineBox').siblings('.clearRepliesBox').attr('data-replies-open', 'false');
    }
}

// 会話を全て消す
function clearAllReplies(button)
{
    var $replyBox = $(button).siblings('.timelineBox').find('.replyTweetBox[data-reply-open="true"]');
    $replyBox.attr('data-reply-open', 'false').children('.replies').empty();

    // 会話を全て閉じるボタン
    button.dataset.repliesOpen = false;
}

// 削除
function onClickDestroy(tweetBox)
{
    var message = '';
    switch ($(tweetBox).closest('.column').attr('data-column-type')) {
    case 'directmessage':
        message = browser.i18n.getMessage('confirmRemoveMessage');
        break;
    case 'ownershiplists':
    case 'subscriptionlists':
    case 'membershiplists':
        message = browser.i18n.getMessage('confirmRemoveList');
        break;
    default:
        message = browser.i18n.getMessage('confirmRemoveTweet');
    }

    if (getPref('confirm_delete') && !confirm(message)) return;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_DESTROY,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : $(tweetBox).attr('data-tweetid') });
}

// ユーザ削除（ミュート、リツイート非表示）
function onClickDestroyUser(tweetBox)
{
    if (getPref('confirm_delete')
        && !confirm(browser.i18n.getMessage('confirmRemoveUser'))) return;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_DESTROY,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : $(tweetBox).attr('data-userid') });
}

// リツイートしたユーザを表示
function onClickShowretweetedusers(tweetBox)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.TL_RETWEETERS,
                                  columnindex : getColumnIndexFromBox(tweetBox),
                                  win_type : UI._win_type,
                                  tweetid : $(tweetBox).attr('data-tweetid') });
}

// リツイートしたユーザのプロフィールを表示
function onClickRetweeterImage(image)
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                  action : TwitSideModule.COMMAND.USER_GETINFO,
                                  userid : UI.getActiveColumn().attr('data-userid'),
                                  key : null })
        .then((userinfo) => {
            openProfileWin(userinfo, image.title);
        });
}

// 画像ポップアップ表示
function showPhotos(e)
{
    var imagebox = e.target;

    // photoウィンドウ
    if (getPref('popup_photo')) {
        let $ib = $(imagebox).parent().children(),
            index = $ib.index($(imagebox)),
            photos = [];

        for (let i=0; i<$ib.length; i++) {
            photos[i] = {};
            photos[i].urls = $ib[i].urls;
        }
        openPhotoWin(photos, index);
    }
    else {
        openURL(imagebox.urls.fullurl);
    }
}

// DMへ返信
function onClickReplydm(tweetBox)
{
    // ツイート情報
    var sender = $(tweetBox).find('.tweetUserName').attr('data-screenname'),
        recipient = $(tweetBox).find('.tweetUserRecipient').attr('data-screenname'),
        recipientid = $(tweetBox).find('.tweetUserRecipient').attr('data-userid'),
        ownid = UI.getActiveColumn().attr('data-userid');

    if (ownid == recipientid)
        openNewdmWin(ownid, sender);
    else
        openNewdmWin(ownid, recipient);
}

// [MAIN] URLを開く
function openURL(url)
{
    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        browser.windows.getCurrent().
            then((win) => {
                browser.tabs.create({
                    url : url,
                    active : getPref('URL_tabactive'),
                    windowId : win.id
                });
            });
    }
    else
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_RUNINMAINUI,
                                      function : TwitSideModule.FUNCTION_TYPE.OPENURL,
                                      parameters : { url : url },
                                      suffix : SUFFIX });
}


/**
 * サジェスト
 */
// サジェスト作成
function suggestScreenname(textarea, suggestContainer)
{
    var $newTweet = $(textarea),
        $suggest = $(suggestContainer),
        flag = false,
        re = new RegExp('(@[a-zA-Z0-9_]*)$', 'i');

    // 遅延
    if ($suggest[0].timer) clearTimeout($suggest[0].timer);

    $suggest[0].timer = setTimeout(function() {
        $suggest.empty();
        // カーソル位置取得
        var caret = $newTweet[0].selectionStart,
            // カーソル位置より前の文字列取得
            objtext = $newTweet.val().slice(0, caret);

        // 抜き出したワードが@から始まる時サジェストを発動
        if (re.test(objtext)) flag = true;
        var matched = RegExp.$1;

        if (flag) {
            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.FRIEND_OPE,
                                          action : TwitSideModule.COMMAND.FRIEND_LATESTS })
                .then((latests) => {
                    var filtered = latests.filter(
                        function(element, index, array) {
                            var re = new RegExp(matched, 'i');
                            return (re.test(element));
                        }),
                        len = filtered.length;
                    if (len) {
                        for (let sn of filtered) {
                            $('<option />').val(matched).text(sn).appendTo($suggest);
                        }
                        $suggest.show(0);
                        $suggest[0].selectedIndex = 0;
                    }
                    else hideSuggest(suggestContainer);
                });
        }
        else hideSuggest(suggestContainer);
    }, 200);
}

// サジェスト選択
function suggestOnSelect(e, textarea, suggestContainer, focus, callback)
{
    if (e) e = e.originalEvent;

    var $newTweet = $(textarea),
        $suggest = $(suggestContainer);

    if (e) {
        switch (true) {
        case e.shiftKey && e.key == 'Tab':
        case e.key == 'ArrowUp':
            if ($suggest[0].selectedIndex == 0)
                $newTweet.focus();
            else if (e.key == 'Tab')
                $suggest[0].selectedIndex--;
            return;
        case e.key == 'Tab':
        case e.key == 'ArrowDown':
            if ($suggest[0].selectedIndex == $suggest.children().length - 1) {
                hideSuggest(suggestContainer);
                if (focus) $(focus).focus();
            }
            else if (e.key == 'Tab')
                $suggest[0].selectedIndex++;
            return;
        }
        if (e.key != 'Enter') return;
    }

    // サジェスト未選択でEnter押下時
    if ($suggest[0].selectedIndex == -1) {
        $newTweet.focus();
        return;
    }

    // カーソル位置取得
    var caret = $newTweet[0].selectionStart,
        // カーソル位置より前の文字列取得
        original = $newTweet.val().slice(0, caret),
        // 抜き出したワードが@から始まる時サジェストを発動
        replaced = original.replace(
            new RegExp($suggest[0].selectedOptions[0].value + '$', 'm'),
            $suggest[0].selectedOptions[0].text
        );

    $newTweet.val($newTweet.val().replace(original, replaced) + ' ');
    $newTweet.focus();

    if (callback) callback();
}

// サジェスト非表示
function hideSuggest(suggestContainer)
{
    $(suggestContainer).hide();
}


/**
 * Config operation
 */
function setPref(key, value) {
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                  action : TwitSideModule.COMMAND.CONFIG_SET,
                                  key : key,
                                  value : value });
}

function getPref(key) {
    return prefs[key] == null ? null : prefs[key];
}
