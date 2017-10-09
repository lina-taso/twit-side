/**
 * @fileOverview Make Subwindows
 * @name makewindow.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */


// opener
async function getOpenerid()
{
    var winid;

    if (UI._win_type === TwitSideModule.WINDOW_TYPE.MAIN) {
        // メインから開くときはopenerに使用
        let win = await browser.windows.getCurrent();
        winid = win.id;
    }
    else {
        // それ以外は元のopenerを使用
        winid = SUFFIX;
    }
    return winid;
}

// プロフィールウィンドウを生成
async function openProfileWin(own_userinfo, show_screenname)
{
    var winid = await getOpenerid(),
        suffix = 'profile',
        options = { url : '/ui/profile.xhtml',
                    width : 550,
                    height : 750,
                    type : 'panel' },
        parameters = { userinfo : own_userinfo,
                       screenname : show_screenname };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// 検索ウィンドウを生成
async function openSearchWin(own_userinfo, keyword)
{
    var winid = await getOpenerid(),
        suffix = 'search',
        options = { url : '/ui/search.xhtml',
                    width : 550,
                    height : 750,
                    type : 'panel' },
        parameters = { userinfo : own_userinfo,
                       keyword : keyword };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// managecolumnsウィンドウを生成
async function openColumnsWin()
{
    var winid = await getOpenerid(),
        suffix = 'columns',
        options = { url : '/ui/columns.xhtml',
                    width : 800,
                    height : 600,
                    type : 'panel' },
        parameters = null;

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// 新しいDM作成ウィンドウを生成
async function openNewdmWin(ownid_int, recipient)
{
    var winid = await getOpenerid(),
        suffix = 'newdm',
        options = { url : '/ui/newdm.xhtml',
                    width : 600,
                    height : 400,
                    type : 'panel' },
        parameters = { ownid : ownid_int,
                       recipient : recipient };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// テキスト選択ウィンドウ生成
async function openTextWin(text_str)
{
    var winid = await getOpenerid(),
        suffix = 'text',
        options = { url : '/ui/text.xhtml',
                    width : 400,
                    height : 300,
                    type : 'panel' },
        parameters = { text : text_str };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// muteウィンドウを生成
async function openMuteWin(userid)
{
    var winid = await getOpenerid(),
        suffix = 'mute',
        options = { url : '/ui/mute.xhtml',
                    width : 550,
                    height : 750,
                    type : 'panel' },
        parameters = { userid : userid };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// noretweetウィンドウを生成
async function openNoretweetWin(userid)
{
    var winid = await getOpenerid(),
        suffix = 'noretweet',
        options = { url : '/ui/noretweet.xhtml',
                    width : 550,
                    height : 750,
                    type : 'panel' },
        parameters = { userid : userid };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// listmemberウィンドウを生成
async function openListmemberWin(own_userinfo, listid, tl_type, own_flag)
{
    var winid = await getOpenerid(),
        suffix = 'listmember',
        options = { url : '/ui/listmember.xhtml',
                    width : 550,
                    height : 750,
                    type : 'panel' },
        parameters = { userinfo : own_userinfo,
                       tl_type : tl_type,
                       listid : listid,
                       own_list : own_flag };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// photoウィンドウを生成
async function openPhotoWin(photos_ary, index_int)
{
    var winid = await getOpenerid(),
        suffix = 'photo',
        options = { url : '/ui/photo.xhtml',
                    width : 800,
                    height : 600,
                    type : 'panel' },
        parameters = { photos : photos_ary,
                       index : index_int };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

// apiウィンドウ生成
async function openApiWin(userid)
{
    var winid = await getOpenerid(),
        suffix = 'api',
        options = { url : '/ui/api.xhtml',
                    width : 800,
                    height : 600,
                    type : 'panel' },
        parameters = { userid : userid };

    await browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                        action : TwitSideModule.COMMAND.WINDOW_OPEN,
                                        suffix : suffix,
                                        options : options,
                                        parameters : parameters,
                                        opener : winid });
}

