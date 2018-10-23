/**
 * @fileOverview Tweet Module
 * @name tweet.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

const uploadChunkSize = 1 * 1024 * 1024; // 1MB

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
            baseurl : TwitSideModule.urls.twit.oauthBase,
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
            baseurl : TwitSideModule.urls.twit.oauthBase,
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

    // 発言
    tweet : function(optionsHash)
    {
        optionsHash['weighted_character_count'] = 'true';
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesUpdate
        };
        return this._sendRequest('SIGNATURE', data)
            .then((result) => {
                result.message = TwitSideModule.Message.transMessage('tweetSent');
                return Promise.resolve(result);
            });
    },

    // 発言
    upload_media: function(optionsHash, files, updatewin)
    {
        var data = {
            api     : 'UPLOAD',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.uploadBase,
            url     : TwitSideModule.urls.twit.urlMediaUpload,
            files   : files
        };
        return this._uploadMedia(data, progress)
            .then((media_ids) => {
                var result = {
                    media_ids : media_ids.join(','),
                    message : TwitSideModule.Message.transMessage('mediaUploaded')
                };
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
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweet + retweetid + '.json'
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 指定IDのツイート読み込み
    show: function(optionsHash)
    {
        optionsHash['tweet_mode'] = 'extended';
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 指定IDのツイート削除
    destroy: function(optionsHash, tweetid)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesDestroy + tweetid + '.json'
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ファボ一覧
    favoritelist: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFavoritesList
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ファボ
    favorite: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFavoritesCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // アンファボ
    unfavorite: function(optionsHash)
    {
        optionsHash['include_entities'] = 'true';
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweetsOfMe
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リツイートした人
    retweeters: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlStatusesRetweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ユーザプロフィール（複数）
    userLookup: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlUsersLookup
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ユーザプロフィール（単体詳細）
    userShow: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlUsersShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロー
    followlist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendsIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロワー
    followerlist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFollowersIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート
    mutelist: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersIds
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート追加
    mute: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ミュート削除
    unmute: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlMutesUsersDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // API制限
    showAPI: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlSearchTweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォロー
    follow: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // アンフォロー
    unfollow: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リツイートを表示しないユーザ
    noretweets: function(optionsHash)
    {
        optionsHash['stringify_ids'] = 'true';
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsNoRetweets
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フレンドシップ更新
    updateFriendship: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsUpdate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フレンドシップ取得
    showFriendship: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlFriendshipsShow
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ダイレクトメッセージ一覧（新API）
    dmList2: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesEventsList
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ダイレクトメッセージ削除（新API）
    destroyDm2: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'DELETE',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesEventsDestory
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // ダイレクトメッセージ作成（新API）
    dmNew2: function(optionsHash)
    {
        var data = {
            api     : 'API_JSON',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlDirectMessagesEventsNew
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
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsOwnerships
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 購読リスト一覧
    subscriptionListsList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsSubscriptions
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // フォローされたリスト一覧
    membershipListsList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsMemberships
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読者一覧
    listSubscribers: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribers
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー一覧
    listMembers: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsMembers
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読
    subscribeList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribersCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト購読解除
    unsubscribeList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsSubscribersDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー追加
    createListMembers: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsMembersCreateAll
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リストメンバー削除
    destroyListMembers: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsMembersDestroyAll
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト作成
    createList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsCreate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト修正
    updateList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsUpdate
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // リスト削除
    destroyList: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'POST',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlListsDestroy
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // 現状設定取得
    configuration: function(optionsHash)
    {
        var data = {
            api     : 'API',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.apiBase,
            url     : TwitSideModule.urls.twit.urlHelpConfiguration
        };
        return this._sendRequest('SIGNATURE', data);
    },

    // DM OAuth
    dmOAuth: function(urlpath, optionsHash)
    {
        var data = {
            api     : 'TON',
            method  : 'GET',
            options : optionsHash,
            baseurl : TwitSideModule.urls.twit.tonBase,
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
            switch (data_hash.api) {
            case 'MULTI':
            case 'UPLOAD':
            case 'API_JSON':
                form = { url : data_hash.url };
                break;
            default:
                form = JSON.parse(JSON.stringify(data_hash.options));
                form.url = data_hash.url;
            }
            data_hash.form = TwitSideModule.hash.hash2sortedForm(form);
            break;
        default:
            return null;
        }

        return this._createOauthSignature(type, data_hash, timestamp)
            .then( this._send2Twitter.bind(this, type, data_hash, timestamp,
                                           cb, error) );
    },

    _uploadMedia : function(data_hash, cb)
    {
        var timestamp = TwitSideModule.text.getUnixTime();

        data_hash.oauth_token = this.oauth_token;
        data_hash.oauth_token_secret = this.oauth_token_secret;

        var media_uploading = [];

        // アップロード並列処理
        for (let file of data_hash.files) {
            // INIT
            let media_id,
                _data_hash = JSON.parse(JSON.stringify(data_hash));

            _data_hash.options.command     = 'INIT';
            _data_hash.options.media_type  = file.type;
            _data_hash.options.total_bytes = file.size;
            _data_hash.form = TwitSideModule.hash.hash2sortedForm({ url : data_hash.url });

            let uploading = this._createOauthSignature('SIGNATURE', _data_hash, timestamp)
                .then( this._send2Twitter.bind(this, 'SIGNATURE', _data_hash, timestamp,
                                               cb, null) )
                .then((response) => {
                    media_id = response.data.media_id_string;
                    return Promise.resolve();
                })

                .then(() => {
                    // APPEND
                    // 先にシグネチャ生成
                    var _data_hash = {
                        api                : data_hash.api,
                        method             : 'POST',
                        oauth_token        : data_hash.oauth_token,
                        oauth_token_secret : data_hash.oauth_token_secret,
                        baseurl            : data_hash.baseurl,
                        url                : data_hash.url,
                        options : {
                            command        : 'APPEND',
                            media_id       : media_id
                        },
                        form : TwitSideModule.hash.hash2sortedForm({ url : data_hash.url })
                    },
                        timestamp = TwitSideModule.text.getUnixTime();

                    return this._createOauthSignature('SIGNATURE', _data_hash, timestamp)
                        .then((signature) => {
                            // 分割
                            var segments = Math.ceil(file.size / uploadChunkSize),
                                seg_uploading = [],
                                seg_uploading_percent = new Array(segments);

                            for (let i=0; i<segments; i++) {
                                // セグメント毎のパラメータ
                                let __data_hash = JSON.parse(JSON.stringify(_data_hash));
                                __data_hash.options.media = file.slice(uploadChunkSize * i,
                                                                       uploadChunkSize * (i+1),
                                                                       file.type);
                                __data_hash.options.segment_index = i;

                                // アップロード
                                let uploading = wait_connection(i)
                                    .then( this._send2Twitter.bind(this, 'SIGNATURE',
                                                                   __data_hash, timestamp,
                                                                   update_progress.bind(this, i, cb),
                                                                   null, signature) );
                                seg_uploading.push(uploading);
                            }

                            // 同時接続数計測ループ
                            function wait_connection(segment) {
                                const MAX_CONN = 10;
                                if (segment >= MAX_CONN) {
                                    // 完了済コネクション
                                    let done = seg_uploading_percent.filter((ele) => {
                                        return ele == 1;
                                    }).length;
                                    // 待機
                                    if ((segment - done) >= MAX_CONN)
                                        return timer(5).then(wait_connection.bind(this, segment));
                                    // 接続開始
                                    else
                                        return Promise.resolve();
                                }
                                else
                                    return Promise.resolve();
                            };

                            function update_progress(segment, cb, e)
                            {
                                seg_uploading_percent[segment] = e.loaded / e.total;
                                var loaded = seg_uploading_percent
                                    .reduce(function(prev, current, i, arr) {
                                        return prev + current;
                                    }) / seg_uploading_percent.length;

                                cb({ loaded : loaded, total : 1 });
                            }

                            return Promise.all(seg_uploading);
                        });
                })

                .then(() => {
                    // FINALIZE
                    var _data_hash = {
                        api                : data_hash.api,
                        method             : 'POST',
                        oauth_token        : data_hash.oauth_token,
                        oauth_token_secret : data_hash.oauth_token_secret,
                        baseurl            : data_hash.baseurl,
                        url                : data_hash.url,
                        options : {
                            command        : 'FINALIZE',
                            media_id       : media_id
                        },
                        form : TwitSideModule.hash.hash2sortedForm({ url : data_hash.url })
                    },
                        timestamp = TwitSideModule.text.getUnixTime();

                    return this._createOauthSignature('SIGNATURE', _data_hash, timestamp)
                        .then( this._send2Twitter.bind(this, 'SIGNATURE', _data_hash, timestamp,
                                                       cb, null) );
                })

                .then((result) => {
                    // STATUSチェックが必要
                    if (result.data.processing_info) {
                        let _data_hash = {
                            api                : data_hash.api,
                            method             : 'GET',
                            oauth_token        : data_hash.oauth_token,
                            oauth_token_secret : data_hash.oauth_token_secret,
                            baseurl            : data_hash.baseurl,
                            url                : data_hash.url + '?',
                            options : {
                                command        : 'STATUS',
                                media_id       : media_id
                            }
                        };
                        let form = JSON.parse(JSON.stringify(_data_hash.options));
                        form.url = _data_hash.url;
                        _data_hash.form = TwitSideModule.hash.hash2sortedForm(form);

                        // 待機時間（初回）
                        return timer(result.data.processing_info.check_after_secs)
                            .then(loop.bind(this));

                        // ステータスチェック用ループ
                        function loop() {
                            // STATUS
                            var timestamp = TwitSideModule.text.getUnixTime();
                            return this._createOauthSignature('SIGNATURE', _data_hash, timestamp)
                                .then( this._send2Twitter.bind(this, 'SIGNATURE', _data_hash, timestamp,
                                                               cb, null) )
                                .then((result) => {
                                    // ステータスチェック
                                    switch (result.data.processing_info.state) {
                                    case 'succeeded':
                                        return media_id;
                                    case 'failed':
                                        return Promise.reject((
                                            { result : result.data.processing_info.error.message,
                                              error : new Error(),
                                              status : xhr.status }));
                                    case 'in_progress':
                                        // Twitter処理率
                                        cb({ loaded : result.data.processing_info.progress_percent || 0,
                                             total : 100 });
                                        // 待機時間（2回目以降）
                                        return timer(result.data.processing_info.check_after_secs)
                                            .then(loop.bind(this));
                                    default:
                                        return Promise.reject();
                                    }
                                });
                        };
                    }
                    // STATUSが完了
                    else {
                        return media_id;
                    }
                });

            media_uploading.push(uploading);
        }

        return Promise.all(media_uploading);

        // 待ち時間
        function timer(secs)
        {
            return new Promise((resolve, reject) => {
                setTimeout(() => { resolve(); },
                           secs * 1000);
            });
        }
    },

    _send2Twitter: function(type, data_hash, timestamp, cb, error, signature)
    {
        return new Promise((resolve, reject) => {

            var xhr = new XMLHttpRequest(),
                form = this.basicValues,
                json = JSON.parse(signature),
                param = '',
                authHeader = '';

            form.oauth_timestamp = timestamp;
            form.oauth_nonce = json.oauth_nonce;
            form.oauth_signature = json.oauth_signature;

            // タイムアウト初期値
            xhr.timeout = TwitSideModule.config.getPref('timeout') * 1000;
            // エラー初期値
            xhr.onerror = function() { reject(new Error()); };

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
                case 'POST':
                    xhr.open('POST', data_hash.baseurl + data_hash.url);
                    if (data_hash.api !== 'MULTI'
                        && data_hash.api !== 'UPLOAD'
                        && data_hash.api !== 'API_JSON')
                        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                    break;
                case 'DELETE':
                    xhr.open('DELETE', data_hash.baseurl + data_hash.url + param);
                    data_hash.method = 'GET';
                    break;
                }

                switch (data_hash.api) {
                case 'TON':
                    xhr.responseType = 'blob';
                    break;
                case 'MULTI':
                    param = createFormData(data_hash.options);
                    // タイムアウト
                    xhr.timeout = TwitSideModule.config.getPref('timeout_upload') * 1000;
                    // プログレスバー
                    xhr.upload.onprogress = cb;
                    break;
                case 'UPLOAD':
                    param = createFormData(data_hash.options);
                    // タイムアウト
                    xhr.timeout = TwitSideModule.config.getPref('timeout_upload') * 1000;
                    // プログレスバー
                    xhr.upload.onprogress = cb;
                    break;
                case 'API_JSON':
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    param = JSON.stringify(data_hash.options);
                    break;
                }
                xhr.setRequestHeader('Authorization', authHeader);
                xhr.onload = returnResponse.bind(this);
                break;
            default:
                return;
            }

            xhr.setRequestHeader('User-Agent', this.userAgent);
            xhr.ontimeout = function() { reject('timeout'); };
            xhr.send(data_hash.method === 'GET' ? null : param);

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
                    resolve({ url : TwitSideModule.urls.twit.oauthBase
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
                switch (data_hash.api) {
                case 'TON':
                    if (xhr.status == 200) {
                        resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                  data : xhr.response });
                        return;
                    }
                    break;
                case 'UPLOAD':
                    if (xhr.status >= 200 && xhr.status < 300) {
                        if (xhr.getResponseHeader('Content-Type')
                            .indexOf('application/json') != -1) {
                            resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                      data : JSON.parse(xhr.responseText) });
                        }
                        else {
                            resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                      data : null });
                        }
                        return;
                    }
                    break;
                default:
                    if (xhr.status == 200) {
                        if (xhr.getResponseHeader('Content-Type')
                            .indexOf('application/json') != -1) {
                            resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                      data : JSON.parse(xhr.responseText) });
                        }
                        else {
                            reject({ result : 'commonError',
                                     error : new Error(),
                                     status : xhr.status });
                        }
                        return;
                    }
                    // DELETE method
                    else if (xhr.status == 204) {
                        resolve({ status : TwitSideModule.TWEET_STATUS.OK,
                                  data : null });
                    }
                }

                // エラー
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

            function createFormData(dataHash)
            {
                var formData = new FormData();
                for (let key in dataHash) {
                    formData.append(key, dataHash[key]);
                }
                return formData;
            }
        });
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
                let api = data_hash.api;
                if (api == 'API_JSON') api = 'API';
                xhr.open('POST', TwitSideModule.urls.auth.urlBase
                         + TwitSideModule.urls.auth.urlSignature
                         + timestamp
                         + '/' + api
                         + '/' + data_hash.method
                         + '/' + data_hash.oauth_token
                         + '/' + data_hash.oauth_token_secret);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                break;
            }
            xhr.setRequestHeader('User-Agent', this.userAgent);
            xhr.timeout = TwitSideModule.config.getPref('timeout') * 1000;
            xhr.onerror = function() { reject(new Error()); };
            xhr.ontimeout = function() { reject('timeout'); };
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
