/**
 * @fileOverview Managing columns
 * @name manage_colmuns.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var ManageColumns = function() {

    /**
     * Private valuables
     */
    var initialized = false,
        columns = {}, // {windowtype : {idx : { columninfo }}}
        timelines = {}; // {windowtype : {idx : { id , timeline }}}


    /**
     * Private functions
     */
    // カラムの情報を更新
    // return Promise
    function writeColumns(columnindex, tl_type, columnlabel, userid, options, parameters, win_type)
    {
        win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

        // カラム保存
        columns[win_type][columnindex] = {
            tl_type      : tl_type,
            columnlabel  : columnlabel,
            userid       : userid,
            options      : options,
            parameters   : parameters
        };

        if (win_type === TwitSideModule.WINDOW_TYPE.MAIN)
            // 値を保存
            return TwitSideModule.config.setPref('columns', JSON.stringify(columns[win_type]));
        else
            return Promise.resolve();
    }

    // DOM ID重複チェック
    // return boolean
    function checkIDused(id, win_type)
    {
        win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

        var target_timelines = timelines[win_type];
        for (let idx in target_timelines) {
            if (target_timelines[idx].id === id) return true; //used
        }
        return false; //unused
    }

    // カラムの初期化（Iが無い可能性もある）
    // return Promise
    function initColumn(columnindex_int, win_type)
    {
        win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

        var columninfo = columns[win_type][columnindex_int];
        // DOM ID
        var domid = TwitSideModule.text.makeid();
        while (checkIDused(domid, win_type)) domid = TwitSideModule.text.makeid();

        // ユーザ情報
        var userinfo = TwitSideModule.ManageUsers.getUserInfo(columninfo.userid);
        // Timeline作成
        var tl = createTimeline(
            columninfo.tl_type,
            domid,
            userinfo,
            win_type);

        // バインド
        timelines[win_type][columnindex_int] = {
            timeline : tl,
            id : domid
        };

        // タイムライン更新
        updateTimeline(tl, columninfo);

        return Promise.resolve(domid);
    }

    // タイムラインオブジェクト作成
    // return Timeline
    function createTimeline(tl_type, columnid, userinfo, win_type)
    {
        win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

        return new Timeline(tl_type, columnid, userinfo, win_type);
    }

    // タイムラインパラメータ設定
    // return none
    function updateTimeline(timeline, columninfo)
    {
        columninfo = JSON.parse(JSON.stringify(columninfo));
        // 基本的にはmute, noretweetは見ない
        columninfo.options.mute = false;
        columninfo.options.noretweet = false;

        switch (columninfo.tl_type) {
        case TwitSideModule.TL_TYPE.FAVORITE:
            // TEMPじゃないお気に入りはユーザ指定なし
            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref('favorite_count')
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1
            };
            break;
        case TwitSideModule.TL_TYPE.TEMP_FOLLOW:
        case TwitSideModule.TL_TYPE.TEMP_FOLLOWER:
            timeline.targetid = columninfo.parameters.user_id;
            break;
        case TwitSideModule.TL_TYPE.TEMP_FAVORITE:
            // TEMPのお気に入りはユーザ指定あり
            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref('favorite_count'),
                user_id : columninfo.parameters.user_id
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1,
                user_id : columninfo.parameters.user_id
            };
            break;
        case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
        case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
        case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            // リスト初期化
            timeline.listInitialize(columninfo.parameters.user_id);
            break;
        case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
        case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            // リスト初期化
            timeline.listInitialize(columninfo.parameters.list_id);
            break;
        case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
        case TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE:
            // Timelineモジュール埋め込みのため空白
            timeline.getNewerHash = {};
            timeline.getOlderHash = {};
            break;
        case TwitSideModule.TL_TYPE.SEARCH:
        case TwitSideModule.TL_TYPE.TEMP_SEARCH:
            // 検索タイムラインはmute有効
            columninfo.options.mute = TwitSideModule.config.getPref('mute_onsearch');

            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref('search_count'),
                q : columninfo.parameters.q,
                result_type : columninfo.parameters.result_type
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1,
                q : columninfo.parameters.q,
                result_type : columninfo.parameters.result_type
            };
            break;
        case TwitSideModule.TL_TYPE.LISTTIMELINE:
            // リストタイムラインはmute, noretweet有効
            columninfo.options.mute = true;
            columninfo.options.noretweet = true;

            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref('timeline_count'),
                list_id : columninfo.parameters.list_id
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1,
                list_id : columninfo.parameters.list_id
            };
            break;
        case TwitSideModule.TL_TYPE.TEMP_USERTIMELINE:
            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref('profile_count'),
                user_id : columninfo.parameters.user_id,
                include_rts : 'true'
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1,
                user_id : columninfo.parameters.user_id,
                include_rts : 'true'
            };
            break;
        case TwitSideModule.TL_TYPE.TIMELINE:
            // ホームタイムラインはmute, noretweet有効
            columninfo.options.mute = true;
            columninfo.options.noretweet = true;
        default:
            timeline.getNewerHash = {
                count : TwitSideModule.config.getPref(
                    TwitSideModule.getTimelineName(columninfo.tl_type)+'_count')
            };
            timeline.getOlderHash = {
                count : TwitSideModule.config.getPref('autopager_count')+1
            };
        }

        // オプション再読込
        timeline.updateOptions(columninfo.options);
    }


    /**
     * Public
     */
    return {

        get initialized()
        {
            return initialized;
        },

        // 全カラム初期化（bootstrap.js上で実行）
        // return Promise
        initialize : function()
        {
            // 変数へ読み込み
            this.updateColumnsInfo();

            // カラム初期化
            var inits = [];
            for (let idx in columns[TwitSideModule.WINDOW_TYPE.MAIN]) {
                inits.push(initColumn(idx));
            }

            return Promise.all(inits)
                .then(() => {
                    initialized = true;

                    TwitSideModule.debug.log('Manage columns initialized');
                });
        },

        unload : function()
        {
            for (let idx in columns[TwitSideModule.WINDOW_TYPE.MAIN]) {
                timelines[TwitSideModule.WINDOW_TYPE.MAIN][idx].timeline.beforeDestroy();
            }

            initialized = false;
        },

        // 設定からカラム読み込み
        // return none
        updateColumnsInfo : function()
        {
            columns[TwitSideModule.WINDOW_TYPE.MAIN]
                = JSON.parse(TwitSideModule.config.getPref('columns') || '{}');
            timelines[TwitSideModule.WINDOW_TYPE.MAIN]
                = timelines[TwitSideModule.WINDOW_TYPE.MAIN] || {};

            // temp初期化
            var win_types = [
                TwitSideModule.WINDOW_TYPE.PROFILE,
                TwitSideModule.WINDOW_TYPE.SEARCH,
                TwitSideModule.WINDOW_TYPE.MUTE,
                TwitSideModule.WINDOW_TYPE.NORETWEET,
                TwitSideModule.WINDOW_TYPE.LISTMEMBER
            ];
            for (let win_type of win_types) {
                columns[win_type] = columns[win_type] || {};
                timelines[win_type] = timelines[win_type] || {};
            }
        },

        /**
         * options_hash
         * { onstart : {boolean}
         *   autoreload : {boolean}
         *   stream : {boolean}
         *   notif : {boolean} }
         */

        // カラムを追加
        // return Promise
        addColumn : function(
            tl_type,                // タイムライン種別文字列
            columnlabel_str,        // タイムライン更新ボタンラベル文字列
            userid_int,             // ユーザーID数字
            options_hash,           // カラムの設定ハッシュ
            parameters_hash,        // 検索等のキーワードハッシュ
            win_type,
            temp_index_int)
        {
            if (tl_type == null) throw new Error('PARAMETER_IS_NOT_DEFINED');
            if (columnlabel_str == null) throw new Error('PARAMETER_IS_NOT_DEFINED');
            if (userid_int == null) throw new Error('PARAMETER_IS_NOT_DEFINED');
            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;
            if (win_type !== TwitSideModule.WINDOW_TYPE.MAIN
                && temp_index_int == null) throw new Error('INDEX_IS_REQUIRED');
            if (parameters_hash == null) parameters_hash = {};

            // カラム作成
            var columnindex = win_type !== TwitSideModule.WINDOW_TYPE.MAIN
                ? temp_index_int : this.count();
            return writeColumns(columnindex, tl_type, columnlabel_str, userid_int,
                                options_hash, parameters_hash, win_type)
                .then(() => {
                    // カラム初期化
                    return initColumn(columnindex, win_type);
                })
                .then((domid) => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.COLUMN_CHANGED,
                        action : TwitSideModule.ACTION.ADD,
                        index : columnindex,
                        columnid : domid,
                        columninfo : columns[win_type][columnindex],
                        window_type : win_type
                    });
                });
        },

        // カラムを編集
        // return Promise
        editColumn : function(
            columnindex_int,        // カラムINDEX数字
            update_info_hash,       // 更新するパラメータ
            win_type)
        {
            if (columnindex_int == null) throw new Error('PARAMETER_IS_NOT_DEFINED');
            if (update_info_hash == null) throw new Error('PARAMETER_IS_NOT_DEFINED');

            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            var columninfo = columns[win_type][columnindex_int],
                tl = timelines[win_type][columnindex_int].timeline;

            var tl_type = columninfo.tl_type,
                columnlabel = update_info_hash.columnlabel
                || columninfo.columnlabel,
                userid = columninfo.userid,
                options = update_info_hash.options
                || columninfo.options,
                parameters = update_info_hash.parameters
                || columninfo.parameters;

            // カラム更新
            return writeColumns(columnindex_int, tl_type, columnlabel, userid,
                                options, parameters, win_type)
                .then(() => {
                    // タイムライン更新
                    updateTimeline(tl, columninfo);

                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.COLUMN_CHANGED,
                        action : TwitSideModule.ACTION.EDIT,
                        index : columnindex_int,
                        columnid : timelines[win_type][columnindex_int].id,
                        columninfo : columns[win_type][columnindex_int],
                        window_type : win_type
                    });
                });
        },

        // カラムの順序を変更 tempは未使用
        sortColumn : function(oldindex_int, newindex_int)
        {
            var win_type = TwitSideModule.WINDOW_TYPE.MAIN;

            for (let index=oldindex_int;
                 oldindex_int < newindex_int ? index < newindex_int : index > newindex_int;) {

                // 入れ替え
                [columns[win_type][index],
                 columns[win_type][oldindex_int < newindex_int ? index+1 : index-1]]
                    = [columns[win_type][oldindex_int < newindex_int ? index+1 : index-1],
                       columns[win_type][index]];
                // 入れ替え、ここでインクリメント、デクリメントする
                [timelines[win_type][index],
                 timelines[win_type][oldindex_int < newindex_int ? ++index : --index]]
                    = [timelines[win_type][oldindex_int < newindex_int ? index+1 : index-1],
                       timelines[win_type][index]];
            }

            // 値を保存
            return TwitSideModule.config.setPref('columns', JSON.stringify(columns[win_type]))
                .then(() => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.COLUMN_CHANGED,
                        action : TwitSideModule.ACTION.SORT,
                        old_index : oldindex_int,
                        new_index : newindex_int,
                        columnid : timelines[win_type][oldindex_int].id,
                        window_type : win_type
                    });
                });
        },

        // 設定上からカラムを削除
        // return Promise
        deleteColumn : function(columnindex_int, win_type)
        {
            if (columnindex_int == null) throw new Error('PARAMETER_IS_NOT_DEFINED');

            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            var target_columns = columns[win_type],
            target_timelines = timelines[win_type];

            if (target_columns[columnindex_int] == null)
                throw new Error('COLUMN_IS_NOT_REGISTERED');

            var delete_id = target_timelines[columnindex_int].id,
            userid = target_columns[columnindex_int].userid;

            target_timelines[columnindex_int].timeline.beforeDestroy();
            target_timelines[columnindex_int].timeline = null;
            delete target_timelines[columnindex_int];
            delete target_columns[columnindex_int];

            if (win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
                var c = this.count();
                // カラムを詰める
                for (let i = columnindex_int; i < c; i++) {
                    target_timelines[i] = target_timelines[i+1];
                    target_columns[i] = target_columns[i+1];
                }
                delete target_timelines[c];
                delete target_columns[c];

                // 値を保存
                return TwitSideModule.config.setPref('columns', JSON.stringify(columns[win_type]))
                    .then(() => {
                        // ユーザーが使用しているカラム数取得
                        var count = this.count(userid);
                        // ユーザーが使用しているカラムが0件の場合は、ユーザーも削除
                        if (count == 0)
                            return TwitSideModule.ManageUsers.deleteUser(userid);
                        else
                            return Promise.resolve();
                    })
                    .then(() => {
                        // 更新通知
                        postMessage({
                            reason : TwitSideModule.UPDATE.COLUMN_CHANGED,
                            action : TwitSideModule.ACTION.DELETE,
                            old_index : columnindex_int,
                            columnid : delete_id,
                            window_type : win_type
                        });
                    });
            }
            else
                return Promise.resolve();

        },

        // カラム検索
        // return value
        searchColumn : function(query_hash, win_type)
        {
            win_type = win_type ||  TwitSideModule.WINDOW_TYPE.MAIN;

            var result_index = [];

            for (let idx in columns[win_type]) {
                let match = true;
                for (let key in query_hash) {
                    // 特殊キー
                    if (key == 'streaming') {
                        if (query_hash[key] == true
                            && timelines[win_type][idx].timeline.loadingStreamState
                            != TwitSideModule.TL_STATE.STREAMING) {
                            match = false;
                            break;
                        }
                        else if (query_hash[key] == false
                                 && timelines[win_type][idx].timeline.loadingStreamState
                                 == TwitSideModule.TL_STATE.STREAMING) {
                            match = false;
                            break;
                        }
                        continue;
                    }
                    // キー存在無し
                    if (!columns[win_type][idx][key])
                        throw new Error('QUERY_KEY_IS_NOT_DEFINED');
                    // キー不一致
                    if (columns[win_type][idx][key] != query_hash[key]) {
                        match = false;
                        break;
                    }
                    // 残りは一致
                }
                if (match) result_index.push(idx);
            }

            return result_index;
        },

        // カラム設定を取得
        // return value
        getColumnInfo : function(columnindex_int, key_str, win_type)
        {
            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            // columnindexが無い場合はすべてを返す
            if (columnindex_int == null)
                return columns[win_type];

            var column = columns[win_type][columnindex_int];
            if (column == null)
                throw new Error('COLUMN_IS_NOT_REGISTERED');
            // keyが無い場合はオブジェクトを返す
            if (!key_str) return column;

            if (column[key_str] == null)
                throw new Error('KEY_IS_NOT_DEFINED');
            // 値を返す
            return column[key_str];
        },

        // タイムライン情報を取得
        // return value
        getTimelineInfo : function(columnindex_int, key_str, win_type)
        {
            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            // columnindexが無い場合はすべてを返す
            if (columnindex_int == null)
                return timelines[win_type];

            var timeline = timelines[win_type][columnindex_int];
            if (timeline == null)
                throw new Error('COLUMN_IS_NOT_REGISTERED');
            // keyが無い場合はオブジェクトを返す
            if (!key_str) return timeline;

            if (timeline[key_str] == null)
                throw new Error('KEY_IS_NOT_DEFINED');
            // 値を返す
            return timeline[key_str];
        },

        getAllTweets : function(columnindex_int, win_type)
        {
            if (columnindex_int == null) throw new Error('PARAMETER_IS_NOT_DEFINED');

            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            return timelines[win_type][columnindex_int].timeline.allTweets;
        },

        // カラムの総数を取得
        // return value
        count : function(userid_int, win_type)
        {
            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            var i = 0,
            target = columns[win_type];

            for (let idx in target) {
                if (!userid_int) i++;
                else if (target[idx].userid == userid_int) i++;
            }
            return i;
        },

        // リセット
        // return Promise
        reset : function(win_type)
        {
            win_type = win_type || TwitSideModule.WINDOW_TYPE.MAIN;

            var target_columns = columns[win_type],
                target_timelines = timelines[win_type];

            for (let idx in target_timelines) {
                target_timelines[idx].timeline.beforeDestroy();
                target_timelines[idx] = null;
                delete target_timelines[idx];
                delete target_columns[idx];
            }

            return (win_type === TwitSideModule.WINDOW_TYPE.MAIN
                    // 値を保存
                    ? Promise.all([
                        TwitSideModule.config.setPref('columns', JSON.stringify({})),
                        // ユーザもリセット
                        TwitSideModule.ManageUsers.reset()
                    ])
                    : Promise.resolve())
                .then(() => {
                    // 更新通知
                    postMessage({
                        reason : TwitSideModule.UPDATE.COLUMN_CHANGED,
                        action : TwitSideModule.ACTION.DELETE_ALL,
                        window_type : win_type
                    });
                });
        }
    };
};
