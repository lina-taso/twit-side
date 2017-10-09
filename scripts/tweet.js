/**
 * @fileOverview Tweet Module
 * @name tweet.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

const streamMaxTime = 90000,
      streamMaxItems = 500;

var Tweet = function(userinfo) {

    // Set initial consumer_key
    this.consumer_key = TwitSideModule.config.getPref('altkey') || this.consumer_key;

    // userinfoが無いときは初回認証（request）時
    if (userinfo) {
        this.oauth_token = userinfo.oauth_token;
        this.oauth_token_secret = userinfo.oauth_token_secret;
        if (userinfo.user_id)
            this.user_id = userinfo.user_id;
    }

    TwitSideModule.debug.log('tweet.js: initialized userid ' + (this.user_id || 'initial'));
};

Tweet.prototype = {
    /**
     * 初期値
     */
    consumer_key : '8cJhiTxoeMV4z1c3bfLhw',
    oauth_token : '',
    oauth_token_secret : '',
    // ストリーム用
    _streamXhr : null,
    _streamTimer : null,
    _streamManuallyStop : false,
    _streamConnectionError : false,
    _streamItems : 0,
    _streamOffset : 0,

    get basicValues() {
        return {
            'oauth_consumer_key' : this.consumer_key,
            'oauth_nonce' : '',
            'oauth_signature_method' : 'HMAC-SHA1',
            'oauth_timestamp' : '',
            'oauth_token' : this.oauth_token,
            'oauth_version' : '1.0'
        };
    },

    get userAgent() {
        return 'Twit Side ng/' + TwitSideModule.config.getPref('version');
    },

    /**
     * Return Promise
     */
    // Authentication
    request : function()
    {
        var data = {
            method  : 'GET',
            baseurl : TwitSideModule.urls.twit.urlOauthBase,
            url     : TwitSideModule.urls.twit.urlRequest
        };
        return this._sendRequest('REQUEST', data);
        // return {url: URL to callback, userinfo: token hash} to callback
    },

    access : function(pin)
    {
        var data = {
            method  : 'POST',
            pin     : pin,
            baseurl : TwitSideModule.urls.twit.urlOauthBase,
            url     : TwitSideModule.urls.twit.urlAccess
        };
        return this._sendRequest('ACCESS', data);
        // return token hash to callback
    },

    getMessage : function()
    {
        return this._createOauthSignature('MESSAGE', null, TwitSideModule.text.getUnixTime());
        // return messageTitle"\n"messageBody to callback
    },

    // ユーザーストリーム
    startUserStream : function(optionsHash, callbackFunction, errorFunction)
    {
        // 初期化
        this._streamTimer = null;
        this._streamManuallyStop = false;
        this._streamConnectionError = false;

        optionsHash['stringify_friend_ids'] = 'true';
        var data = {
            method  : 'STREAM',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.streamBase,
            url     : TwitSideModule.urls.twit.urlUserStream
        };
        return this._sendRequest('SIGNATURE', data, callbackFunction, errorFunction);
        // stream接続時: return Promise
        // streamstate変更時: return cb, error
    },

    // ユーザーストリーム停止
    stopUserStream: function()
    {
        if (this._streamXhr == null) return;
        this._streamManuallyStop = true;
        this._streamXhr.abort();
    },

    // 発言
    tweet : function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesUpdate
        };
        return this._sendRequest('SIGNATURE', data)
            .then((result) => {
                result.message = TwitSideModule.Message.transMessage('tweetSent');
                return Promise.resolve(result);
            });
    },

    // 発言
    tweet_withmedia: function(optionsHash, updatewin)
    {
        var data = {
            method  : 'MULTI',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesUpdateWithMedia
        };
        return this._sendRequest('SIGNATURE', data, progress)
            .then((result) => {
                result.message = TwitSideModule.Message.transMessage('tweetSent');
                return Promise.resolve(result);
            });

        function progress(e)
        {
            postMessage({ reason : TwitSideModule.UPDATE.PROGRESS,
                          data : e.loaded / e.total * 100,
                          window_type : updatewin.win_type },
                        updatewin.id);
        }
    },

    // 公式リツイート
    retweet: function(optionsHash, retweetid)
    {
        optionsHash['include_entities'] = 'true';
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweet + retweetid + '.json'
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 指定IDのツイート読み込み
    show: function(optionsHash)
    {
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 指定IDのツイート削除
    destroy: function(optionsHash, tweetid)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesDestroy + tweetid + '.json'
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ファボ一覧
    favoritelist: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFavoritesList
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ファボ
    favorite: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFavoritesCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // アンファボ
    unfavorite: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFavoritesDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // タイムライン
    timeline: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesHomeTimeline
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ユーザータイムライン
    userTimeline: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesUserTimeline
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストタイムライン
    listTimeline: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsStatuses
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // つながり
    connect: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesMentionsTimeline
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リツイートされたツイート
    retweeted: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweetsOfMe
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リツイートした人
    retweeters: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ユーザプロフィール（複数）
    userLookup: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlUsersLookup
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ユーザプロフィール（単体詳細）
    userShow: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlUsersShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロー
    followlist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendsIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロワー
    followerlist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFollowersIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート
    mutelist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート追加
    mute: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート削除
    unmute: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // API制限
    showAPI: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlAPI
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 検索
    search: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlSearchTweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロー
    follow: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // アンフォロー
    unfollow: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リツイートを表示しないユーザ
    noretweets: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsNoRetweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フレンドシップ更新
    updateFriendship: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsUpdate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フレンドシップ取得
    showFriendship: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 受信ダイレクトメッセージ
    dmRcvList: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlDirectMessages
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 送信ダイレクトメッセージ
    dmSntList: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesSent
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ダイレクトメッセージ削除
    destroyDm: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ダイレクトメッセージ作成
    dmNew: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesNew
        };
        return this._sendRequest('SIGNATURE', data)
            .then((result) => {
                result.message = TwitSideModule.Message.transMessage('dmSent');
                return Promise.resolve(result);
            });
    },

    // 自分のリスト一覧
    ownershipListsList: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsOwnerships
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 購読リスト一覧
    subscriptionListsList: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsSubscriptions
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォローされたリスト一覧
    membershipListsList: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsMemberships
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読者一覧
    listSubscribers: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribers
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー一覧
    listMembers: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsMembers
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読
    subscribeList: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribersCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読解除
    unsubscribeList: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribersDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー追加
    createListMembers: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsMembersCreateAll
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー削除
    destroyListMembers: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsMembersDestroyAll
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト作成
    createList: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト修正
    updateList: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsUpdate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト削除
    destroyList: function(optionsHash)
    {
        var data = {
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlListsDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 現状設定取得
    configuration: function(optionsHash)
    {
        var data = {
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.urlBase,
            url     : TwitSideModule.urls.twit.urlHelpConfiguration
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // DM OAuth
    dmOAuth: function(urlpath, optionsHash)
    {
        var data = {
            method  : 'DM',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.dmBase,
            url     : urlpath
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リクエストの振り分け
    // cb, errorはストリーム用
    _sendRequest : function(type, data_hash, cb, error)
    {
        var timestamp = TwitSideModule.text.getUnixTime();

        switch (type) {
        case 'REQUEST':
            break;
        case 'ACCESS':
            if (!this.oauth_token || !this.oauth_token_secret) return null;
            data_hash.oauth_token = this.oauth_token;
            data_hash.oauth_token_secret = this.oauth_token_secret;
            break;
        case 'SIGNATURE':
            data_hash.oauth_token = this.oauth_token;
            data_hash.oauth_token_secret = this.oauth_token_secret;
            let form;
            if (data_hash.method !== 'MULTI') {
                form = JSON.parse(JSON.stringify(data_hash.options));
                form.url = data_hash.url;
            }
            else
                form = {url : data_hash.url};
            data_hash.form = TwitSideModule.hash.hash2sortedForm(form);
            break;
        default:
            return null;
        }

        return this._createOauthSignature(type, data_hash, timestamp)
            .then( send2Twitter.bind(this) );

        function send2Twitter(data)
        {
            return new Promise((resolve, reject) => {

                var xhr = new XMLHttpRequest(),
                    form = this.basicValues,
                    json = JSON.parse(data),
                    param = '',
                    authHeader = '';

                form.oauth_timestamp = timestamp;
                form.oauth_nonce = json.oauth_nonce;
                form.oauth_signature = json.oauth_signature;

                // タイムアウト初期値
                xhr.timeout = TwitSideModule.config.getPref('timeout') * 1000;
                // エラー初期値
                xhr.onerror = reject;

                switch (type) {
                case 'REQUEST':
                    delete form.oauth_token;
                    param = TwitSideModule.hash.hash2sortedForm(form);
                    xhr.open('GET', data_hash.baseurl + data_hash.url + param);
                    xhr.onload = returnRequest.bind(this);
                    break;
                case 'ACCESS':
                    form.oauth_verifier = data_hash.pin;
                    param = TwitSideModule.hash.hash2sortedForm(form);
                    xhr.open('POST', data_hash.baseurl + data_hash.url);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    xhr.setRequestHeader('Authorization', 'OAuth');
                    xhr.onload = returnAccess.bind(this);
                    break;
                case 'SIGNATURE':
                    param = TwitSideModule.hash.hash2sortedForm(data_hash.options);
                    authHeader = TwitSideModule.hash.hash2oauthHeader(form);
                    switch (data_hash.method) {
                    case 'GET':
                        xhr.open('GET', data_hash.baseurl + data_hash.url + param);
                        break;
                    case 'DM':
                        xhr.open('GET', data_hash.baseurl + data_hash.url + param);
                        xhr.responseType = 'blob';
                        break;
                    case 'POST':
                        xhr.open('POST', data_hash.baseurl + data_hash.url);
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        break;
                    case 'STREAM':
                        xhr.open('POST', data_hash.baseurl + data_hash.url);
                        // タイムアウト無効
                        xhr.timeout = 0;
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                        // ストリーム用コールバック
                        xhr.onreadystatechange = this._streamStatechange.bind(this, cb, error);
                        // ストリームのエラーはreadystatechangeで確認
                        xhr.onerror = null;
                        this._streamXhr = xhr;
                        break;
                    case 'MULTI':
                        param = formatMulti(data_hash.options);
                        xhr.open('POST', data_hash.baseurl + data_hash.url);
                        // タイムアウト無効
                        xhr.timeout = 0;
                        // プログレスバー
                        xhr.upload.onprogress = cb;
                        break;
                    }
                    xhr.setRequestHeader('Authorization', authHeader);
                    xhr.onload = returnResponse.bind(this);
                    break;
                default:
                    return;
                }

                xhr.setRequestHeader('User-Agent', this.userAgent);
                xhr.ontimeout = reject;
                xhr.send((data_hash.method === 'GET'
                          || data_hash.method === 'DM')
                         ? null : param);

                function returnRequest()
                {
                    if (xhr.status == 200) {
                        let res = xhr.responseText.split('&'),
                            len = res.length,
                            oauthToken = {};

                        for (let i=0; i<len; i++) {
                            oauthToken[res[i].split('=')[0]] = res[i].split('=')[1];
                        }
                        // return URL and token
                        resolve({ url : TwitSideModule.urls.twit.urlOauthBase
                                  + TwitSideModule.urls.twit.urlAuthorize
                                  + 'oauth_token=' + oauthToken.oauth_token,
                                  userinfo : oauthToken });
                    }
                    else
                        reject({ result : 'commonError',
                                 error : new Error(),
                                 status : xhr.status });
                }

                function returnAccess()
                {
                    if (xhr.status == 200) {
                        let res = xhr.responseText.split('&'),
                            len = res.length,
                            oauthToken = {};

                        for (var i=0; i<len; i++) {
                            oauthToken[res[i].split('=')[0]] = res[i].split('=')[1];
                        }
                        // return tokens
                        resolve(oauthToken);
                    }
                    else
                        reject({ result : 'commonError',
                                 error : new Error(),
                                 status : xhr.status });
                }

                function returnResponse()
                {
                    if (data_hash.method == 'STREAM') resolve();
                    if (xhr.status == 200) {
                        if (data_hash.method == 'DM') {
                            resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                      data : xhr.response });
                        }
                        else if (xhr.getResponseHeader('Content-Type')
                            .indexOf('application/json') != -1) {
                            resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                      data : JSON.parse(xhr.responseText) });
                        }
                        else
                            reject({ result : 'commonError',
                                     error : new Error(),
                                     status : xhr.status });
                    }
                    else {
                        if (xhr.responseText) {
                            if (xhr.getResponseHeader('Content-Type')
                                .indexOf('application/json') != -1 &&
                                JSON.parse(xhr.responseText).errors)
                                reject({ result : JSON.parse(xhr.responseText).errors[0],
                                         error : new Error(),
                                         status : xhr.status });
                            else reject({ result : xhr.responseText,
                                          error : new Error(),
                                          status : xhr.status });
                        }
                        else reject({ result : 'noResponse',
                                      error : new Error(),
                                      status : xhr.status });
                    }
                }

            });
        }

        function formatMulti(dataHash)
        {
            var formData = new FormData();
            for (let key in dataHash) {
                if (key.match(/^file[0-9]/)) {
                    formData.append('media[]', dataHash[key], 'file0');
                }
                else formData.append(key, dataHash[key]);
            }
            return formData;
        }
    },

    // streamXhr の状態遷移
    _streamStatechange: function(cb, error)
    {
        TwitSideModule.debug.log('statechanged ' + this._streamXhr.readyState);

        switch (this._streamXhr.readyState) {
        case 2: // 接続完了
            this._streamItems = 0;
            this._streamOffset = 0;
            cb({ status : TwitSideModule.TWEET_STATUS.CONNECTED });
            break;
        case 3: // 何かを受信
            if (this._streamXhr.getResponseHeader('Content-Type')
                .indexOf('application/json') != -1) {
                this._streamCheckContent(cb, error);
            }
            else {
                error({ result : this._streamXhr.responseText,
                        error : new Error(),
                        status : this._streamXhr.status });
                return;
            }
            break;
        case 4: // 通信が終了した
            clearTimeout(this._streamTimer);
            let reason;
            // 手動停止の場合
            if (this._streamManuallyStop)
                reason = TwitSideModule.TWEET_STATUS.CLOSED_MANUALLY;
            // ネットワークエラーだった場合
            else if (this._StreamConnectionError)
                reason = TwitSideModule.TWEET_STATUS.CLOSED_NETWORK;
            // ネットワークエラーだった場合（切断等）
            else if (this._streamXhr.status == 0)
                reason = TwitSideModule.TWEET_STATUS.CLOSED_NETWORK;
            // API制限
            else if (this._streamXhr.status == 420)
                reason = TwitSideModule.TWEET_STATUS.CLOSED_API;
            // HTTPエラー
            else if (this._streamXhr.status != 200)
                reason = TwitSideModule.TWEET_STATUS.CLOSED_HTTP;
            // 定期切断
            else
                reason = TwitSideModule.TWEET_STATUS.CLOSED_MAINTAINANCE;

            this._streamXhr = null;
            TwitSideModule.debug.log('disconnected stream because ' + reason);
            cb({ status : reason });
            break;
        }
    },

    _streamCheckContent : function(cb, error) {
        // タイマーリセット
        clearTimeout(this._streamTimer);
        this._streamTimer = setTimeout(function() {
            this._StreamConnectionError = true;
            this._streamXhr.abort();
        }.bind(this), streamMaxTime);

        // 500件を超えるアイテムを受信した場合
        if (this._streamItems > streamMaxItems) {
            this._streamXhr.abort();
            return;
        }

        var responseText = this._streamXhr.responseText;
        while (true) {
            // 開始位置から \r までの範囲を切り出す
            let index = responseText.indexOf('\r', this._streamOffset);
            if (index == -1) break;

            let line = responseText.substr(
                this._streamOffset,
                index - this._streamOffset
            );

            // 接続維持用の空行でない場合
            if (line.length >= 2) {
                try {
                    cb({ status : TwitSideModule.TWEET_STATUS.STREAM_RECEIVED,
                         data : JSON.parse(line) });
                } catch (e) {
                    error({ result : line,
                            error : e,
                            status : this._streamXhr.status });
                }
                ++this._streamItems;
            }
            this._streamOffset = index + 2;
        }
    },

    // 認証サーバへシグネチャ取得
    _createOauthSignature : function(type, data_hash, timestamp)
    {
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest();

            switch (type) {
            case 'REQUEST':
                xhr.open('GET', TwitSideModule.urls.auth.urlBase
                         + TwitSideModule.urls.auth.urlRequest
                         + timestamp);
                break;
            case 'ACCESS':
                xhr.open('GET', TwitSideModule.urls.auth.urlBase
                         + TwitSideModule.urls.auth.urlAccess
                         + timestamp
                         + '/' + data_hash.oauth_token
                         + '/' + data_hash.pin
                         + '/' + data_hash.oauth_token_secret);
                break;
            case 'MESSAGE':
                xhr.open('GET', TwitSideModule.urls.auth.urlBase
                         + TwitSideModule.urls.auth.urlMessage
                         + timestamp);
                break;
            case 'SIGNATURE':
                xhr.open('POST', TwitSideModule.urls.auth.urlBase
                         + TwitSideModule.urls.auth.urlSignature
                         + timestamp
                         + '/' + data_hash.method
                         + '/' + data_hash.oauth_token
                         + '/' + data_hash.oauth_token_secret);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                break;
            }
            xhr.setRequestHeader('User-Agent', this.userAgent);
            xhr.timeout = TwitSideModule.config.getPref('timeout') * 1000;
            xhr.onerror = reject;
            xhr.ontimeout = reject;
            xhr.onload = returnSignature.bind(this);
            xhr.send(data_hash && data_hash.form || null);

            function returnSignature()
            {
                if (xhr.status == 200) resolve(xhr.responseText);
                else reject(xhr.statusText);
            }
        });
    }

};
