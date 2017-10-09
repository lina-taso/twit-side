/**
 * @fileOverview Managing friends
 * @name friends.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

TwitSideModule.Friends = (function() {

    const INTERVAL = 600,
          FRIENDSCOUNT = 500;


    /**
     * Private valuables
     */
    var follows = {}, // {userid: { ids: [userid, userid,...], cursor: next, loading: true/false, updated}, userid: {}...}
        followers = {},
        mutes = {},
        noretweets = {}, // {userid: { ids: [userid, userid,...], updated}, userid: {}...}
        latestfriends = [];


    /**
     * Public
     */
    return {

        // 続きの有無
        // return value
        hasMoreFollow : function(userid)
        {
            return follows[userid]
                && follows[userid].cursor != null
                && follows[userid].cursor != '0'
                ? true : false;
        },

        // 続きの有無
        // return value
        hasMoreFollower : function(userid)
        {
            return followers[userid]
                && followers[userid].cursor != null
                && followers[userid].cursor != '0'
                ? true : false;
        },

        // 続きの有無
        // return value
        hasMoreMute : function(ownid)
        {
            return mutes[ownid]
                && mutes[ownid].cursor != null
                && mutes[ownid].cursor != '0'
                ? true : false;
        },

        // 続きの有無
        // return value
        hasMoreNoretweet : function(ownid)
        {
            return false;
        },

        // フレンド一覧初期化
        // return none
        clearFriends : function(type, userid)
        {
            switch (type) {
            case TwitSideModule.FRIEND_TYPE.FOLLOW:
                if (follows[userid])
                    delete follows[userid];
                break;
            case TwitSideModule.FRIEND_TYPE.FOLLOWER:
                if (followers[userid])
                    delete followers[userid];
                break;
            case TwitSideModule.FRIEND_TYPE.MUTE:
                if (mutes[userid])
                    delete mutes[userid];
                break;
            case TwitSideModule.FRIEND_TYPE.NORETWEET:
                if (noretweets[userid])
                    delete noretweets[userid];
                break;
            }
        },

        // return value
        getFollows : function(userid)
        {
            if (follows[userid])
                return follows[userid].ids;
            else
                return null;
        },
        // return value
        getFollowers : function(userid)
        {
            if (followers[userid])
                return followers[userid].ids;
            else
                return null;
        },
        // return value
        getMutes : function(ownid)
        {
            if (mutes[ownid])
                return mutes[ownid].ids;
            else
                return null;
        },
        // return value
        getNoretweets : function(ownid)
        {
            if (noretweets[ownid])
                return noretweets[ownid].ids;
            else
                return null;
        },
        // return value
        get latestfriends()
        {
            return latestfriends;
        },

        // 友達のユーザID一覧を取得
        // return Promise
        loadFriendIdList : function(type, tweet, userid)
        {
            userid = userid || tweet.user_id;
            var optionsHash = {user_id : userid};

            switch (type) {
            case TwitSideModule.FRIEND_TYPE.FOLLOW:
                // 読み込み中なら終了
                if (follows[userid] && follows[userid].loading)
                    return Promise.resolve();
                // 未取得時
                if (follows[userid] == null) {
                    follows[userid] = {};
                    follows[userid].ids = [];
                    follows[userid].cursor = null;
                    follows[userid].loading = false;
                    follows[userid].updated = 0;
                }
                // 取得済み（カーソル）
                else if (follows[userid].cursor != '0')
                    optionsHash['cursor'] = follows[userid].cursor;
                // 取得完了時（最終取得から時間経過）
                else if (follows[userid].updated + INTERVAL < TwitSideModule.text.getUnixTime()) {
                    delete follows[userid];
                    follows[userid] = {};
                    follows[userid].ids = [];
                    follows[userid].cursor = null;
                    follows[userid].loading = false;
                    follows[userid].updated = 0;
                }
                // 取得完了時
                else return Promise.resolve();
                // 取得実施
                follows[userid].loading = true;
                return tweet.followlist(optionsHash)
                    .then((result) => {
                        follows[userid].loading = false;
                        follows[userid].ids = follows[userid].ids.concat(result.data.ids);
                        follows[userid].cursor = result.data.next_cursor_str;
                        follows[userid].updated = TwitSideModule.text.getUnixTime();
                    })
                    .catch((e) => {
                        follows[userid].loading = false;
                    });

            case TwitSideModule.FRIEND_TYPE.FOLLOWER:
                // 読み込み中なら終了
                if (followers[userid] && followers[userid].loading)
                    return Promise.resolve();
                // 未取得時
                if (followers[userid] == null) {
                    followers[userid] = {};
                    followers[userid].ids = [];
                    followers[userid].cursor = null;
                    followers[userid].loading = false;
                    followers[userid].updated = 0;
                }
                // 取得済み（カーソル）
                else if (followers[userid].cursor != '0')
                    optionsHash['cursor'] = followers[userid].cursor;
                // 取得完了時（最終取得から時間経過）
                else if (followers[userid].updated + INTERVAL < TwitSideModule.text.getUnixTime()) {
                    delete followers[userid];
                    followers[userid] = {};
                    followers[userid].ids = [];
                    followers[userid].cursor = null;
                    followers[userid].loading = false;
                    followers[userid].updated = 0;
                }
                // 取得完了時
                else return Promise.resolve();
                // 取得実施
                followers[userid].loading = true;
                return tweet.followerlist(optionsHash)
                    .then((result) => {
                        followers[userid].loading = false;
                        followers[userid].ids = followers[userid].ids.concat(result.data.ids);
                        followers[userid].cursor = result.data.next_cursor_str;
                        followers[userid].updated = TwitSideModule.text.getUnixTime();
                    })
                    .catch((e) => {
                        followers[userid].loading = false;
                    });

            case TwitSideModule.FRIEND_TYPE.MUTE:
                // 読み込み中なら終了
                if (mutes[userid] && mutes[userid].loading)
                    return Promise.resolve();
                // 未取得時
                if (mutes[userid] == null) {
                    mutes[userid] = {};
                    mutes[userid].ids = [];
                    mutes[userid].cursor = null;
                    mutes[userid].loading = false;
                    mutes[userid].updated = 0;
                }
                // 取得済み（カーソル）
                //else if (mutes[userid].cursor != 0)
                //    optionsHash['cursor'] = mutes[userid].cursor;
                // 取得完了時（最終取得から時間経過）
                else if (mutes[userid].updated + INTERVAL < TwitSideModule.text.getUnixTime()) {
                    delete mutes[userid];
                    mutes[userid] = {};
                    mutes[userid].ids = [];
                    mutes[userid].cursor = null;
                    mutes[userid].loading = false;
                    mutes[userid].updated = 0;
                }
                // 取得完了時
                else return Promise.resolve();
                // 取得実施
                mutes[userid].loading = true;
                return tweet.mutelist(optionsHash)
                    .then((result) => {
                        mutes[userid].loading = false;
                        mutes[userid].ids = mutes[userid].ids.concat(result.data.ids);
                        mutes[userid].cursor = result.data.next_cursor_str;
                        mutes[userid].updated = TwitSideModule.text.getUnixTime();

                        // カーソルがある場合は続きのIDを取得
                        if (result.data.next_cursor_str != '0')
                            return this.loadFriendIdList(type, tweet, userid);
                        else
                            return Promise.resolve();
                    })
                    .catch((e) => {
                        mutes[userid].loading = false;
                    });

            case TwitSideModule.FRIEND_TYPE.NORETWEET:
                // 読み込み中なら終了
                if (noretweets[userid] && noretweets[userid].loading)
                    return Promise.resolve();
                // 未取得時
                if (noretweets[userid] == null) {
                    noretweets[userid] = {};
                    noretweets[userid].ids = [];
                    noretweets[userid].updated = 0;
                }
                // 取得完了時（最終取得から時間経過）
                else if (noretweets[userid].updated + INTERVAL < TwitSideModule.text.getUnixTime()) {
                    delete noretweets[userid];
                    noretweets[userid] = {};
                    noretweets[userid].ids = [];
                    noretweets[userid].loading = false;
                    noretweets[userid].updated = 0;
                }
                // 取得完了時
                else return Promise.resolve();
                // 取得実施
                noretweets[userid].loading = true;
                return tweet.noretweets(optionsHash)
                    .then((result) => {
                        noretweets[userid].loading = false;
                        noretweets[userid].ids = result.data;
                        noretweets[userid].updated = TwitSideModule.text.getUnixTime();
                    })
                    .catch((e) => {
                        noretweets[userid].loading = false;
                    });

            default:
                return Promise.reject();
            }
        },

        // ユーザのフレンドシップ（ミュート、リツイート非表示）を変更
        // return Promise
        updateFriendship : function(type, userid, value_bool, tweet)
        {
            var ownid = tweet.user_id;

            switch (type) {
            case TwitSideModule.FRIEND_TYPE.FOLLOW:
                return value_bool
                    ? tweet.follow({ user_id : userid })
                : tweet.unfollow({ user_id : userid });

            case TwitSideModule.FRIEND_TYPE.MUTE:
                return value_bool
                    ? tweet.mute({ user_id : userid })
                    .then(() => {
                        var idx = mutes[ownid].ids.indexOf(userid);
                        if (idx<0) mutes[ownid].ids.push(userid);
                    })
                : tweet.unmute({ user_id : userid })
                    .then(() => {
                        var idx = mutes[ownid].ids.indexOf(userid);
                        if (idx>=0) mutes[ownid].ids.splice(idx, 1);
                    });

            case TwitSideModule.FRIEND_TYPE.NORETWEET:
                return tweet.updateFriendship({ user_id : userid,
                                                retweets : !value_bool })
                    .then(() => {
                        var idx = noretweets[ownid].ids.indexOf(userid);
                        if (value_bool)
                            if (idx<0) noretweets[ownid].ids.push(userid);
                        else
                            if (idx>=0) noretweets[ownid].ids.splice(idx, 1);
                    });

            case TwitSideModule.FRIEND_TYPE.SHOW:
                return tweet.showFriendship({ target_id : userid });

            default:
                return Promise.reject();
            }
        },

        // 最近のスクリーンネーム
        // return value
        updateLatestFriends : function(friendid)
        {
            var idx = latestfriends.indexOf(friendid);

            if (idx >= 0)
                latestfriends.splice(idx, 1);
            latestfriends.unshift(friendid);

            if (latestfriends.length > FRIENDSCOUNT)
                latestfriends.pop();
        },

        // ユーザIDからユーザ情報取得（最初の100件）
        // return Promise
        lookup : function(userids, tweet)
        {
            return tweet.userLookup({ user_id : userids.join(',') });
        }
    };
})();
