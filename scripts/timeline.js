/**
 * @fileOverview Timeline module
 * @name timeline.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

const networkWait        = 250,
      apiWait            = 60000,
      httpWait           = 5000,
      infWait            = 300000,
      autoClearWait      = 60000,
      autoClearVoteWait  = 5000,
      LIMIT_RETWEET_CNT  = 5,
      LIMIT_RETWEET_TERM = 60,
      ZERO_FILL          = '0000000000000000000000000',
      ZERO_FILL_LEN      = 25;

var Timeline = function(
    tl_type_int,        // タイムライン種別
    columnid_str,       // カラムID
    userinfo_hash,      // ユーザ情報
    win_type)           // ウィンドウ種別
{
    // 個別設定
    this._tl_type = tl_type_int;
    this._columnid = columnid_str;
    this._own_userid = userinfo_hash.user_id;
    this._own_screenname = userinfo_hash.screen_name;
    this._win_type = win_type;
    this._tweet = new Tweet(userinfo_hash);

    // 初期値
    // レコード保持
    this.record = {
        data : {}, // 順序無視生データ { meta, raw }
        ids : [] // ソートされたid一覧
    };
    // 自動更新タイマー
    this._autoReloadTimer = null;
    // 自動削除タイマー
    this._autoClearTimer = null;
    // オプション
    this._autoReloadEnabled = false;
    this._notifEnabled = false;
    // ステータス
    this._state = TwitSideModule.TL_STATE.STOPPED;
    this._state2 = TwitSideModule.TL_STATE.STOPPED;
    // options_hash
    this._getNewerHash = {};
    this._getOlderHash = {};
    // 回数制限（1分間）
    this._limitCount = {
        retweet : {
            limit : LIMIT_RETWEET_CNT,
            history : []
        }
    };

    // オートクリア開始
    this._autoClearCount = 0;
    this.startAutoClear();

    TwitSideModule.debug.log('timeline.js: initialized columnid '+ JSON.stringify(columnid_str || {}));
};

Timeline.prototype = {
    hiddenRecordIDs: [],

    // オブジェクト削除前のお掃除
    beforeDestroy: function()
    {
        this.stopAutoReload();
        this.stopAutoClear();
        // フレンドクリア
        if (this.isFriend && this._own_userid != this._target_userid)
            switch(this._tl_type) {
            case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.FOLLOW,
                    this._target_userid
                );
                break;
            case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.FOLLOWER,
                    this._target_userid
                );
                break;
            }
        // リストオブジェクト削除
        if (this.listInitialized) delete this._lists;
        // ダイレクトメッセージオブジェクト削除
        if (this.dmInitialized) delete this._dm;
        // ツイートオブジェクト削除
        delete this._tweet;

        TwitSideModule.debug.log('timeline.js: unloaded columnid '+ JSON.stringify(this.columnid || {}));
    },
    // リストオブジェクトの作成
    listInitialize: function(targetid)
    {
        if (this.isList || this.isListMember) {
            this._lists = new Lists(this._tweet, this._tl_type, targetid);
        }
        else
            throw new Error('THIS_TIMELINE_IS_NOT_FOR_LIST');
    },
    // ダイレクトメッセージオブジェクトの作成
    dmInitialize: function()
    {
        if (this.isDirectMessage) {
            this._dm = new DM(this._tweet, this._tl_type);
        }
        else
            throw new Error('THIS_TIMELINE_IS_NOT_FOR_DIRECTMESSAGE');
    },
    // カラムID文字列取得
    get columnid()
    {
        return this._columnid;
    },
    // userid取得
    get userid()
    {
        return this._own_userid;
    },
    // screenname取得
    get screenname()
    {
        return this._own_screenname;
    },
    // target_userid取得
    get targetid()
    {
        return this._target_userid || null;
    },
    // type取得
    get type()
    {
        return this._tl_type;
    },
    // Newer state
    get loadingState()
    {
        return this._state;
    },
    // Older/More state
    get loadingState2()
    {
        return this._state2;
    },
    // リスト使用
    get isList()
    {
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS) return true;
        return false;
    },
    // リストメンバー、購読者
    get isListMember()
    {
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_LISTMEMBER) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER) return true;
        return false;
    },
    // リストオブジェクト作成済
    get listInitialized()
    {
        return this._lists == null ? false : true;
    },
    // フォロー、フォロワー
    get isFriend()
    {
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_FOLLOW) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_FOLLOWER) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_MUTE) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_NORETWEET) return true;
        return false;
    },
    // 検索
    get isSearch()
    {
        if (this._tl_type === TwitSideModule.TL_TYPE.SEARCH) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_SEARCH) return true;
        return false;
    },
    // ダイレクトメッセージ
    get isDirectMessage()
    {
        if (this._tl_type === TwitSideModule.TL_TYPE.DIRECTMESSAGE) return true;
        if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE) return true;
        return false;
    },
    // ダイレクトメッセージオブジェクト作成済
    get dmInitialized()
    {
        return this._dm == null ? false : true;
    },
    // target_userid設定
    set targetid(target_userid)
    {
        // プロフィール（フォロー、フォロワータイムライン）
        if (this.isFriend && target_userid) {
            this._target_userid = target_userid;
            this._index = 0;
        }
        else {
            delete this._target_userid;
            delete this._index;
        }
    },
    // 読み込みパラメータ
    set getNewerHash(options_hash)
    {
        this._getNewerHash = options_hash || {};
    },
    // 読み込みパラメータ
    set getOlderHash(options_hash)
    {
        this._getOlderHash = options_hash || {};
    },
    // 全ツイート取得
    get allTweets()
    {
        var tweets = [];
        for (let id of this.record.ids)
            tweets.push(this.record.data[id]);
        return tweets;
    },
    // 1ツイート取得
    tweetInfo: function(id)
    {
        return this.record.data[id] || {} ;
    },
    // タイムラインオプション
    updateOptions: function(options)
    {
        // 通知
        this._notifEnabled = options.notif || false;
        // mute
        this._muteEnabled = options.mute || false;
        // noretweet
        this._noretweetEnabled = options.noretweet || false;

        // 自動再読込
        this._autoReloadEnabled = options.autoreload || false;
        // 無効時に停止
        if (!options.autoreload) this.stopAutoReload();

        // 起動時読み込み
        if (options.onstart
            && this._state === TwitSideModule.TL_STATE.STOPPED)
            this.getNewer(false);
    },
    // タイムラインステータスの再通知
    renotifyStatus: function()
    {
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : this._state,
            columnid : this._columnid,
            window_type : this._win_type
        });
    },
//    // フレンド更新
//    updateFriends: function()
//    {
//        // mute
//        TwitSideModule.Friends.loadFriendIdList(
//            TwitSideModule.FRIEND_TYPE.MUTE,
//            this._tweet,
//            null, function() {}, function() {}
//        );
//        // noretweet
//        TwitSideModule.Friends.loadFriendIdList(
//            TwitSideModule.FRIEND_TYPE.NORETWEET,
//            this._tweet,
//            null, function() {}, function() {}
//        );
//    },
    // エラー処理
    _reportError: function(message)
    {
        postMessage({
            reason : TwitSideModule.UPDATE.ERROR,
            message : TwitSideModule.Message.transMessage(message),
            columnid : this._columnid,
            window_type : this._win_type
        });
    },

    /**
     * 取得系
     */
    getNewer: function(notif)
    {
        // 通知
        notif = notif == null ? true : notif;
        // リスト
        if (this.isList) {
            // 一覧クリア
            this._removeAllTweet();
            // カーソルリセット
            this._lists.resetListsCursor();
        }
        // リストメンバー
        else if (this.isListMember) {
            // 一覧クリア
            this._removeAllTweet();
            // カーソルリセット
            this._lists.resetListMembersCursor();
        }
        // ダイレクトメッセージ
        else if (this.isDirectMessage) {
            // 一覧クリア
            this._removeAllTweet();
            // カーソルリセット
            this._dm.resetDmCursor();
        }
        // フォロー、フォロワー
        else if (this.isFriend) {
            // 一覧クリア
            this._removeAllTweet();
            // カーソルリセット
            switch (this._tl_type) {
            case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.FOLLOW,
                    this._target_userid
                );
                break;
            case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.FOLLOWER,
                    this._target_userid
                );
                break;
            case TwitSideModule.TL_TYPE.TEMP_MUTE:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.MUTE,
                    this._own_userid
                );
                break;
            case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
                TwitSideModule.Friends.clearFriends(
                    TwitSideModule.FRIEND_TYPE.NORETWEET,
                    this._own_userid
                );
                break;
            }
            // Lookupインデックスリセット
            this._index = 0;
        }

        // Twitterに送信するオプション
        var optionsHash = JSON.parse(JSON.stringify(this._getNewerHash));

        // 言語指定
        if (this.isSearch) {
            if (TwitSideModule.config.getPref('domestic_search'))
                optionsHash.lang = TwitSideModule.ManageUsers.getUserInfo(this._own_userid, 'lang');
        }

        // 重複読み込み禁止
        if (this._state !== TwitSideModule.TL_STATE.STOPPED
            && this._state !== TwitSideModule.TL_STATE.STARTED)
            return false;
        // 自動再読込停止
        this.stopAutoReload();
        // 読み込み開始
        this._state = TwitSideModule.TL_STATE.STARTING;
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : TwitSideModule.TL_STATE.STARTING,
            columnid : this._columnid,
            window_type : this._win_type
        });
        // 読み込み
        this._sendQuery(optionsHash)
            .then(callback.bind(this)).catch(error.bind(this));

        return true;

        function callback(result)
        {
            // more確認
            var more = false,
                len = result.data.length;

            // リスト、フォロー、フォロワー、リストメンバーの場合はカーソル確認
            // タイムラインは結果をフィルタ
            switch (this._tl_type) {
            case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
            case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
            case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
            case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
            case TwitSideModule.TL_TYPE.TEMP_MUTE:
            case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
            case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
            case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
            case TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE:
                more = result.more;
                break;
            default: // それ以外は件数確認
                if (this.record.ids.length
                    && this.record.ids[0] < (ZERO_FILL + result.data[len-1].id_str).slice(-ZERO_FILL_LEN)
                    || !this.record.ids.length
                    && result.data.length > 5)
                    more = true;

                // フィルタ（読み込み済のものは除去）
                result.data = result.data.filter(function(el) {
                    return this.record.ids.indexOf((ZERO_FILL + el.id_str).slice(-ZERO_FILL_LEN)) < 0;
                }, this);
            }

            // 受信データを登録
            var tweets = this._saveTweets(result.data, more, notif),
                nextid = null;

            // 最後のIDの次を検索
            if (tweets.length) {
                let lastidx = this.record.ids.indexOf(tweets[tweets.length - 1].raw.id_str);
                if (lastidx >= 0)
                    nextid = this.record.ids[lastidx + 1];
            }

            postMessage({
                reason : TwitSideModule.UPDATE.TWEET_LOADED,
                tweets : tweets,
                nextid : nextid,
                tl_type : this._tl_type,
                columnid : this._columnid,
                scroll_top : true,
                window_type : this._win_type
            });

            this._state = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.STOPPED,
                columnid : this._columnid,
                window_type : this._win_type
            });

            // 自動再読込開始
            if (this._autoReloadEnabled)
                this.startAutoReload();
        }
        function error(result)
        {
            this._state = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.STOPPED,
                columnid : this._columnid,
                window_type : this._win_type,
                message : TwitSideModule.Message.transMessage(result)
            });
        }
    },
    getOlder: function()
    {
        var moreid = this.record.ids[this.record.ids.length-1],
            maxid = this.record.ids[this.record.ids.length-2];
        // moreidがmoreじゃないとき（読み込み完了時）
        if (!/_more$/.test(moreid))
            return true;

        // Twitterに送信するオプション
        var optionsHash = JSON.parse(JSON.stringify(this._getOlderHash));

        // リスト、フォロー、フォロワー、リストメンバー、ダイレクトメッセージの場合はoptionsHashを指定しない
        if (this.isList || this.isFriend || this.isListMember || this.isDirectMessage) {
            optionsHash = {};
        }
        else {
            // 読み込み範囲（これより小さい＝古い）
            optionsHash.max_id = maxid;
        }

        // 重複読み込み禁止
        if (this._state2 !== TwitSideModule.TL_STATE.STOPPED)
            return false;
        // 読み込み開始
        this._state2 = TwitSideModule.TL_STATE.LOADING;
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : TwitSideModule.TL_STATE.LOADING,
            columnid : this._columnid,
            window_type : this._win_type
        });
        // 読み込み
        this._sendQuery(optionsHash)
            .then(callback.bind(this)).catch(error.bind(this));

        return true;

        function callback(result)
        {
            // more確認
            var more = false;

            // リスト、フォロー、フォロワー、リストメンバー、ダイレクトメッセージの場合はカーソル確認
            switch (this._tl_type) {
            case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
            case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
            case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
            case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
            case TwitSideModule.TL_TYPE.TEMP_MUTE:
            case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
            case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
            case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
            case TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE:
                more = result.more;
                break;
            default: // それ以外は5件以上取得時
                if (result.data.length > 5)
                    more = true;

                // フィルタ（読み込み済のものは除去）
                result.data = result.data.filter(function(el) {
                    return this.record.ids.indexOf((ZERO_FILL + el.id_str).slice(-ZERO_FILL_LEN)) < 0;
                }, this);
            }

            // 受信データを登録
            var tweets = this._saveTweets(result.data, more);
            postMessage({
                reason : TwitSideModule.UPDATE.TWEET_LOADED,
                tweets : tweets,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });

            this._removeTweet(moreid);
            this._state2 = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.LOADED,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            this._state2 = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.LOADED,
                columnid : this._columnid,
                window_type : this._win_type,
                message : TwitSideModule.Message.transMessage(result)
            });
        }
    },
    getMore: function(moreid)
    {
        // リスト、フォロー、フォロワー、リストメンバー、ダイレクトメッセージの場合はgetOlder
        if (this.isList || this.isFriend || this.isListMember || this.isDirectMessage) {
            this.getOlder();
            return true;
        }
        // Twitterに送信するオプション
        var optionsHash = JSON.parse(JSON.stringify(this._getOlderHash)),
            maxindex = this.record.ids.indexOf(moreid) - 1,
            minindex = maxindex + 2;

        if (minindex >= this.record.ids.length)
            return this.getOlder();

        var maxid = this.record.ids[maxindex],
            minid = this.record.ids[minindex];
        // 読み込み範囲（これより小さい＝古い）
        optionsHash.max_id = maxid;

        // 重複読み込み禁止
        if (this._state2 !== TwitSideModule.TL_STATE.STOPPED)
            return false;
        // 読み込み開始
        this._state2 = TwitSideModule.TL_STATE.LOADING;
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : TwitSideModule.TL_STATE.LOADING,
            columnid : this._columnid,
            window_type : this._win_type
        });
        // 読み込み
        this._sendQuery(optionsHash)
            .then(callback.bind(this)).catch(error.bind(this));

        return true;

        function callback(result)
        {
            // more確認
            let more = false,
                len = result.data.length;
            if (minid < result.data[len-1].id_str)
                more = true;

            // フィルタ（読み込み済のものは除去）
            result.data = result.data.filter(function(el) {
                return this.record.ids.indexOf((ZERO_FILL + el.id_str).slice(-ZERO_FILL_LEN)) < 0;
            }, this);

            // 受信データを登録
            var tweets = this._saveTweets(result.data, more),
                nextid = null;

            // 最後のIDの次を検索
            if (tweets.length) {
                let lastidx = this.record.ids.indexOf(tweets[tweets.length - 1].raw.id_str);
                if (lastidx >= 0)
                    nextid = this.record.ids[lastidx + 1];
            }

            postMessage({
                reason : TwitSideModule.UPDATE.TWEET_LOADED,
                tweets : tweets,
                nextid : nextid,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });

            this._removeTweet(moreid);
            this._state2 = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.LOADED,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            this._state2 = TwitSideModule.TL_STATE.STOPPED;
            postMessage({
                reason : TwitSideModule.UPDATE.STATE_CHANGED,
                state : TwitSideModule.TL_STATE.LOADED,
                columnid : this._columnid,
                window_type : this._win_type,
                message : TwitSideModule.Message.transMessage(result)
            });
        }
    },

    /**
     * 自動読み込み
     */
    startAutoReload: function()
    {
        // 重複読み込み禁止
        if (this._state === TwitSideModule.TL_STATE.STARTED)
            return;

        var interval = TwitSideModule.config.getPref('autoreload_time') * 1000;
        if (this._tl_type === TwitSideModule.TL_TYPE.SEARCH
            || this._tl_type === TwitSideModule.TL_TYPE.TEMP_SEARCH)
            interval = TwitSideModule.config.getPref('autosearch_time') * 1000;

        // 自動更新有効化ステータス
        this._state = TwitSideModule.TL_STATE.STARTED;
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : TwitSideModule.TL_STATE.STARTED,
            columnid : this._columnid,
            window_type : this._win_type
        });

        this._autoReloadTimer = setTimeout(() => {
            // 取得
            if (!this.getNewer()) {
                // 失敗時
                this._state = TwitSideModule.TL_STATE.STARTED;
                this.startAutoReload();
            }
        }, interval);
    },
    stopAutoReload: function()
    {
        if (this._autoReloadTimer != null)
            clearTimeout(this._autoReloadTimer);
        this._autoReloadTimer = null;

        // 自動更新有効化ステータス
        this._state = TwitSideModule.TL_STATE.STOPPED;
        postMessage({
            reason : TwitSideModule.UPDATE.STATE_CHANGED,
            state : TwitSideModule.TL_STATE.STOPPED,
            columnid : this._columnid,
            window_type : this._win_type
        });
    },

    /**
     * 自動クリア
     */
    voteAutoClear: function(vote)
    {
        // MAIN以外はは対象外
        if (this._win_type != TwitSideModule.WINDOW_TYPE.MAIN) return;

        // true なら最上部じゃないカラム
        if (vote) this._autoClearCount++;
    },
    startAutoClear: function()
    {
        // MAIN以外はは対象外
        if (this._win_type != TwitSideModule.WINDOW_TYPE.MAIN) return;

        // タイマー設定
        this._autoClearTimer = setInterval(() => {
            this._autoClearCount = 0;

            // 投票依頼
            postMessage({
                reason : TwitSideModule.UPDATE.VOTE_REQUIRED,
                columnid : this._columnid,
                window_type : this._win_type
            });

            // 5秒待ち
            setTimeout(() => {
                // 過去ツイート削除
                if (!this._autoClearCount)
                    this._clearOlder();
            }, autoClearVoteWait);
        }, autoClearWait);
    },
    stopAutoClear: function()
    {
        if (this._autoClearTimer != null) clearInterval(this._autoClearTimer);
        this._autoClearTimer = null;
    },

    /**
     * ツイート操作系
     */
    retweet: function(tweetid, parentid)
    {
        // 回数制限
        var limitHistory = JSON.parse(TwitSideModule.config.getPref('limit_retweet'));
        if (!TwitSideModule.config.getPref('debug')
            && limitHistory.length >= LIMIT_RETWEET_CNT
            && TwitSideModule.text.getUnixTime() - (limitHistory[0] || 0) < LIMIT_RETWEET_TERM) {
            this._reportError('retweetLimit');
            return;
        }

        this._tweet.retweet({}, tweetid)
            .then(success.bind(this)).catch(error.bind(this));

        function success(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'retweet',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            // 回数制限
            while (limitHistory.length >= LIMIT_RETWEET_CNT) {
                limitHistory.shift();
            }
            limitHistory.push(TwitSideModule.text.getUnixTime());
            TwitSideModule.config.setPref('limit_retweet', JSON.stringify(limitHistory));

            while (this._limitCount.retweet.history.length >= this._limitCount.retweet.limit) {
                this._limitCount.retweet.history.shift();
            }
            this._limitCount.retweet.history.push(TwitSideModule.text.getUnixTime());

            // ツイート再読込
            this._tweet.show({ id : parentid || tweetid })
                .then(callback.bind(this)).catch(error.bind(this));
        }
        function callback(result)
        {
            // 受信データを登録
            var tweets = this._saveTweets([result.data]);
            postMessage({
                reason : TwitSideModule.UPDATE.REPLACE_LOADED,
                tweets : tweets,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'retweet',
                result : 'failed',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },
    favorite: function(tweetid, sw, parentid)
    {
        if (sw)
            this._tweet.favorite({ id : tweetid })
            .then(success.bind(this)).catch(error.bind(this));
        else
            this._tweet.unfavorite({ id : tweetid })
            .then(success.bind(this)).catch(error.bind(this));

        function success(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : sw ? 'favorite' : 'unfavorite',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            if (this._tl_type === TwitSideModule.TL_TYPE.FAVORITE
                || this._tl_type === TwitSideModule.TL_TYPE.TEMP_FAVORITE)
                this._removeTweet(tweetid);
            else
                // ツイート再読込
                this._tweet.show({ id : parentid || tweetid })
                .then(callback.bind(this)).catch(error.bind(this));
        }
        function callback(result)
        {
            // 受信データを登録
            var tweets = this._saveTweets([result.data]);
            postMessage({
                reason : TwitSideModule.UPDATE.REPLACE_LOADED,
                tweets : tweets,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : sw ? 'favorite' : 'unfavorite',
                result : 'failed',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },
    replies: function(tweetid, parentid, replyid)
    {
        // 最初のツイート
        if (!replyid) {
            // 通常ツイートの会話
            if (!parentid) {
                if (!this.record.data[tweetid].raw.retweeted_status)
                    replyid = this.record.data[tweetid].raw.in_reply_to_status_id_str;
                else
                    replyid = this.record.data[tweetid].raw.retweeted_status.in_reply_to_status_id_str;
            }
            // 引用ツイートの会話
            else {
                if (!this.record.data[parentid].raw.retweeted_status)
                    replyid = this.record.data[parentid].raw.quoted_status.in_reply_to_status_id_str;
                else
                    replyid = this.record.data[parentid].raw.retweeted_status.quoted_status.in_reply_to_status_id_str;
            }
        }

        this._tweet.show({ id : replyid })
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // ツイートは保存しない
            var data = {meta : {}, raw : {}};
            data.meta = this._getMetadata(result.data);
            data.raw = result.data;

            postMessage({
                reason : TwitSideModule.UPDATE.REPLY_LOADED,
                original_tweetid : tweetid,
                original_parentid : parentid,
                reply : data,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });

            // 続きを読み込み
            if (result.data.in_reply_to_status_id_str)
                this.replies(tweetid, parentid, result.data.in_reply_to_status_id_str);
        }
        function error(result)
        {
            this._reportError(result);
        }
    },
    destroy: function(tweetid, parentid)
    {
        // DMはそのまま削除
        if (this.isDirectMessage)
            this._tweet.destroyDm2({ id : tweetid })
            .then(callback_mine.bind(this)).catch(error.bind(this));

        // リスト
        else if (this.isList)
            this._tweet.destroyList({ list_id : tweetid })
            .then(callback_list.bind(this)).catch(error.bind(this));

        // ミュート一覧
        else if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_MUTE)
            TwitSideModule.Friends.updateFriendship(
                TwitSideModule.FRIEND_TYPE.MUTE,
                tweetid,
                false,
                this._tweet
            ).then(callback_friend.bind(this)).catch(error.bind(this));

        // リツイート非表示一覧
        else if (this._tl_type === TwitSideModule.TL_TYPE.TEMP_NORETWEET)
            TwitSideModule.Friends.updateFriendship(
                TwitSideModule.FRIEND_TYPE.MUTE,
                tweetid,
                false,
                this._tweet
            ).then(callback_friend.bind(this)).catch(error.bind(this));

        // IDが無い場合削除判断できない
        else if (this.record.ids.indexOf(tweetid) < 0)
            return;

        // parentidがない時
        else if (!parentid) {
            // リツイート元ツイートの場合はリツイートしたIDを確認
            if (this.record.data[tweetid].raw.retweeted
                && !this.record.data[tweetid].raw.retweeted_status)
                this._tweet.show({
                    id : this.record.data[tweetid].raw.id_str,
                    include_my_retweet : 'true'
                }).then(callback_show.bind(this)).catch(error.bind(this));

            // 自分のツイートはそのまま削除
            else if (this.record.data[tweetid].meta.isMine)
                this._tweet.destroy({ }, tweetid)
                .then(callback_mine.bind(this)).catch(error.bind(this));
        }
        // parentidがある時
        else if (parentid) {
            // リツイート元ツイートの場合はリツイートしたIDを確認
            if (this.record.data[parentid].raw.quoted_status.retweeted
                && !this.record.data[parentid].raw.quoted_status.retweeted_status)
                this._tweet.show({
                    id : this.record.data[parentid].raw.quoted_status.id_str,
                    include_my_retweet : 'true'
                }).then(callback_show.bind(this)).catch(error.bind(this));

            // 自分のツイートはそのまま削除
            else if (this.record.data[parentid].meta.quote.isMine)
                this._tweet.destroy({ }, tweetid)
                .then(callback_mine.bind(this)).catch(error.bind(this));
        }

        else
            return;

        // コールバック
        function callback_show(result)
        {
            // リツイートしたことが確認出来た
            if (result.data.current_user_retweet) {
                this._tweet.destroy({ }, result.data.current_user_retweet.id_str)
                    .then(callback_retweet.bind(this)).catch(error.bind(this));
            }
        }
        // リストの削除
        function callback_list(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'destroyList',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            this._removeTweet(tweetid);
        }
        // フレンドの削除
        function callback_friend(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'destroyUser',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            this._removeTweet(tweetid);
        }
        // リツイートの削除
        function callback_retweet(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'destroy',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            // 削除
            this._removeTweet(result.data.id_str);
            // リツイートされたツイートの再読込
            this._tweet.show({ id : parentid || tweetid })
                .then(callback.bind(this)).catch(error.bind(this));
        }
        function callback(result)
        {
            // 受信データを登録
            var tweets = this._saveTweets([result.data]);
            postMessage({
                reason : TwitSideModule.UPDATE.REPLACE_LOADED,
                tweets : tweets,
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        // 自分のツイートを削除
        function callback_mine(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'destroy',
                result : 'success',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            // 削除
            this._removeTweet(tweetid);
            // 引用元ツイートの再読込
            if (parentid)
                this._tweet.show({ id : parentid })
                .then(callback.bind(this)).catch(error.bind(this));
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'destroy',
                result : 'failed',
                id : tweetid,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },
    retweeters: function(tweetid, parentid)
    {
        var origid;
        // 通常ツイート
        if (!parentid) {
            if (!this.record.data[tweetid].raw.retweeted_status)
                origid = this.record.data[tweetid].raw.id_str;
            else
                origid = this.record.data[tweetid].raw.retweeted_status.id_str;
        }
        // 引用ツイート
        else {
            if (!this.record.data[parentid].raw.retweeted_status)
                origid = this.record.data[parentid].raw.quoted_status.id_str;
            else
                origid = this.record.data[parentid].raw.retweeted_status.quoted_status.id_str;
        }

        this._tweet.retweeters({ id : origid, count : 100 })
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // メタデータ更新
            if (!parentid) {
                this.record.data[tweetid].meta.retweeters = [];

                for (let rt of (result.data)) {
                    this.record.data[tweetid].meta.retweeters.push({
                        src : rt.user.profile_image_url_https,
                        title : '@' + rt.user.screen_name
                    });
                }
            }
            else {
                this.record.data[parentid].meta.quote.retweeters = [];

                for (let rt of (result.data)) {
                    this.record.data[parentid].meta.quote.retweeters.push({
                        src : rt.user.profile_image_url_https,
                        title : '@' + rt.user.screen_name
                    });
                }
            }

            postMessage({
                reason : TwitSideModule.UPDATE.REPLACE_LOADED,
                tweets : [this.record.data[parentid || tweetid]],
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            this._reportError(result);
        }
    },

    /**
     * リスト系
     */
    // リスト作成
    // return Promise
    createList: function(listinfo)
    {
        var optionsHash = listinfo;
        return this._tweet.createList(optionsHash)
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'createList',
                result : 'success',
                id : result.data.id_str,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'createList',
                result : 'failed',
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
            return Promise.reject();
        }
    },

    updateList: function(listinfo)
    {
        var optionsHash = listinfo;
        return this._tweet.updateList(optionsHash)
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'updateList',
                result : 'success',
                id : result.data.id_str,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'updateList',
                result : 'failed',
                id : listinfo.list_id,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
            return Promise.reject();
        }
    },

    // リストの購読
    subscribeList: function(listid)
    {
        this._tweet.subscribeList({ list_id : listid })
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'subscribeList',
                result : 'success',
                id : listid,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'subscribeList',
                result : 'failed',
                id : listid,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },
    // リストの購読解除
    unsubscribeList: function(listid)
    {
        this._tweet.unsubscribeList({ list_id : listid })
            .then(callback.bind(this)).catch(error.bind(this));

        function callback(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'unsubscribeList',
                result : 'success',
                id : listid,
                columnid : this._columnid,
                window_type : this._win_type
            });
            this._removeTweet(listid);
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : 'unsubscribeList',
                result : 'failed',
                id : listid,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },

    /**
     * ツイート取得
     */
    _sendQuery: function(optionsHash)
    {
        if ((this.isList || this.isListMember)
            && !this.listInitialized) {
            this._reportError('LIST_IS_NOT_INITIALIZED');
            return Promise.reject();
        }
        if (this.isDirectMessage
            && !this.dmInitialized) {
            this._reportError('DM_IS_NOT_INITIALIZED');
            return Promise.reject();
        }

        switch (this._tl_type) {
        case TwitSideModule.TL_TYPE.TIMELINE:
            return this._tweet.timeline(optionsHash);
        case TwitSideModule.TL_TYPE.CONNECT:
            return this._tweet.connect(optionsHash);
        case TwitSideModule.TL_TYPE.RETWEETED:
            return this._tweet.retweeted(optionsHash);
        case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
        case TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE:
            return this._dm.getDm(optionsHash);
        case TwitSideModule.TL_TYPE.LISTTIMELINE:
            return this._tweet.listTimeline(optionsHash);
        case TwitSideModule.TL_TYPE.TEMP_USERTIMELINE:
            return this._tweet.userTimeline(optionsHash);
        case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
        case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
        case TwitSideModule.TL_TYPE.TEMP_MUTE:
        case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
            return this._getFriends(optionsHash);
        case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
        case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
        case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            return this._lists.getListsList(optionsHash);
        case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
        case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            return this._lists.getListMembers(optionsHash);
        case TwitSideModule.TL_TYPE.FAVORITE:
        case TwitSideModule.TL_TYPE.TEMP_FAVORITE:
            return this._tweet.favoritelist(optionsHash);
        case TwitSideModule.TL_TYPE.SEARCH:
        case TwitSideModule.TL_TYPE.TEMP_SEARCH:
            return this._tweet.search(optionsHash)
                .then((result) => {
                    result.data = result.data.statuses;
                    return result;
                });
        }
        return Promise.reject();
    },
    // フォロー、フォロワー向け（tweetの代わり）
    _getFriends: function(optionsHash)
    {
        switch (this._tl_type) {
        case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
            // ID未取得時
            let follows = TwitSideModule.Friends.getFollows(this._target_userid);
            if (!follows) {
                return TwitSideModule.Friends.loadFriendIdList(
                    TwitSideModule.FRIEND_TYPE.FOLLOW,
                    this._tweet,
                    this._target_userid
                ).then(() => {
                    return this._getFriends(optionsHash);
                });
            }
            // ID取得済み
            // 続きLookup
            else if (follows.length > this._index) {
                return TwitSideModule.Friends.lookup(
                    follows.slice(this._index, this._index+100),
                    this._tweet
                ).then((result) => {
                    this._index += (result.data).length;
                    // more確認
                    var more = false;
                    if (TwitSideModule.Friends.hasMoreFollow(this._target_userid)
                        || TwitSideModule.Friends.getFollows(this._target_userid).length > this._index)
                        more = true;
                    return Promise.resolve({
                        status : result.status,
                        data : (result.data),
                        more : more
                    });
                });
            }
            // 取得分Lookup済み
            else {
                if (TwitSideModule.Friends.hasMoreFollow(this._target_userid)) {
                    return TwitSideModule.Friends.loadFriendIdList(
                        TwitSideModule.FRIEND_TYPE.FOLLOW,
                        this._tweet,
                        this._target_userid
                    ).then(() => {
                        return this._getFriends(optionsHash);
                    });
                }
                else {
                    return Promise.resolve({
                        status : null,
                        data : [],
                        more : false
                    });
                }
            }

        case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
            // ID未取得時
            let followers = TwitSideModule.Friends.getFollowers(this._target_userid);
            if (!followers) {
                return TwitSideModule.Friends.loadFriendIdList(
                    TwitSideModule.FRIEND_TYPE.FOLLOWER,
                    this._tweet,
                    this._target_userid
                ).then(() => {
                    return this._getFriends(optionsHash);
                });
            }
            // ID取得済み
            // 続きLookup
            else if (followers.length > this._index) {
                return TwitSideModule.Friends.lookup(
                    followers.slice(this._index, this._index+100),
                    this._tweet
                ).then((result) => {
                    this._index += (result.data).length;
                    // more確認
                    var more = false;
                    if (TwitSideModule.Friends.hasMoreFollower(this._target_userid)
                        || TwitSideModule.Friends.getFollowers(this._target_userid).length > this._index)
                        more = true;
                    return Promise.resolve({
                        status : result.status,
                        data : (result.data),
                        more : more
                    });
                });
            }
            // 取得分Lookup済み
            else {
                if (TwitSideModule.Friends.hasMoreFollower(this._target_userid)) {
                    return TwitSideModule.Friends.loadFriendIdList(
                        TwitSideModule.FRIEND_TYPE.FOLLOWER,
                        this._tweet,
                        this._target_userid
                    ).then(() => {
                        return this._getFriends(optionsHash);
                    });
                }
                else {
                    return Promise.resolve({
                        status : null,
                        data : [],
                        more : false
                    });
                }
            }

        case TwitSideModule.TL_TYPE.TEMP_MUTE:
            // ID未取得時
            let mutes = TwitSideModule.Friends.getMutes(this._own_userid);
            if (!mutes) {
                return TwitSideModule.Friends.loadFriendIdList(
                    TwitSideModule.FRIEND_TYPE.MUTE,
                    this._tweet,
                    this._own_userid
                ).then(() => {
                    return this._getFriends(optionsHash);
                });
            }
            // ID取得済み
            // 続きLookup
            else if (mutes.length > this._index) {
                return TwitSideModule.Friends.lookup(
                    mutes.slice(this._index, this._index+100),
                    this._tweet
                ).then((result) => {
                    this._index += (result.data).length;
                    // more確認
                    var more = false;
                    if (TwitSideModule.Friends.hasMoreMute(this._own_userid)
                        || TwitSideModule.Friends.getMutes(this._own_userid).length > this._index)
                        more = true;
                    return Promise.resolve({
                        status : result.status,
                        data : (result.data),
                        more : more
                    });
                });
            }
            // 取得分Lookup済み
            else {
                // （muteは全IDを取得しているはずなので基本的に続きはない）
                if (TwitSideModule.Friends.hasMoreMute(this._own_userid)) {
                    return TwitSideModule.Friends.loadFriendIdList(
                        TwitSideModule.FRIEND_TYPE.MUTE,
                        this._tweet,
                        this._own_userid
                    ).then(() => {
                        return this._getFriends(optionsHash);
                    });
                }
                else {
                    return Promise.resolve({
                        status : null,
                        data : [],
                        more : false
                    });
                }
            }

        case TwitSideModule.TL_TYPE.TEMP_NORETWEET:
            // ID未取得時
            let noretweets = TwitSideModule.Friends.getNoretweets(this._own_userid);
            if (!noretweets) {
                return TwitSideModule.Friends.loadFriendIdList(
                    TwitSideModule.FRIEND_TYPE.NORETWEET,
                    this._tweet,
                    this._own_userid
                ).then(() => {
                    return this._getFriends(optionsHash);
                });
            }
            // ID取得済み
            // 続きLookup
            else if (noretweets.length > this._index) {
                return TwitSideModule.Friends.lookup(
                    noretweets.slice(this._index, this._index+100),
                    this._tweet
                ).then((result) => {
                    this._index += (result.data).length;
                    // more確認
                    var more = false;
                    if (TwitSideModule.Friends.hasMoreNoretweet(this._own_userid)
                        || TwitSideModule.Friends.getNoretweets(this._own_userid).length > this._index)
                        more = true;
                    return Promise.resolve({
                        status : result.status,
                        data : (result.data),
                        more : more
                    });
                });
            }
            // 取得分Lookup済み（noretweetはcursorがない）
            else {
                return Promise.resolve({
                    status : null,
                    data : [],
                    more : false
                });
            }

        default:
            return Promise.reject();
        }
    },

    // ツイートを保存して変更があったid一覧を返す
    _saveTweets: function(data, more, notif)
    {
        // 更新したツイートID
        var tweets = [],
            lastidx = null, // 最新ツイートのインデックス
            i = 0;

        // リスト、フォロー、フォロワー、リストメンバーの場合はソートしない
        if (this.isList || this.isFriend || this.isListMember) {
            for (let datum of data) {
                // idを0埋め文字列
                datum.id_str = (ZERO_FILL + datum.id_str).slice(-ZERO_FILL_LEN);

                this.record.ids.push(datum.id_str);
                this.record.data[datum.id_str] = {meta : {}, raw : datum};

                // リストはメタデータ確認
                if (this.isList)
                    this.record.data[datum.id_str].meta = this._getListMetadata(datum);

                // 更新データ（取得順）
                tweets.push(this.record.data[datum.id_str]);
            }
            lastidx = this.record.ids.length+1;
        }
        // ダイレクトメッセージの場合はソートしない
        else if (this.isDirectMessage) {
            // dataは新しいもの順
            for (let datum of data) {
                // idを0埋め文字列 id:string
                datum.id_str = (ZERO_FILL + datum.id).slice(-ZERO_FILL_LEN);

                this.record.ids.push(datum.id_str);
                this.record.data[datum.id_str] = {meta : {}, raw : datum};

                // メタデータ確認
                this.record.data[datum.id_str].meta = this._getDmMetadata(datum);

                // 更新データ（新しいもの順）
                tweets.push(this.record.data[datum.id_str]);
            }
            lastidx = this.record.ids.length+1;
        }
        else {
            let mutes = this._muteEnabled
                ? TwitSideModule.Friends.getMutes(this._own_userid) || []
                : [],
                noretweets = this._noretweetEnabled
                ? TwitSideModule.Friends.getNoretweets(this._own_userid) || []
                : [];

            // dataは新しいもの順
            for (let datum of data) {
                // idを0埋め文字列
                datum.id_str = (ZERO_FILL + datum.id_str).slice(-ZERO_FILL_LEN);
                if (datum.retweeted_status)
                    datum.retweeted_status.id_str = (ZERO_FILL + datum.retweeted_status.id_str).slice(-ZERO_FILL_LEN);
                if (datum.quoted_status)
                    datum.quoted_status.id_str = (ZERO_FILL + datum.quoted_status.id_str).slice(-ZERO_FILL_LEN);
                if (datum.retweeted_status && datum.retweeted_status.quoted_status)
                    datum.retweeted_status.quoted_status.id_str =
                    (ZERO_FILL + datum.retweeted_status.quoted_status.id_str).slice(-ZERO_FILL_LEN);

                // muteの時は破棄
                if (mutes.length
                    && mutes.indexOf(datum.retweeted_status
                                     ? datum.retweeted_status.user.id_str
                                     : datum.user.id_str) >= 0)
                    continue;
                // noretweetの時は破棄
                if (datum.retweeted_status
                    && noretweets.length
                    && noretweets.indexOf(datum.user.id_str) >= 0)
                    continue;

                if (this.record.ids.indexOf(datum.id_str) < 0) {
                    // ID一覧更新
                    let len = this.record.ids.length;

                    // 挿入ソート（前から、新しいものから）
                    for (i; i<=len; i++) {
                        // 末尾
                        if (i===len) {
                            this.record.ids.push(datum.id_str);
                            lastidx = i+1;
                            break;
                        }
                        if (this.record.ids[i] < datum.id_str) {
                            this.record.ids.splice(i, 0, datum.id_str);
                            lastidx = i+1;
                            break;
                        }
                    }
                }

                this.record.data[datum.id_str] = {meta : {}, raw : datum};

                // メタデータ確認
                let meta = this._getMetadata(datum);
                this.record.data[datum.id_str].meta = meta;

                // TwitSideミュート
                if (TwitSideModule.config.getPref('mute_ts')) {
                    if (TwitSideModule.Mutes.checkMuteUsers(meta.userids)) {
                        this.record.ids.splice(i, 1);
                        delete this.record.data[datum.id_str];
                        continue;
                    }
                    if (TwitSideModule.Mutes.checkMuteKeywords(meta.text)) {
                        this.record.ids.splice(i, 1);
                        delete this.record.data[datum.id_str];
                        continue;
                    }
                }

                // 通知チェック
                if (notif
                    && this._tl_type === TwitSideModule.TL_TYPE.TIMELINE
                    && this._notifEnabled) {
                    // 自分宛
                    if (meta.isForMe && ! datum.retweeted_status
                        && TwitSideModule.config.getPref('notif_forme')) {
                        TwitSideModule.Message.showNotification({
                            userid : this._own_userid,
                            title : browser.i18n.getMessage(
                                'newMention', ['@' + datum.user.screen_name]),
                            icon : datum.user.profile_image_url_https.replace('_normal.', '.'),
                            content : meta.text
                        });
                    }
                    // 自分宛リツイート
                    else if (meta.isForMe && datum.retweeted_status
                             && TwitSideModule.config.getPref('notif_forme_retweeted')) {
                        TwitSideModule.Message.showNotification({
                            userid : this._own_userid,
                            title : browser.i18n.getMessage(
                                'newRetweet', ['@' + datum.user.screen_name]),
                            icon : datum.user.profile_image_url_https.replace('_normal.', '.'),
                            content : meta.text
                        });
                    }
                }

                // 更新データ（新しいもの順）
                tweets.push(this.record.data[datum.id_str]);
            }

            // 通知チェック
            // すべてのツイート（1つのみ表示）
            if (notif
                && this._tl_type === TwitSideModule.TL_TYPE.TIMELINE
                && this._notifEnabled
                && TwitSideModule.config.getPref('notif_all')
                && data[0]) {
                let target_user = data[0].retweeted_status
                    ? data[0].retweeted_status.user.screen_name
                    : data[0].user.screen_name;
                let target_user_icon = data[0].retweeted_status
                    ? data[0].retweeted_status.user.profile_image_url_https.replace('_normal.', '.')
                    : data[0].user.profile_image_url_https.replace('_normal.', '.');
                // idを0埋め文字列
                let datum_id_str = (ZERO_FILL + data[0].id_str).slice(-ZERO_FILL_LEN);
                TwitSideModule.Message.showNotification({
                    userid : this._own_userid,
                    title : browser.i18n.getMessage(
                        'newTweet', ['@' + target_user]),
                    icon : target_user_icon,
                    content : this.record.data[datum_id_str].meta.text
                }, true);
            }
            // 検索
            if (notif
                && this._tl_type === TwitSideModule.TL_TYPE.SEARCH
                && this._notifEnabled
                && tweets.length)
                TwitSideModule.Message.showNotification({
                    userid : this._own_userid,
                    title : browser.i18n.getMessage(
                        'newSearched', [tweets.length]),
                    content : browser.i18n.getMessage('newSearchQuery')
                        + this._getNewerHash.q
                }, true);
        }

        // more格納
        if (more && data.length) {
            let moreid = data[data.length-1].id_str + '_more';
            this.record.data[moreid] = {
                meta : {},
                raw : {
                    id_str : moreid
                }};
            this.record.ids.splice(lastidx, 0, moreid);
            tweets.push(this.record.data[moreid]);
        }
        return tweets;
    },
    // メタデータの作成
    _getMetadata: function(datum)
    {
        var meta = {};

        meta.isMine = (datum.user.id_str === this._own_userid);
        meta.isForMe = false;
        meta.pics = [];

        // エンティティ
        if (datum.retweeted_status) {
            meta.entities = datum.retweeted_status.extended_tweet
                && datum.retweeted_status.extended_tweet.entities
                || datum.retweeted_status.entities;
            // extened_entitiesが無くても例外を投げない
            Object.assign(meta.entities, datum.retweeted_status.extended_entities || {});
        }
        else {
            meta.entities = datum.extended_tweet
                && datum.extended_tweet.entities
                || datum.entities;
            // extened_entitiesが無くても例外を投げない
            Object.assign(meta.entities, datum.extended_entities || {});
        }

        // URLの処理
        for (let url of meta.entities.urls) {
            // サードパーティ
            let urlResult = this._analyzePicURL(datum.id_str, url.expanded_url);
            if (urlResult) meta.pics.push(urlResult);
        }

        // テキスト
        if (datum.retweeted_status) {
            meta.text = datum.retweeted_status.full_text // ストリーム
                || datum.retweeted_status.extended_tweet
                && datum.retweeted_status.extended_tweet.full_text // 拡張REST（ストリーム・リツイート）
                || datum.retweeted_status.text; // 通常
        }
        else {
            meta.text = datum.full_text // ストリーム
                || datum.extended_tweet && datum.extended_tweet.full_text // 拡張REST
                || datum.text; // 通常
        }

        // ユーザ一覧
        var screennamelist = [],  // ツイートに含まれるすべてのユーザ（リツイートした人も含む）
            userids = [];         // 投稿者ユーザID（ミュート用）

        // 普通のツイート
        if (!datum.retweeted_status) {
            screennamelist.push('@' + datum.user.screen_name);
            userids.push(datum.user.id_str);
            // 最近のスクリーンネーム
            TwitSideModule.Friends.updateLatestFriends(datum.user);
        }
        // リツイート
        else {
            // 元ツイート
            screennamelist.push('@' + datum.retweeted_status.user.screen_name);
            userids.push(datum.retweeted_status.user.id_str);
            // 最近のスクリーンネーム
            TwitSideModule.Friends.updateLatestFriends(datum.retweeted_status.user);
            // リツイート
            screennamelist.push('@' + datum.user.screen_name);
            userids.push(datum.user.id_str);
            // 最近のスクリーンネーム
            TwitSideModule.Friends.updateLatestFriends(datum.user);
        }
        // メンション
        for (let mention of meta.entities.user_mentions) {
            screennamelist.push('@' + mention.screen_name);
            if (mention.id_str === this._own_userid)
                // 自分宛
                meta.isForMe = true;
        }
        // 自分宛
        if (datum.in_reply_to_user_id_str === this._own_userid)
            meta.isForMe = true;

        meta.screennames = screennamelist.filter((x, i, self) => self.indexOf(x) === i); // 重複削除
        meta.userids = userids;

        // Quote
        if (datum.retweeted_status
            && datum.retweeted_status.is_quote_status
            && datum.retweeted_status.quoted_status)
            meta.quote = this._getMetadata(datum.retweeted_status.quoted_status);
        else if (datum.is_quote_status && datum.quoted_status)
            meta.quote = this._getMetadata(datum.quoted_status);

        return meta;
    },
    // メタデータの作成（DM）
    _getDmMetadata: function(datum)
    {
        var meta = {};

        meta.isMine = (datum.message_create.sender_id === this._own_userid);
        meta.isForMe = (datum.message_create.target.recipient_id === this._own_userid);
        meta.pics = [];

        // エンティティ
        if (datum.message_create.message_data.entities) {
            meta.entities = datum.message_create.message_data.entities;
            // サードパーティのメディア
            for (let url of meta.entities.urls || []) {
                // サードパーティ
                let urlResult = this._analyzePicURL(datum.id_str, url.expanded_url);
                if (urlResult) meta.pics.push(urlResult);
            }
        }
        // 添付
        if (datum.message_create.message_data.attachment) {
            meta.attachment = datum.message_create.message_data.attachment;
            // メディア
            for (let media of [meta.attachment.media] || []) {
                // Twitter
                let urlResult = this._analyzePicURL(datum.id_str, media.media_url_https);
                if (urlResult) meta.pics.push(urlResult);
            }
        }

        var screennamelist = [];

        var sender = TwitSideModule.Friends.searchFriend(datum.message_create.sender_id),
            recipient = TwitSideModule.Friends.searchFriend(datum.message_create.target.recipient_id);

        // スクリーンネームがすぐに判明する場合
        if (sender && recipient) {
            if (sender !== recipient) {
                screennamelist.push('@' + sender.screen_name);
                screennamelist.push('@' + recipient.screen_name);
            }
            else {
                screennamelist.push('@' + sender.screen_name);
            }
            meta.sender = sender;
            meta.recipient = recipient;
            meta.screennames = screennamelist;
        }

        // スクリーンネームを取得する必要がある場合
        else {
            let lookup = [];
            if (!sender) lookup.push(datum.message_create.sender_id);
            if (!recipient) lookup.push(datum.message_create.target.recipient_id);

            TwitSideModule.Friends.lookup(lookup, this._tweet)
                .then(callback.bind(this)).catch(error.bind(this));

            meta.sender = {};
            meta.recipient = {};
            meta.screennames = [];
        }

        return meta;

        function callback(result) {
            for (let user of result.data)
                TwitSideModule.Friends.updateLatestFriends(user);
            // メタデータ更新
            this.record.data[datum.id_str].meta = this._getDmMetadata(datum);
            postMessage({
                reason : TwitSideModule.UPDATE.REPLACE_LOADED,
                tweets : [this.record.data[datum.id_str]],
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
        function error(result)
        {
            // アクション完了
            postMessage({
                reason : TwitSideModule.UPDATE.ACTION_COMPLETED,
                action : '',
                result : 'failed',
                id : datum.id_str,
                columnid : this._columnid,
                window_type : this._win_type,
                message : result.result.message || ''
            });
        }
    },
    // メタデータの作成（リスト）
    _getListMetadata: function(datum)
    {
        var meta = {};

        // 自分のリスト
        if (this._own_userid === this._lists.targetid
            && this._tl_type === TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS)
            meta.isMine = (datum.user.id_str === this._own_userid);

        // 購読可能
        if (datum.user.id_str != this._own_userid) {
            if (this._own_userid === this._lists.targetid
                && this._tl_type === TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS
                || this._own_userid != this._lists.targetid)
                meta.subscriptionable = true;
        }
        // 購読解除可能
        if (this._own_userid === this._lists.targetid
            && this._tl_type === TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS)
            meta.unsubscriptionable = true;

        // カラムに追加可能
        if (this._own_userid === this._lists.targetid
            && (this._tl_type === TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS
                || this._tl_type === TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS))
            meta.registrable = true;

        return meta;
    },
    // サードパーティ画像URL認識
    _analyzePicURL: function(tweetid, url)
    {
        var urls = {}, re;

        switch (true) {
        case (re = RegExp('^https?://twitpic[.]com/(\\w+)([?].*)?$')).test(url):
            // twitpic
            urls.thumburl = url.replace(re, 'http://twitpic.com/show/thumb/$1');
            urls.rawurl = url.replace(re, 'http://twitpic.com/show/full/$1');
            urls.provider = 'twitpic';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://p[.]twipple[.]jp/(\\w+)([?].*)?$')).test(url):
            // twipple
            urls.thumburl = url.replace(re, 'http://p.twipple.jp/show/large/$1');
            urls.rawurl = url.replace(re, 'http://p.twipple.jp/show/orig/$1');
            urls.provider = 'twipple';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://instagr[.]am/p/([\\w-_]+)/([?].*)?([?].*)?$')).test(url):
            // instagr.am
            urls.thumburl = url.replace(re, 'http://instagr.am/p/$1/media/?size=l');
            urls.rawurl = url.replace(re, 'http://instagr.am/p/$1/media/?size=l');
            urls.provider = 'instagram';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://(www[.])?instagram.com/p/([\\w-_]+)/([?].*)?$')).test(url):
            // instagram
            urls.thumburl = url.replace(re, 'http://instagr.am/p/$2/media/?size=l');
            urls.rawurl = url.replace(re, 'http://instagr.am/p/$2/media/?size=l');
            urls.provider = 'instagram';
            urls.id = RegExp.$2;
            break;

        case (re = RegExp('^https?://movapic[.]com/pic/(\\w+)([?].*)?$')).test(url):
            // movapic
            urls.thumburl = url.replace(re, 'http://image.movapic.com/pic/s_$1.jpeg');
            urls.rawurl = url.replace(re, 'http://image.movapic.com/pic/m_$1.jpeg');
            urls.provider = 'movapic';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://ow[.]ly/i/(\\w+)([?].*)?$')).test(url):
            // ow.ly
            urls.thumburl = url.replace(re, 'http://static.ow.ly/photos/thumb/$1.jpg');
            urls.rawurl = url.replace(re, 'http://static.ow.ly/photos/thumb/$1.jpg');
            urls.provider = 'owly';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://photozou[.]jp/photo/show/(\\d+)/(\\d+)([?].*)?$')).test(url):
            // photozou
            urls.thumburl = url.replace(re, 'http://photozou.jp/p/img/$2');
            urls.rawurl = url.replace(re, 'http://photozou.jp/bin/photo/$2/org.bin');
            urls.provider = 'photozou';
            urls.id = RegExp.$2;
            break;

        case (re = RegExp('^https?://youtu[.]be/([\\w-]+)([?].*)?$')).test(url):
            // youtu.be
            urls.thumburl = url.replace(re, 'https://i.ytimg.com/vi/$1/mqdefault.jpg');
            urls.rawurl = url.replace(re, 'https://i.ytimg.com/vi/$1/maxresdefault.jpg');
            urls.embedurl = url.replace(re, 'https://youtube.com/embed/$1');
            urls.provider = 'youtube';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://www[.]youtube[.]com/watch\?.*v=([\\w-]+)([?].*)?$')).test(url):
            // youtube
            urls.thumburl = url.replace(re, 'https://i.ytimg.com/vi/$1/mqdefault.jpg');
            urls.rawurl = url.replace(re, 'https://i.ytimg.com/vi/$1/maxresdefault.jpg');
            urls.embedurl = url.replace(re, 'https://youtube.com/embed/$1');
            urls.provider = 'youtube';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://moby[.]to/(\\w+)')).test(url):
            // moby
            urls.thumburl = url.replace(re, 'http://moby.to/$1:medium');
            urls.rawurl = url.replace(re, 'http://moby.to/$1:full');
            urls.provider = 'moby';
            urls.id = RegExp.$1;
            break;

        case (re = RegExp('^https?://ton[.]twitter[.]com/1[.]1([\\w/.]+)$')).test(url):
            // twitter (for DM)
            urls.rawurl = '';
            urls.provider = 'twitter';
            urls.id = RegExp.$1;
            urls.thumburl = url.replace(re, browser.extension.getURL('images/loading.svg')
                                        + '?' + urls.provider + '#' + urls.id);
            urls.loading = true;
            analyzePicApi(this).catch(this._reportError);
            break;

        case (re = RegExp('^https?://www[.]pixiv[.]net/member_illust.php[?]([\\w]+=[\\w]+&)*illust_id=([\\d]+)([&].*)?$')).test(url):
            // pixiv
            urls.thumburl = url.replace(re, 'http://embed.pixiv.net/decorate.php?illust_id=$2');
            urls.rawurl = url.replace(re, 'http://embed.pixiv.net/decorate.php?illust_id=$2');
            urls.provider = 'pixiv';
            urls.id = RegExp.$2;
            break;

        default:
            return null;
        };

        urls.fullurl = url;
        return urls;

        function analyzePicApi(timeline)
        {
            switch (urls.provider) {
            case 'vine':
                return getApiJson('https://vine.co/oembed.json?id=' + urls.id)
                    .then((responseJson) => {
                        if (responseJson && responseJson.thumbnail_url) {
                            urls = { fullurl : url,
                                     thumburl : responseJson.thumbnail_url,
                                     rawurl : responseJson.thumbnail_url,
                                     provider : urls.provider,
                                     id : urls.id };
                            updatePicUrl(tweetid, urls);
                        };
                    });
            case 'twitter':
                return Promise.all([
                    timeline._tweet.dmOAuth(urls.id+':medium', {}),
                    timeline._tweet.dmOAuth(urls.id+':large', {})
                ]).then(([thumb, response]) => {
                        if (thumb && thumb.data
                            && response && response.data) {
                            urls = { fullurl : url,
                                     thumburl : URL.createObjectURL(thumb.data),
                                     rawurl : URL.createObjectURL(response.data),
                                     provider : urls.provider,
                                     id : urls.id };
                            updatePicUrl(tweetid, urls);
                        };
                    });
            default:
                return Promise.reject();
            }

            // Json形式のデータを取得
            function getApiJson(checkurl)
            {
                return new Promise((resolve, reject) => {
                    var xhr = new XMLHttpRequest();
                    xhr.timeout = TwitSideModule.config.getPref('timeout') * 1000;
                    xhr.open('GET', checkurl);
                    xhr.onload = step2;
                    xhr.onerror = error;
                    xhr.ontimeout = error;
                    xhr.send(null);

                    // コールバック
                    function step2() {
                        if (xhr.getResponseHeader('Content-Type').indexOf('application/json') >= 0)
                            resolve(JSON.parse(xhr.responseText));
                        else
                            reject({ result : 'unknownError',
                                     error : new Error(),
                                     status : xhr.status });
                    }
                    function error(result, error, status) {
                        reject({ result : result,
                                 error : error,
                                 status : status });
                    }
                });
            }
            function updatePicUrl(tweetid, urls)
            {
                // レコードがある場合は更新
                if (timeline.record.data[tweetid]) {
                    let len = timeline.record.data[tweetid].meta.pics.length;
                    for (let i=0; i<len; i++)
                        if (timeline.record.data[tweetid].meta.pics[i].loading
                            && timeline.record.data[tweetid].meta.pics[i].provider === urls.provider
                            && timeline.record.data[tweetid].meta.pics[i].id === urls.id) {
                            timeline.record.data[tweetid].meta.pics[i] = urls;
                            break;
                        }
                }
                // UI更新通知
                postMessage({
                    reason : TwitSideModule.UPDATE.IMAGE_LOADED,
                    urls : urls,
                    tl_type : timeline._tl_type,
                    columnid : timeline._columnid,
                    window_type : timeline._win_type
                });
            }
        }
    },

    /**
     * メンテナンス系
     */
    // 過去ツイートの削除
    _clearOlder: function()
    {
        var cleared = false,
            count = this._getNewerHash.count + parseInt(this._getOlderHash.count * 0.5);

         // 削除不要
        if (!this.record.ids.length) return;
        if (this.record.ids.length <= count*2 + 1) return;

        // 過去ツイートの削除
        while (this.record.ids.length > count*2 + 1) { // +1 = more
            let id = this.record.ids[this.record.ids.length - 1];
            this._removeTweet(id);
            cleared = true;
        }

        // more追加
        var last = this.record.ids[this.record.ids.length - 1];
        if (cleared && !/_more$/.test(last)) {
            let moreid = last + '_more';
            this.record.data[moreid] = {
                meta : {},
                raw : {
                    id_str : moreid
                }};
            this.record.ids.push(moreid);
            postMessage({
                reason : TwitSideModule.UPDATE.TWEET_LOADED,
                tweets : [this.record.data[moreid]],
                tl_type : this._tl_type,
                columnid : this._columnid,
                window_type : this._win_type
            });
        }
    },

    // 指定したIDのツイートを除去
    _removeTweet: function(id)
    {
        if (!id) return;
        var idx = this.record.ids.indexOf(id);
        this.record.ids.splice(idx, 1);
        delete this.record.data[id];

        postMessage({
            reason : TwitSideModule.UPDATE.TWEET_DELETED,
            id : id,
            tl_type : this._tl_type,
            columnid : this._columnid,
            window_type : this._win_type
        });
    },

    // ツイートを全除去
    _removeAllTweet: function()
    {
        delete this.record;
        this.record = {
            data : {},
            ids : []
        };

        postMessage({
            reason : TwitSideModule.UPDATE.TWEET_ALLDELETED,
            tl_type : this._tl_type,
            columnid : this._columnid,
            window_type : this._win_type
        });
    }
};
