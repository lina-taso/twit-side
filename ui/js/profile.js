/**
 * @fileOverview profile content script
 * @name profile.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const COLUMN_TAB_MARGIN = 2, // horizontal margin
      LISTNAME_MAX_LENGTH = 25,
      LISTDESC_MAX_LENGTH = 100,
      SUFFIX = 'profile';

var prefs = {},
    winid,
    userinfo, // 自身のプロフィール（init parameter）
    profileJson, // プロフィールの生データ
    profileHistory = []; // 表示履歴

window.addEventListener('load', () => {
    localization();
    buttonize(['.countboxButton', '.buttonItem',
               '.tweetRetweeterImage', '.tweetMoreBox',
               '.clearRepliesBox', '.tweetMenuButton'],
              commandExec);
    vivify();

    // コンフィグ取得
    Promise.all([
        browser.windows.getCurrent(),
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                      action : TwitSideModule.COMMAND.CONFIG_LOAD })
    ]).then(([win, p]) => {
        prefs = p;
        winid = win.id;
        // オブザーバー開始
        myport = browser.runtime.connect({ name : win.id.toString() });
        myport.onMessage.addListener(UI.observer);

        // UI初期化
        return UI.initialize(TwitSideModule.WINDOW_TYPE.PROFILE);
    }).then(() => {
        // ウィンドウ初期化済通知
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_INITED,
                                      suffix : SUFFIX,
                                      id : winid });
    });
});
window.addEventListener('beforeunload', () => {
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_RESET,
                                  win_type : UI._win_type });
    UI.finish();
});

// add other event listener
function vivify()
{
    // スクリーンネーム入力ボックス
    $('#screenname')
        .on('keyup', function() { suggestScreenname($(this), $('#suggestContainer')); })
        .on('keypress', keypressSearchbox);
    // プロフィール画像
    $('#profileUserImage')
        .on('click', function() { openURL(this.src); });
    // URL
    $('#profileUrl')
        .on('click', function() { openURL(this.textContent); });
    $('#suggestContainer')
        .on('click', 'option', function() {
            suggestOnSelect(false, $('#screenname'), $('#suggestContainer'), null, searchUser);
            return false;
        })
        .on('focus', 'option', function() {
            $(this).parent().focus();
            return false;
        })
        .on('keydown', function(e) {
            suggestOnSelect(e, $('#screenname'), $('#suggestContainer'), $('#search'), searchUser);
            return false;
        });
    // カラムコンテナ
    $('#columnContainer')
        .keypress(keyeventChangeFocus)
        .on('focus', '.column', function() {
            UI.setActiveColumn($(this));
        })
        .on('focus', '.timelineBox > .tweetBox', function(e) {
            e.stopPropagation();
            UI.setActiveBox($(this));
        })
        .on('dblclick', '.column[data-column-type=follow] .timelineBox > .tweetBox, .column[data-column-type=follower] .timelineBox > .tweetBox', function(e) {
            openProfileWin(userinfo, this.dataset.screenname);
        })
        .on('click','.tweetThumbnailImage', showPhotos); // サムネイル
    // タイムライン
    $('#templateContainer .timelineBox')
        .on('scroll', function() {
            // 影
            $(this).siblings('.columnShadowBox')
                .height(this.scrollTop < 10 ? this.scrollTop : 10);

            // オートページャ
            if (this.scrollHeight - this.clientHeight - 200 < this.scrollTop
                && getPref('autopager'))
                loadMore(this.lastChild);
        });
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {

    case 'goback':
        profileHistory.pop();
        $('#screenname').val(profileHistory.pop());
        searchUser();
        break;
    case 'profileOwnImage':
        $('#screenname').val(btn.title);
        searchUser();
        break;
    case 'search':
        searchUser();
        break;
    case 'restrictionButton1':
        openApiWin(userinfo.user_id);
        break;
    case 'restrictionButton2':
        openMuteWin(userinfo.user_id);
        break;
    case 'restrictionButton3':
        openNoretweetWin(userinfo.user_id);
        break;
    case 'relationButton1':
        makeFriendship('follow');
        break;
    case 'relationButton3':
        makeFriendship('mute');
        break;
    case 'relationButton4':
        makeFriendship('noretweet');
        break;
    case 'profileButton1':
    case 'profileButton2':
    case 'profileButton3':
    case 'profileButton4':
    case 'profileButton5':
    case 'profileButton6':
    case 'profileButton7':
        loadNewerAfterChangeColumn($(btn).index());
        break;
    case 'profileButton8':
        if ($('#profileContainer').attr('data-profile-own') == 'true') {
            loadNewerAfterChangeColumn($(btn).index());
        }
        else {
            openNewdmWin(userinfo.user_id, '@' + profileJson.screen_name);
        }
        break;
    case 'closeAddListC':
    case 'cancelButton':
        addListContainerToggle(false);
        break;
    case 'okButton':
        onAcceptForAddList();
        break;

//    case '':
//        break;
    }

    // identify from class
    switch (true) {

    case btn.classList.contains('clearRepliesBox'): // column
        clearAllReplies(btn);
        break;

    case btn.classList.contains('toTopButton'): // columnMenuBox
        timelineMove('top');
        break;
    case btn.classList.contains('toBottomButton'):
        timelineMove('bottom');
        break;
    case btn.classList.contains('updateButton'):
        loadNewer(getColumnIndexFromBox(btn));
        break;
    case btn.classList.contains('newListButton'):
        onClickAddList();
        break;
    case btn.classList.contains('newDmButton'):
        openNewdmWin(userinfo.user_id, '');
        break;
    case btn.classList.contains('addColumnButton'):
        break;

    case btn.classList.contains('tweetMoreBox'): // tweetBox
        loadMore(btn);
        break;
    case btn.classList.contains('clearReplyButton'):
        clearReplies(btn);
        break;
    case btn.classList.contains('tweetRetweeterImage'):
        onClickRetweeterImage(btn);
        break;
    case btn.classList.contains('tweetMenuButton'):
        UI.getTweetMenuFunc(
            UI.getActiveColumn().attr('data-column-type'),
            $(btn).index())(btn);
        break;

//    case btn.classList.contains(''):
//        break;
    }
}

function keypressSearchbox(e)
{
    e = e.originalEvent;
    // サジェスト
    if (e && !e.shiftKey && e.key == 'Tab'
        || e && e.key == 'ArrowDown') {
        if ($('#suggestContainer').is(':visible')) {
            setTimeout(() => { $('#suggestContainer').focus(); }, 0);
            return false;
        }
    }
    // 検索
    else if (e && e.key == 'Enter') {
        searchUser();
    }
    return true;
}


/**
 * Panel operation
 */
function addListContainerToggle(open)
{
    $('#addListContainer').attr('data-open', open);
    if (open) $('#listLabel').focus();
}

function setOwnProfile()
{
    $('#profileOwnImage').attr('title', '@' + userinfo.screen_name)
        .children('img.buttonImage').attr('src', userinfo.profile_image_url);
}

function initialize()
{
    $('#grayout').toggleClass('hidden', false);
    addListContainerToggle(false);

    // 初期化
    profileJson = null;
    document.title = browser.i18n.getMessage('window.profile.defaulttitle');
    $('#profileContainer').css('background-image', '');
    $('#profileUserImage').attr('src', '');
    $('#profileContainer').attr({ 'data-profile-own' : 'true',
                                  'data-following' : 'false',
                                  'data-followed' : 'false',
                                  'data-followrequesting' : 'false',
                                  'data-mute' : 'false',
                                  'data-noretweet' : 'false',
                                  'data-protected' : '',
                                  'data-verified' : '' });
    $('#profileScreenname, #profileUsername, #profileDescription, #profileLocation, #profileUrl').text('');
    $('#profileButton1, #profileButton2, #profileButton3, #profileButton4, #profileButton7').text(0);
    $('#profileContainer .text-link').css('color', '');
    $('#countboxStyle').text('');

    // カラム初期化
    return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                         action : TwitSideModule.COMMAND.COLUMN_RESET,
                                         win_type : UI._win_type });
}

// 検索実施
async function searchUser()
{
    // ボタン無効化
    $('#topMenuContainer .buttonItem').attr('data-disabled', true);
    // 初期化
    await initialize();

    // スクリーンネーム整形
    var screenname = $('#screenname').val();

    if (/^@?(\S+)\s*$/.test(screenname)) {
        screenname = RegExp.$1;
        $('#screenname').val('@'+screenname);
    }
    else {
        $('#screenname').focus();
        // ボタン無効化
        $('#topMenuContainer .buttonItem').attr('data-disabled', false);
        return;
    }

    $('#screenname')[0].blur();
    hideSuggest($('#suggestContainer'));
    // 履歴に追加
    profileHistory.push('@'+screenname);
    // 読み込み中
    showLoadingProgressbar(true);

    // ユーザ情報
    var result = await browser.runtime
        .sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                       action : TwitSideModule.COMMAND.TWEET_USERSHOW,
                       userid : userinfo.user_id,
                       options : { screen_name : screenname } })
        .catch((result) => {
            // 読み込み中
            showLoadingProgressbar(false);
            UI.showMessage(result.message, result.text_flag);
        });

    updateProfile(result.data);
    // 読み込み中
    showLoadingProgressbar(false);
    $('#grayout').toggleClass('hidden', true);

    /**
     * ユーザータイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_USERTIMELINE,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 0,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * フォロータイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_FOLLOW,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 1,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * フォロワータイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_FOLLOWER,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 2,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * お気に入りタイムライン
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_FAVORITE,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 3,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * 保有リスト一覧
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_OWNERSHIPLISTS,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 4,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * 購読リスト一覧
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_SUBSCRIPTIONLISTS,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 5,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : {user_id : profileJson.id_str} });
    /**
     * フォローされたリスト一覧
     */
    await browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_ADD,
          tl_type : TwitSideModule.TL_TYPE.TEMP_MEMBERSHIPLISTS,
          columnlabel : '',
          userid : userinfo.user_id,
          win_type : UI._win_type,
          temp_index : 6,
          options : { onstart : false,
                      autoreload : false,
                      stream : false,
                      notif : false,
                      veil : false },
          parameters : { user_id : profileJson.id_str } });
    /**
     * ダイレクトメッセージタイムライン
     */
    if (profileJson.id_str == userinfo.user_id) {
        await browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.COLUMN_ADD,
              tl_type : TwitSideModule.TL_TYPE.TEMP_DIRECTMESSAGE,
              columnlabel : '',
              userid : userinfo.user_id,
              win_type : UI._win_type,
              temp_index : 7,
              options : { onstart : false,
                          autoreload : false,
                          stream : false,
                          notif : false,
                          veil : false },
              parameters : null });
    }

    // ボタン無効化
    $('#topMenuContainer .buttonItem').attr('data-disabled', false);
    // 1つのカラムだけ表示
    loadNewerAfterChangeColumn(0);
}

// プロフィールの表示更新
function updateProfile(data)
{
    // ミュート、リツイート非表示取得
    if (userinfo.user_id != data.id_str) {
        $('#profileContainer').attr('data-profile-own', 'false');

        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.FRIEND_OPE,
                                      action : TwitSideModule.COMMAND.FRIEND_FRIENDSHIPS,
                                      type : TwitSideModule.FRIEND_TYPE.SHOW,
                                      value : null,
                                      target_userid : data.id_str,
                                      own_userid : userinfo.user_id })
            .then((result) => {
                var relationship = result.data.relationship;
                profileJson['relationship'] = relationship;

                $('#profileContainer').attr({
                    'data-following' : relationship.source.following,
                    'data-followed' : relationship.source.followed_by,
                    'data-followrequesting' : relationship.source.following_requested,
                    'data-mute' : relationship.source.muting,
                    'data-noretweet' : !relationship.source.want_retweets
                });
            })
            .catch((result) => {
                UI.showMessage(result.message, result.text_flag);
            });
    }
    else {
        $('#profileContainer').attr('data-profile-own', 'true');
    }

    // 結果から情報表示
    profileJson = data;
    document.title = browser.i18n.getMessage('window.profile.usertitle', '@'+data.screen_name);

    data.profile_banner_url && $('#profileContainer')
        .css('background-image', 'url(' + data.profile_banner_url + '/web)');
    $('#profileUserImage').attr('src', data.profile_image_url.replace('_normal.', '.'));
    $('#profileContainer').attr({ 'data-protected' : data.protected,
                                  'data-verified' : data.verified });

    $('#profileScreenname').text('@'+data.screen_name);
    $('#profileUsername').text(data.name);
    if (data.description) {
        $('#profileDescription').text(data.description);
        extractProfileDescription($('#profileDescription'));
    }

    // 付加情報
    data.location && $('#profileLocation').text(data.location);
    data.url && $('#profileUrl').text(data.url);

    // ユーザカラー
    if (data.profile_link_color) {
        let color = '#' + data.profile_link_color;
        $('#profileContainer .text-link').css('color', color);
        $('#countboxStyle')
            .text('.countbox { border-color : ' + color + '; background-color : ' + color + ' ;}');
    }

    // カウンター
    $('#profileButton1').text(data.statuses_count);
    $('#profileButton2').text(data.friends_count);
    $('#profileButton3').text(data.followers_count);
    $('#profileButton4').text(data.favourites_count);
    $('#profileButton7').text(data.listed_count);
}

// プロフィール文章を展開
function extractProfileDescription($description)
{
    if ($description[0] == null) throw new Error('PARAMETER_IS_NOT_DEFINED');
    var entities = twttr.txt.extractEntitiesWithIndices($description.text());

    for (let entity of entities) {
        if (entity.hashtag) {
            let span = document.createElement('span');
            span.classList.add('text-link');
            span.textContent = '#' + entity.hashtag;
            span.addEventListener('click', function() {
                openSearchWin(userinfo, this.textContent);
            });
            // ハッシュタグ置換
            UI.insertNodeIntoText($description[0], entity.hashtag, span);
        }
        else if (entity.url) {
            let span = document.createElement('span');
            span.classList.add('text-link');
            span.textContent = entity.url;
            span.addEventListener('click', function() {
                openURL(this.textContent);
            });
            UI.insertNodeIntoText($description[0], entity.url, span);
        }
        else if (entity.screenName) {
            let span = document.createElement('span');
            span.classList.add('text-link');
            span.textContent = '@' + entity.screenName;
            span.addEventListener('click', function() {
                openProfileWin(userinfo, this.textContent);
            });
            UI.insertNodeIntoText($description[0], '@' + entity.screenName, span);
        }
    }
}


/**
 * Friend operation
 */
// 友達になる
function makeFriendship(type_str)
{
    switch (type_str) {
    case 'follow':
        if (getPref('confirm_follow')
            && !confirm(browser.i18n.getMessage(profileJson.following
                                                ? 'confirmUnfollow'
                                                : 'confirmFollow'))) return;

        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.FRIEND_OPE,
                                      action : TwitSideModule.COMMAND.FRIEND_FRIENDSHIPS,
                                      type : TwitSideModule.FRIEND_TYPE.FOLLOW,
                                      value : !profileJson.following,
                                      target_userid : profileJson.id_str,
                                      own_userid : userinfo.user_id })
            .then(callback).catch(error);

        break;
    case 'mute':
        if (getPref('confirm_mute')
            && !confirm(browser.i18n.getMessage(profileJson.relationship.source.muting
                                                ? 'confirmUnmute'
                                                : 'confirmMute'))) return;

        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.FRIEND_OPE,
                                      action : TwitSideModule.COMMAND.FRIEND_FRIENDSHIPS,
                                      type : TwitSideModule.FRIEND_TYPE.MUTE,
                                      value : !profileJson.relationship.source.muting,
                                      target_userid : profileJson.id_str,
                                      own_userid : userinfo.user_id })
            .then(callback).catch(error);

        break;
    case 'noretweet':
        if (getPref('confirm_noretweet')
            && !confirm(browser.i18n.getMessage(profileJson.relationship.source.want_retweets
                                                ? 'confirmNoretweet'
                                                : 'confirmWantretweet'))) return;

        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.FRIEND_OPE,
                                      action : TwitSideModule.COMMAND.FRIEND_FRIENDSHIPS,
                                      type : TwitSideModule.FRIEND_TYPE.NORETWEET,
                                      value : profileJson.relationship.source.want_retweets,
                                      target_userid : profileJson.id_str,
                                      own_userid : userinfo.user_id })
            .then(callback).catch(error);

        break;
    }

    function callback(result)
    {
        return browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.TWEET_OPE,
                                             action : TwitSideModule.COMMAND.TWEET_USERSHOW,
                                             userid : userinfo.user_id,
                                             options : { user_id : profileJson.id_str }
                                           })
            .then((result) => {
                updateProfile(result.data);
            });
    }
    function error(result)
    {
        UI.showMessage(result.message, result.text_flag);
    }
}


/**
 * List operation
 */
// リストの作成
function onClickAddList()
{
    resetAddListC();
    addListContainerToggle(true);
}

// リストの編集
function onClickEditList(vbox)
{
    resetAddListC({
        id : vbox.dataset.tweetid,
        name : $(vbox).find('.listName').attr('data-listname'),
        description : $(vbox).find('.tweetText').text(),
        mode : vbox.dataset.mode
    });
    addListContainerToggle(true);
}

function onAcceptForAddList()
{
    var type = $('#addListContainer').attr('data-type');

    if (!$('#listLabel').val()) {
        alert(browser.i18n.getMessage('profile.message.enterlistlabel'));
        return;
    }
    if ($('#listLabel').val().length > LISTNAME_MAX_LENGTH) {
        alert(browser.i18n.getMessage('profile.message.toolonglistlabel', LISTNAME_MAX_LENGTH));
        return;
    }
    if ($('#listDescription').val().length > LISTDESC_MAX_LENGTH) {
        alert(browser.i18n.getMessage('profile.message.toolonglistdesc', LISTDESC_MAX_LENGTH));
        return;
    }

    var listinfo = {
        name : $('#listLabel').val(),
        description : $('#listDescription').val(),
        mode : $('[name=listmode]:checked').val()
    };

    switch (type) {
    case 'add':
        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.TL_LISTCREATE,
              columnindex : 4,
              win_type : UI._win_type,
              listinfo : listinfo })
            .then(() => {
                addListContainerToggle(false);
                loadNewer(4);
            });
        break;
    case 'edit':
        listinfo.list_id = $('#addListContainer').attr('data-listid');

        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.TL_LISTUPDATE,
              columnindex : 4,
              win_type : UI._win_type,
              listinfo : listinfo })
            .then(() => {
                addListContainerToggle(false);
                loadNewer(4);
            });
        break;
    }
}

function resetAddListC(listinfo)
{
    // リセット
    if (!listinfo) {
        $('#addListContainer').attr({ 'data-type' : 'add',
                                      'data-listid' : '' });

        $('#listLabel, #listDescription').val('');
        $('#public').prop('checked', true);
    }
    else {
        $('#addListContainer').attr({ 'data-type' : 'edit',
                                      'data-listid' : listinfo.id });
        $('#listLabel').val(listinfo.name);
        $('#listDescription').val(listinfo.description);
        if (listinfo.mode == 'private')
            $('#public').prop('checked', true);
        else
            $('#private').prop('checked', true);
    }
}

// メンバー一覧
function onClickShowMembers(vbox)
{
    openListmemberWin(userinfo,
                      vbox.dataset.tweetid,
                      TwitSideModule.TL_TYPE.TEMP_LISTMEMBER,
                      $(this).children('.tweetContent').attr('data-mine') == 'true');
}

// 購読者一覧
function onClickShowSubscribers(vbox)
{
    openListmemberWin(userinfo,
                      vbox.dataset.tweetid,
                      TwitSideModule.TL_TYPE.TEMP_LISTSUBSCRIBER,
                      $(this).children('.tweetContent').attr('data-mine') == 'true');
}

// リストの購読
function onClickSubscribe(vbox)
{
    browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.TL_LISTSUBSCRIBE,
          columnindex : getColumnIndexFromBox(vbox),
          win_type : UI._win_type,
          listid : vbox.dataset.tweetid });
}

// リストの購読解除
function onClickUnsubscribe(vbox)
{
    browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.TL_LISTUNSUBSCRIBE,
          columnindex : getColumnIndexFromBox(vbox),
          win_type : UI._win_type,
          listid : vbox.dataset.tweetid });
}

// リストタイムラインをカラムに追加
function onClickAddList2Column(vbox)
{
    var listname = $(vbox).find('.listName').attr('data-listname'),
        listuser = vbox.dataset.screenname,
        listid = vbox.dataset.tweetid;

    return Promise.all([
        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.COLUMN_ADD,
              tl_type : TwitSideModule.TL_TYPE.LISTTIMELINE,
              columnlabel : browser.i18n.getMessage('defaultList', [listuser, listname]),
              userid : userinfo.user_id,
              win_type : TwitSideModule.WINDOW_TYPE.MAIN,
              options : { onstart : true,
                          autoreload : true,
                          stream : false,
                          notif : true,
                          veil : false },
              parameters : { list_id : listid } }),
        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.MSG_OPE,
              action : TwitSideModule.COMMAND.MSG_TRANSMSG,
              error : 'columnAdded' })
    ]).then(([, message]) => {
            UI.showMessage(message);
    });
}


/**
 * Column operation
 */
// visible column index
function getColumnIndex()
{
    var ret = [],
        // 一画面に表示するカラム数
        count = parseInt(UI.$columnC.attr('data-count'));

    for (let i=0; i<count; i++)
        ret.push(parseInt(UI.$columnC.attr('data-first')) + i);

    return ret;
}

// ダミー
function changeTweetUser(){
    return true;
}

// カラム表示切り替え
function changeColumn(columnindex_int)
{
    document.body.dataset.activeColumn = columnindex_int;
    UI.setActiveColumn(UI.$columnC.children().eq(columnindex_int));
}

// カラムを変更してロード
function loadNewerAfterChangeColumn(columnindex_int)
{
    hideSuggest($('#suggestContainer'));
    changeColumn(columnindex_int);
    loadNewer(columnindex_int);
}
