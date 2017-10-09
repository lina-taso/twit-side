/**
 * @fileOverview Lists module
 * @name lists.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var Lists = function(
    tweet_obj,    // ツイート
    tl_type,      // TL_TYPE
    targetid)     // 対象のID数字（ユーザID、リストID）
{
    // 個別設定
    this._tweet = tweet_obj;
    this._own_userid = tweet_obj.user_id;
    this._tl_type = tl_type;

    switch (tl_type) {
    case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
    case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
    case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
        this._mode = 'list';
        this._userid = targetid;
        this._lists_cursor = '-1';
        break;
    case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
    case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
        this._mode = 'listmember';
        this._listid = targetid;
        this._members_cursor = '-1';
        break;
    }
};

Lists.prototype = {
    LISTS_COUNT : 200,
    LISTMEMBERS_COUNT : 500,

    // userid取得
    get userid()
    {
        if (this._own_userid) return this._own_userid;
        else return null;
    },
    // target_userid / target_listid取得
    get targetid()
    {
        if (this._mode == 'list')
            return this._userid;
        else if (this._mode == 'listmember')
            return this._listid;
        return null;
    },
    get mode()
    {
        return this._mode;
    },
    // 続きの有無（リスト）
    get hasMorelist()
    {
        return this._lists_cursor != '0';
    },
    // 続きの有無（メンバー）
    get hasMoreListMember()
    {
        return this._lists.members.cursor != '0';
    },
    // 最初から読み込む（リスト）
    resetListsCursor: function()
    {
        this._lists_cursor = '-1';
    },
    // 最初から読み込む（メンバー）
    resetListMembersCursor: function()
    {
        this._members_cursor = '-1';
    },
    // リスト一覧
    // return Promise
    getListsList: function(optionsHash)
    {
        if (this._lists_cursor == '0') {
            return Promise.resove({ status : null, data : [] });
        }
        // Twitterに送信するオプション
        optionsHash.count = this.LISTS_COUNT;
        optionsHash.cursor = this._lists_cursor;
        optionsHash.user_id = this._userid;

        switch (this._tl_type) {
        case TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS:
            return this._tweet.ownershipListsList(optionsHash).then(callback.bind(this));
        case TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS:
            return this._tweet.subscriptionListsList(optionsHash).then(callback.bind(this));
        case TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS:
            return this._tweet.membershipListsList(optionsHash).then(callback.bind(this));
        }
        return Promise.reject();

        function callback(result)
        {
            TwitSideModule.debug.log('got listmembers: next_cursor = ' + result.data.next_cursor_str);

            this._lists_cursor = result.data.next_cursor_str;
            return Promise.resolve({ status : result.status,
                                     data : result.data.lists,
                                     more : this._lists_cursor != '0' });
        }
    },
    // リストメンバー一覧
    // return Promise
    getListMembers: function(optionsHash)
    {
        if (this._members_cursor == '0') {
            return Promise.resove({ status : null, data : [] });
        }
        // Twitterに送信するオプション
        optionsHash.count = this.LISTMEMBERS_COUNT;
        optionsHash.cursor = this._members_cursor;
        optionsHash.list_id = this._listid;

        switch (this._tl_type) {
        case TwitSideModule.TL_TYPE.TEMP_LISTMEMBER:
            return this._tweet.listMembers(optionsHash).then(callback.bind(this));
        case TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER:
            return this._tweet.listSubscribers(optionsHash).then(callback.bind(this));
        }
        return Promise.reject();

        function callback(result)
        {
            TwitSideModule.debug.log('got listmembers: next_cursor = ' + result.data.next_cursor_str);

            this._members_cursor = result.data.next_cursor_str;
            return Promise.resolve({ status : result.status,
                                     data : result.data.users,
                                     more : this._members_cursor != '0' });
        }
    },

    // リストにメンバー追加
    addMember2List: function(callback, error, optionsHash)
    {
    },
    // リストからメンバー削除
    delMemberFromList: function(callback, error, optionsHash)
    {
    }
};
