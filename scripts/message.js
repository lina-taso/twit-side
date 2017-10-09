/**
 * @fileOverview Managing notifiactions
 * @name message.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

TwitSideModule.Message = (function() {

    /**
     * Private valuables
     */
    var notifications = {}, // {id : {userid, title, content, datetime, boxid}, ...}
        lastid = 0, // 特にカウントしているわけではない（重複防止）
        unread = false;


    /**
     * Private functions
     */
    // エラーメッセージを解釈
    function getErrorMessage(error)
    {
        return browser.i18n.getMessage(error.toString()) || error.toString();
    }

    // 通知一覧を取得（最初の指定件数）
    function getNotifications()
    {
        var count = TwitSideModule.config.getPref('notif_count'),
            ids = Object.keys(notifications).sort().reverse(),
            retdata = {};

        for (let id of ids.slice(0, 10)) {
            retdata[id] = JSON.parse(JSON.stringify(notifications[id]));
            retdata[id].datetime = TwitSideModule.text.convertTimeStamp(
                new Date(notifications[id].datetime * 1000),
                TwitSideModule.config.getPref('timeformat')
            );
            retdata[id].userinfo = TwitSideModule.ManageUsers.getUserInfo(notifications[id].userid);
        }

        return {count : count, data : retdata, next : ids.length > count};
    }

    return {

        // エラー投げ（background用）
        throwError : function(error)
        {
            var message = this.transMessage(error);
            TwitSideModule.debug.log(message);
            throw new tsException(message);

            function tsException(message)
            {
                var text_flag = false;
                if (Array.isArray(message)) [message, text_flag] = message;

                this.message = message;
                this.text_flag = text_flag;
                this.toString = message;
            }
        },

        /**
         * parameter format
         * 1. ({result: String, error: Error object, status: xhr.status})
         * 2. (Error object)
         * 3. (String)
         */
        // メッセージ変換
        transMessage : function(error)
        {
            var content,
                forceText = true;

            TwitSideModule.debug.log(error);

            // エラーが何も無い
            if (!error)
                content = getErrorMessage('unknownError');

            // コールバック関数からのエラー
            else if (error.error != null
                && error.result != null
                && error.status != null) {

                // Twitterのリザルトコードを採用出来るとき
                if (getErrorMessage('code'+error.result.code) != 'code'+error.result.code) {
                    content = getErrorMessage('code'+error.result.code);

                    if (error.result.message)
                        content += ' ('+error.result.message+')';
                }
                // メッセージが文字列でそのまま利用できるとき
                else if (typeof(error.result) == 'string'
                         && getErrorMessage(error.result) != error.result)
                    content = getErrorMessage(error.result);

                // HTTPのステータスコードを採用出来るとき
                else if (error.status
                         && (getErrorMessage('http'+error.status) != 'http'+error.status))
                    content = getErrorMessage('http'+error.status);

                // XHRの生データを採用出来るとき
                else if (typeof(error.result) == 'string') {
                    if (error.result.match(/Twitter\s\/\sOver\scapacity/m))
                        content = getErrorMessage('overCapacity');

                    else
                        content = error.result;
                }

                // debug message
                if (TwitSideModule.config.getPref('debug'))
                    content += '\n('+error.error.fileName+' : '+error.error.lineNumber+')';
            }

            // 直接のエラー new Error()を受け取ったとき
            else if (error.message != null)
                content = getErrorMessage(error.message)
                + '\n('+error.fileName+' : '+error.lineNumber+')';

            // メッセージが文字列
            else if (typeof(error) == 'string')
                content = getErrorMessage(error);

            // その他
            else content = getErrorMessage('unknownError');

            return [content, forceText];
        },

        // 一覧に追加、通知表示
        showNotification : function(data, popuponly)
        {
            // id 払い出し
            var id = 'notif_'
                + TwitSideModule.text.getUnixTime()
                + (('000'+lastid).slice(-3));
            lastid++;

            // 整形 (userid, title, content, datetime, boxid)
            data.userid = data.userid || '';
            data.title = data.title || '';
            data.datetime = data.datetime || TwitSideModule.text.getUnixTime();
            data.content = TwitSideModule.text.unescapeHTML(data.content).replace(
                    /\n/g,
                TwitSideModule.config.getPref('linefeed') ? '\n' : '');
            data.boxid = data.boxid || '';

            // ポップアップ
            browser.notifications.create(
                'twit-side-'+id, {
                    type : 'basic',
                    iconUrl : browser.extension.getURL('images/logo.svg'),
                    title : data.title,
                    message : data.content
                }
            );

            // 通知登録
            if (!popuponly) {
                notifications[id] = data;
                unread = true;

                // 通知
                postMessage({
                    reason : TwitSideModule.UPDATE.NOTIF_CHANGED,
                    action : TwitSideModule.ACTION.ADD,
                    unread : unread,
                    count : Object.keys(notifications).length,
                    notifications : getNotifications()
                });

                // バッジ
                browser.browserAction.setBadgeText({
                    text : unread ? Object.keys(notifications).length.toString() : ''
                });
            }
        },

        // 通知を削除
        removeNotifications : function(ids)
        {
            var deleted = [];
            // 指定削除
            if (ids) {
                for (let id of ids) {
                    delete notifications[id];
                    deleted.push(id);
                }
            }
            // 全削除
            else {
                deleted = Object.keys(notifications);
                notifications = {};
            }

            // 既読
            if (Object.keys(notifications).length == 0)
                unread = false;

            // 通知
            postMessage({
                reason : TwitSideModule.UPDATE.NOTIF_CHANGED,
                action : ids ? TwitSideModule.ACTION.DELETE : TwitSideModule.ACTION.DELETE_ALL,
                unread : unread,
                count : Object.keys(notifications).length,
                notifications : getNotifications()
            });

            // バッジ
            browser.browserAction.setBadgeText({
                text : unread ? Object.keys(notifications).length.toString() : ''
            });
        },

        // 通知既読
        readNotifications : function()
        {
            unread = false;
            // 通知
            postMessage({
                reason : TwitSideModule.UPDATE.NOTIF_CHANGED,
                action : TwitSideModule.ACTION.READ,
                unread : unread,
                count : Object.keys(notifications).length
            });

            // バッジ
            browser.browserAction.setBadgeText({
                text : unread ? Object.keys(notifications).length.toString() : ''
            });
        },

        // 再読み込み
        reloadNotifications : function()
        {
            // 通知
            postMessage({
                reason : TwitSideModule.UPDATE.NOTIF_CHANGED,
                action : TwitSideModule.ACTION.ADD,
                unread : unread,
                count : Object.keys(notifications).length,
                notifications : getNotifications()
            });

            // バッジ
            browser.browserAction.setBadgeText({
                text : unread ? Object.keys(notifications).length.toString() : ''
            });
        }
    };
})();
