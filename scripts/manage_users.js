/**
 * @fileOverview Manageing Twit Side user accounts
 * @name manage_users.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var ManageUsers = function() {

    const UPDATE_INTERVAL = 900;


    /**
     * Private valuables
     */
    // 登録時のキー
    var initialized = false,
    userProfiles = ['oauth_token',
                    'oauth_token_secret',
                    'user_id',
                    'screen_name',
                    'lang'],
    userUpdated = {},
    autoUpdateTimer;


    /**
     * Private functions
     */
    // ユーザ情報の更新
    function updateUser(userid_str, userinfo)
    {
        // 保存値読み込み、保存されていない場合は初期ハッシュ
        var users = JSON.parse(TwitSideModule.config.getPref('users')
                               || '{}');

        var data = {};
        if (users[userid_str].screen_name != userinfo.screen_name) {
            users[userid_str].screen_name = userinfo.screen_name;
            data.screen_name = userinfo.screen_name;
        }
        if (!users[userid_str].profile_image_url
            || users[userid_str].profile_image_url != userinfo.profile_image_url) {
            users[userid_str].profile_image_url = userinfo.profile_image_url;
            data.profile_image_url = userinfo.profile_image_url;
        }
        if (!users[userid_str].lang
            || users[userid_str].lang != userinfo.lang) {
            users[userid_str].lang = userinfo.lang;
            data.lang = userinfo.lang;
        }

        // 設定更新無し
        if (data === {}) return null;

        // 設定に保存
        TwitSideModule.config.setPref('users', JSON.stringify(users));
        return users[userid_str];
    }

    /**
     * Public
     */
    return {

        get initialized()
        {
            return initialized;
        },

        // 全ユーザ初期化（background_main.js上で実行）
        // return Promise
        initialize : function()
        {
            // ユーザ情報定期更新開始
            return this.updateAllUsersInfo()
                .then(() => {
                    autoUpdateTimer = setInterval(this.updateAllUsersInfo.bind(this),
                                                  UPDATE_INTERVAL * 1000);

                    // メッセージ取得
                    this.getServersideMessage();
                    initialized = true;

                    TwitSideModule.debug.log('Manage users initialized');
                });
        },

        unload : function()
        {
            clearInterval(autoUpdateTimer);
            autoUpdateTimer = null;
            userUpdated = {};

            initialized = false;
        },

        // 初回サーバサイドメッセージ
        getServersideMessage : function()
        {
            var tweet = new Tweet();
            tweet.getMessage()
                .then((result) => {
                    var message = JSON.parse(result),
                        lang = browser.i18n.getUILanguage() == 'ja' ? 'ja' : 'en',
                        // 非表示一覧
                        hidden_message = JSON.parse(TwitSideModule.config.getPref('hidden_message'));

                    // 通知しない
                    if (!message.notify) return;

                    for (let notif of message.notifications) {
                        // 非表示チェック
                        if (hidden_message.indexOf(notif.id) >= 0)
                            continue;
                        // 掲載日時チェック
                        if (notif.term && notif.term.start
                            && new Date(notif.term.start) > Date.now())
                            continue;
                        if (notif.term && notif.term.end
                            && new Date(notif.term.end) < Date.now())
                            continue;
                        // バージョンチェック
                        if (notif.version && notif.version.min
                            && notif.version.min > browser.runtime.getManifest().version)
                            continue;
                        if (notif.version && notif.version.max
                            && notif.version.max < browser.runtime.getManifest().version)
                            continue;

                        let data = {
                            id : notif.id,
                            urls: notif.urls,
                            userid : '-1',
                            title : notif.title[lang],
                            content : notif.message[lang],
                            datetime : notif.term.start
                                ? ~~((new Date(notif.term.start)).getTime() / 1000)
                                : null
                        };
                        TwitSideModule.Message.showNotification(data);
                    }
                }).catch((result) => {
                    TwitSideModule.Message.throwError(result);
                });
        },

        // OAuth認証後のパラメータから設定上にユーザを追加
        // return Promise
        addUser : function(oauth_hash)
        {
            if (oauth_hash == null) throw new Error('PARAMETER_IS_NOT_DEFINED');

            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');
            // ユーザ既存
            if (users[oauth_hash.user_id] != null) throw new Error('userAlready');

            users[oauth_hash.user_id] = {};
            // キー名称変換
            for (let key of userProfiles)
                users[oauth_hash.user_id][key] = oauth_hash[key];
            // 設定に保存
            return TwitSideModule.config.setPref('users', JSON.stringify(users))
                .then(() => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.USER_CHANGED,
                        action : TwitSideModule.ACTION.ADD,
                        userid : oauth_hash.user_id,
                        userinfo : users[oauth_hash.user_id]
                    });
                    // プロフィール画像取得
                    return this.updateUserInfo(oauth_hash.user_id);
                });
        },

        // 設定上からユーザを削除
        // return Promise
        deleteUser : function(userid_str)
        {
            if (userid_str == null) throw new Error('PARAMETER_IS_NOT_DEFINED');

            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');
            if (users[userid_str] == null) throw new Error('USER_IS_NOT_REGISTERED');
            delete userUpdated[userid_str];
            delete users[userid_str];

            // 設定に保存
            return TwitSideModule.config.setPref('users', JSON.stringify(users))
                .then(() => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.USER_CHANGED,
                        action : TwitSideModule.ACTION.DELETE,
                        userid : userid_str,
                        window_type : TwitSideModule.WINDOW_TYPE.MAIN
                    });
                });
        },

        // 全ユーザの情報を最新化
        // return Promise
        updateAllUsersInfo : function()
        {
            var users =this.allUserid(),
                updates = [];

            for (let userid of users)
                updates.push(this.updateUserInfo(userid));

            return Promise.all(updates);
        },

        // ユーザ情報を最新化
        // return Promise
        updateUserInfo : function(userid_str)
        {
            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');

            // 最終アップデート時刻確認
            if (userUpdated[userid_str]
                && userUpdated[userid_str] + UPDATE_INTERVAL > TwitSideModule.text.getUnixTime())
                return null;

            var tweet = new Tweet(users[userid_str]);
            return tweet.userShow({ user_id : users[userid_str].user_id })
                .then((result) => {
                    var userinfo = {
                        profile_image_url : result.data.profile_image_url,
                        screen_name : result.data.screen_name,
                        lang : result.data.lang
                    };

                    // 設定保存
                    userinfo = updateUser(userid_str, userinfo);
                    if (userinfo)
                        // 更新通知
                        postMessage({
                            reason : TwitSideModule.UPDATE.USER_CHANGED,
                            action : TwitSideModule.ACTION.EDIT,
                            userid : userid_str,
                            userinfo : userinfo,
                            window_type : TwitSideModule.WINDOW_TYPE.MAIN
                        });

                    // アップデート時刻更新
                    userUpdated[userid_str] = TwitSideModule.text.getUnixTime();

                    // mute, noretweet取得
                    return Promise.all([
                        TwitSideModule.Friends.loadFriendIdList(TwitSideModule.FRIEND_TYPE.MUTE, tweet, null),
                        TwitSideModule.Friends.loadFriendIdList(TwitSideModule.FRIEND_TYPE.NORETWEET, tweet, null)
                    ]);

                }).catch((result) => {
                    TwitSideModule.Message.throwError(result);
                });
        },

        // ユーザ設定を取得
        // return value
        getUserInfo : function(userid_str, key_str)
        {
            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');

            // useridが無い場合はすべてを返す
            if (!userid_str) return users;

            // useridが-1の時はTwitSide
            if (userid_str == -1) {
                let ts_user = {
                    oauth_token : '',
                    oauth_token_secret : '',
                    user_id : -1,
                    screen_name : 'from Twit Side',
                    profile_image_url : browser.extension.getURL('images/logo-32.png')
                };
                if (!key_str) return ts_user;
                if (ts_user[key_str] == null)
                    throw new Error('KEY_IS_NOT_DEFINED');
                return ts_user[key_str];
            }

            // 通常のユーザ
            if (users[userid_str] == null)
                throw new Error('USER_IS_NOT_REGISTERED');
            // keyが無い場合はオブジェクトを返す
            if (!key_str) return users[userid_str];

            if (users[userid_str][key_str] == null)
                throw new Error('KEY_IS_NOT_DEFINED');
            // 値を返す
            return users[userid_str][key_str];
        },

        // ユーザの総数を取得
        // return value
        count : function()
        {
            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');
            var i = 0;
            for (let key in users) { i++; }
            return i;
        },

        // ユーザIDを順番に列挙した配列
        // return value
        allUserid : function()
        {
            // 保存値読み込み、保存されていない場合は初期ハッシュ
            var users = JSON.parse(TwitSideModule.config.getPref('users')
                                   || '{}');
            return Object.keys(users);
        },

        // リセット
        // return Promise
        reset : function()
        {
            userUpdated = {};
            return TwitSideModule.config.setPref('users', JSON.stringify({}))
                .then(() => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.USER_CHANGED,
                        action : TwitSideModule.ACTION.DELETE_ALL
                    });
                });
        }
    };
};
