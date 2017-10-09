/**
 * @fileOverview Managing Original Mute Function
 * @name mutes.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var Mutes = function() {

    /**
     * Private valuables
     */
    var initialized = false,
    keywords = [], // [{ type, data }, ...]
    users = []; // [ userid, ... ]


    /**
     * Private functions
     */
    // 更新
    function writeMutes()
    {
        TwitSideModule.config.setPref('mute_keywords', JSON.stringify(keywords));
        TwitSideModule.config.setPref('mute_users', JSON.stringify(users));
    }
    // 初期化
    function initMutes()
    {
        keywords = JSON.parse(TwitSideModule.config.getPref('mute_keywords') || '[]');
        users = JSON.parse(TwitSideModule.config.getPref('mute_users') || '[]');
    }


    /**
     * Public
     */
    return {

        get initialized()
        {
            return initialized;
        },

        // ミュート初期化（bootstrap.js上で実行）
        initialize : function()
        {
            initMutes();
            initialized = true;
        },
        // ミュートキーワード一覧
        getMuteKeywords : function()
        {
            return keywords;
        },
        // ミュートユーザID一覧
        getMuteUsers : function()
        {
            return users;
        },
        // ミュートキーワード追加
        addMuteKeyword : function(type, data) {
            keywords.push({
                type : type,
                data : data
            });
            writeMutes();
        },
        // ミュートユーザID追加
        addMuteUser : function(userid) {
            users.push(userid);
            writeMutes();
        },
        // ミュートキーワード削除
        removeMuteKeyword : function(index) {
            if (index < keywords.length && index >= 0)
                keywords.splice(index, 1);
            writeMutes();
        },
        // ミュートユーザID削除
        removeMuteUser : function(index) {
            if (index < users.length && index >= 0)
                users.splice(index, 1);
            writeMutes();
        },
        // ミュートキーワード一致チェック
        checkMuteKeywords : function(content) {
            for (let keyword of keywords) {
                switch (keyword.type) {
                case TwitSideModule.MUTE_TYPE.STRING:
                    // 文字列の場合
                    if (content.includes(keyword.data))
                        return true;
                    break;
                case TwitSideModule.MUTE_TYPE.REGEXP:
                    // 正規表現の場合
                    if ((new RegExp(keyword.data, 'i')).test(content))
                        return true;
                    break;
                }
            }
            return false;
        },
        // ミュートユーザチェック
        checkMuteUsers : function(userids) {
            for (let userid of userids) {
                if (users.indexOf(userid) >= 0)
                    return true;
            }
            return false;
        }
    };
};
