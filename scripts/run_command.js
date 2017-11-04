/**
 * @fileOverview Run commands
 * @name run_command.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

function CONFIG_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.CONFIG_LOAD:
        return Promise.resolve(TwitSideModule.config._prefs);
    case TwitSideModule.COMMAND.CONFIG_SET:
        return TwitSideModule.config.setPref(message.key, message.value);
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function TWEET_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.TWEET_REQUEST:
        return (new Tweet()).request();
    case TwitSideModule.COMMAND.TWEET_ACCESS:
        return (new Tweet(message.oauth_token)).access(message.pin);
    case TwitSideModule.COMMAND.TWEET_TWEET:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .tweet(message.options);
    case TwitSideModule.COMMAND.TWEET_TWEET_MEDIA:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .tweet_withmedia(message.options, { win_type : message.win_type, id : message.id });
    case TwitSideModule.COMMAND.TWEET_SENDDM:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .dmNew(message.options);
    case TwitSideModule.COMMAND.TWEET_USERSHOW:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .userShow(message.options);
    case TwitSideModule.COMMAND.TWEET_SHOWAPI:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .showAPI(message.options);
    case TwitSideModule.COMMAND.TWEET_UPLOAD_MEDIA:
        return (new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.userid)))
            .upload_media(message.options, message.files, { win_type : message.win_type, id : message.id });
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function COLUMN_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.COLUMN_ADD:
        return TwitSideModule.ManageColumns.addColumn(
            message.tl_type,
            message.columnlabel,
            message.userid,
            message.options,
            message.parameters,
            message.win_type || null,
            message.temp_index == null ? null : message.temp_index
        );
    case TwitSideModule.COMMAND.COLUMN_EDIT:
        return TwitSideModule.ManageColumns.editColumn(
            message.columnindex,
            message.columninfo,
            message.win_type || null
        );
    case TwitSideModule.COMMAND.COLUMN_SORT:
        return TwitSideModule.ManageColumns.sortColumn(
            message.oldindex,
            message.newindex
        );
    case TwitSideModule.COMMAND.COLUMN_DELETE:
        return TwitSideModule.ManageColumns.deleteColumn(
            message.columnindex,
            message.win_type || null
        );
    case TwitSideModule.COMMAND.COLUMN_SEARCH:
        return Promise.resolve(TwitSideModule.ManageColumns.searchColumn(
            message.query_hash,
            message.win_type
        ));
    case TwitSideModule.COMMAND.COLUMN_GETCOLINFO:
        return Promise.resolve(TwitSideModule.ManageColumns.getColumnInfo(
            message.columnindex,
            message.key,
            message.win_type
        ));
    case TwitSideModule.COMMAND.COLUMN_GETTLINFO:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex,
            message.key,
            message.win_type
        ));
    case TwitSideModule.COMMAND.COLUMN_GETTWEETS:
        return Promise.resolve(TwitSideModule.ManageColumns.getAllTweets(
            message.columnindex,
            message.win_type
        ));
    case TwitSideModule.COMMAND.COLUMN_COUNT:
        return Promise.resolve(TwitSideModule.ManageColumns.count(
            message.userid,
            message.win_type
        ));
    case TwitSideModule.COMMAND.COLUMN_RESET:
        return TwitSideModule.ManageColumns.reset(
            message.win_type
        );
    case TwitSideModule.COMMAND.TL_GETNEWER:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).getNewer());
    case TwitSideModule.COMMAND.TL_GETOLDER:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).getOlder());
    case TwitSideModule.COMMAND.TL_GETMORE:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).getMore(message.tweetid));
    case TwitSideModule.COMMAND.TL_RETWEET:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).retweet(message.tweetid));
    case TwitSideModule.COMMAND.TL_FAVORITE:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).favorite(message.tweetid, message.sw));
    case TwitSideModule.COMMAND.TL_REPLIES:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).replies(message.tweetid, message.inlineid));
    case TwitSideModule.COMMAND.TL_DESTROY:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).destroy(message.tweetid));
    case TwitSideModule.COMMAND.TL_RETWEETERS:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).retweeters(message.tweetid));
    case TwitSideModule.COMMAND.TL_STOPSTREAM:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).stopStream());
    case TwitSideModule.COMMAND.TL_LISTCREATE:
        return TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).createList(message.listinfo);
    case TwitSideModule.COMMAND.TL_LISTUPDATE:
        return TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).updateList(message.listinfo);
    case TwitSideModule.COMMAND.TL_LISTSUBSCRIBE:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).subscribeList(message.listid));
    case TwitSideModule.COMMAND.TL_LISTUNSUBSCRIBE:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).unsubscribeList(message.listid));
    case TwitSideModule.COMMAND.TL_GETTWEETINFO:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).tweetInfo(message.tweetid));
    case TwitSideModule.COMMAND.TL_RENOTIFYSTATUS:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).renotifyStatus());
    case TwitSideModule.COMMAND.TL_VOTE:
        return Promise.resolve(TwitSideModule.ManageColumns.getTimelineInfo(
            message.columnindex, 'timeline', message.win_type
        ).voteAutoClear(message.vote));
    }

    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function USER_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.USER_ADD:
        return TwitSideModule.ManageUsers.addUser(message.oauth_hash);
    case TwitSideModule.COMMAND.USER_DELETE:
        return TwitSideModule.ManageUsers.deleteUser(message.userid);
    case TwitSideModule.COMMAND.USER_GETINFO:
        return Promise.resolve(TwitSideModule.ManageUsers.getUserInfo(message.userid, message.key));
    case TwitSideModule.COMMAND.USER_COUNT:
        return Promise.resolve(TwitSideModule.ManageUsers.count());
    case TwitSideModule.COMMAND.USER_ALLID:
        return Promise.resolve(TwitSideModule.ManageColumns.allUserid());
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function FRIEND_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.FRIEND_FOLLOWS:
        return Promise.resolve(TwitSideModule.Friends.getFollows(
            message.userid));
    case TwitSideModule.COMMAND.FRIEND_FOLLOWERS:
        return Promise.resolve(TwitSideModule.Friends.getFollowers(
            message.userid));
    case TwitSideModule.COMMAND.FRIEND_MUTES:
        return Promise.resolve(TwitSideModule.Friends.getMutes(
            message.userid));
    case TwitSideModule.COMMAND.FRIEND_NORETWEETS:
        return Promise.resolve(TwitSideModule.Friends.getNoretweets(
            message.userid));
    case TwitSideModule.COMMAND.FRIEND_FRIENDSHIPS:
        return TwitSideModule.Friends.updateFriendship(
            message.type,
            message.target_userid,
            message.value,
            new Tweet(TwitSideModule.ManageUsers.getUserInfo(message.own_userid)));
    case TwitSideModule.COMMAND.FRIEND_LATESTS:
        return Promise.resolve(TwitSideModule.Friends.latestfriends);
    case TwitSideModule.COMMAND.FRIEND_CLEARLIST:
        return Promise.resolve(TwitSideModule.Friends.clearFriends(
            message.type,
            message.userid));
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function MSG_OPE(message) {
    switch (message.action) {
    case TwitSideModule.COMMAND.MSG_TRANSMSG:
        return Promise.resolve(TwitSideModule.Message.transMessage(message.error));
    case TwitSideModule.COMMAND.MSG_SHOWNOTIF:
        return Promise.resolve(TwitSideModule.Message.showNotification(
            message.data,
            message.popuponly
        ));
    case TwitSideModule.COMMAND.MSG_REMOVE:
        return Promise.resolve(TwitSideModule.Message.removeNotifications(message.ids));
    case TwitSideModule.COMMAND.MSG_READ:
        return Promise.resolve(TwitSideModule.Message.readNotifications());
    case TwitSideModule.COMMAND.MSG_RELOAD:
        return Promise.resolve(TwitSideModule.Message.reloadNotifications());
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');
}

function WINDOW_OPE(message) {
    var suffix = message.suffix,
        wininfo = checkWindowExistence(suffix);

    switch (message.action) {
    case TwitSideModule.COMMAND.WINDOW_OPEN:
        // ウィンドウがある場合
        if (wininfo) {
            // ウィンドウ開き中
            if (wininfo.opening) return Promise.reject();
            // ウィンドウ初期化前
            if (wininfo.parameters) return Promise.reject();

            updateWindow(wininfo.id, message.parameters);
            return browser.windows.update(wininfo.id, { focused : true });
        }
        // ウィンドウがない場合
        else {
            windows[suffix] = { opening : true };
            return browser.windows.create(message.options)
                .then((win) => {
                    // メインウィンドウがopenerでない場合
                    if (typeof message.opener === 'string') {
                        message.opener = checkWindowExistence(message.opener).opener;
                    }

                    windows[suffix] = { id : win.id,
                                        parameters : message.parameters,
                                        opener : message.opener,
                                        opening : false };
                });
        }
    case TwitSideModule.COMMAND.WINDOW_INITED:
        return Promise.resolve(updateWindow(wininfo.id, wininfo.parameters));
    case TwitSideModule.COMMAND.WINDOW_RUNINMAINUI:
        return runInMainUI();
    }
    return Promise.reject('ACTION_IS_NOT_DEFINED');

    // ウィンドウの存在確認
    function checkWindowExistence(suffix)
    {
        // check all window
        if (windows[suffix]) return windows[suffix];
        return null;
    }

    // ウィンドウにパラメータを渡す
    function updateWindow(id, parameters)
    {
        postMessage({
            reason : TwitSideModule.UPDATE.WINDOW_CHANGED,
            suffix : suffix,
            parameters : parameters
        }, id.toString() );
        wininfo.parameters = null;
    }

    // 通常ウィンドウで実行
    function runInMainUI()
    {
        var opener = checkWindowExistence(suffix).opener;
        browser.windows.update(opener, { focused : true });
        postMessage({
            reason : TwitSideModule.UPDATE.FUNCTION_RECIEVED,
            function : message.function,
            parameters : message.parameters,
            winid : opener
        }, opener.toString());
    }
}
