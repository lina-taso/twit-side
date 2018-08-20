/**
 * @fileOverview TwitSideModule
 * @name twitside.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

if (!TwitSideModule) var TwitSideModule = {};

TwitSideModule.debug = {
    log : function(message)
    {
        if (TwitSideModule.config.getPref('debug'))
            console.log(message, new Error());
    }
};

TwitSideModule.config = {
    _prefs : {},
    // 設定値を変数に保存（存在しない値は初期値から読み込み）
    // return Promise
    loadPrefs : function()
    {
        return browser.storage.local.get(null).then((res) => {
            // 保存された設定値
            this._prefs = res;
            // 初期値
            for (let key in TwitSideModule.DefaultPrefs) {
                if (this._prefs[key] == null)
                    this._prefs[key] = TwitSideModule.DefaultPrefs[key];
            }
        });
    },
    // 変数から設定値を取得
    // return value
    getPref : function(key)
    {
        return key == null
            ? this._prefs
            : this._prefs[key] == null ? null : this._prefs[key];
    },
    // 設定値を保存して、変数へ保存し直す
    // return Promise
    setPref : function(key, val)
    {
        if (!key) return null;

        var setting;
        if (val == null) {
            setting = browser.storage.local.remove(key);
        }
        else {
            let pref = {};
            pref[key] = val;
            setting = browser.storage.local.set(pref);
        }

        return setting
            .then(() => {
                return this.loadPrefs();
            })
            .then(() => {
                // 更新通知
                postMessage({
                    reason : TwitSideModule.UPDATE.CONFIG_CHANGED,
                    prefs : this._prefs
                });
            });
    }
};

TwitSideModule.browsers = {
    openURL : function(url)
    {
        return browser.tabs.create({
            url : url,
            active : TwitSideModule.config.getPref('URL_tabactive')
        });
    }
},

TwitSideModule.hash = {
    // ハッシュをソートしてフォーム形式
    hash2sortedForm : function(hash)
    {
        var keys = Object.keys(hash),
            len = keys.length,
            form = [];
        keys.sort();

        for (let i=0; i<len; i++)
            form.push(keys[i]+'=' + TwitSideModule.text.encodeURI(hash[keys[i]]));

        return form.join('&');
    },

    // ハッシュをOAuthヘッダー形式
    hash2oauthHeader : function(hash)
    {
        var keys = Object.keys(hash),
            len = keys.length,
            param = [];
        keys.sort();

        for(let i=0; i<len; i++) {
            param.push(encodeURIComponent(keys[i])
                       + '="'
                       + encodeURIComponent(hash[keys[i]])
                       + '"');
        }

        return 'OAuth ' + param.join(", ");
    }
};
