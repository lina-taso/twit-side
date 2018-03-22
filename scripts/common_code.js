/**
 * @fileOverview status code definition shared by content script and background script
 * @name common_code.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

if (!TwitSideModule) var TwitSideModule = {};

// command (from content to background)
TwitSideModule.COMMAND = {
    CONFIG_OPE :       10,
    CONFIG_LOAD :      101, // action：コンフィグ読み込み
    CONFIG_SET :       102, // action：コンフィグ設定
    TWEET_OPE :        20,
    TWEET_REQUEST :    201, // action：リクエスト
    TWEET_ACCESS :     202, // action：アクセス
    TWEET_TWEET :      211, // action：ツイート
    TWEET_TWEET_MEDIA: 212, // action：ツイート
    TWEET_SENDDM :     213, // action：DM送信
    TWEET_USERSHOW:    221, // action：ユーザ情報取得
    TWEET_SHOWAPI:     222, // action：API
    TWEET_UPLOAD_MEDIA:231, // action：画像アップロード
    COLUMN_OPE :       30,
    COLUMN_ADD :       301, // action：追加
    COLUMN_EDIT :      302, // action：修正
    COLUMN_SORT :      303, // action：順序入れ替え
    COLUMN_DELETE :    304, // action：削除
    COLUMN_SEARCH :    305, // action：検索
    COLUMN_GETCOLINFO: 306, // action：カラム情報
    COLUMN_GETTLINFO : 307, // action：TL情報
    COLUMN_GETTWEETS : 308, // action：全ツイート
    COLUMN_COUNT :     309, // action：カラム数
    COLUMN_RESET :     310, // action：リセット
    TL_GETNEWER :      321,
    TL_GETOLDER :      322,
    TL_GETMORE :       323,
    TL_RETWEET :       324,
    TL_FAVORITE :      325,
    TL_REPLIES :       326,
    TL_DESTROY :       327,
    TL_RETWEETERS :    328,
    TL_STOPSTREAM :    331,
    TL_LISTCREATE :    341, // action：リスト作成
    TL_LISTUPDATE :    342, // action：リスト修正
    TL_LISTSUBSCRIBE : 343, // action：リスト購読
    TL_LISTUNSUBSCRIBE:344, // action：リスト購読解除
    TL_GETTWEETINFO :  351, // action：ツイートの情報を取得
    TL_RENOTIFYSTATUS: 352, // action：タイムラインの状態再通知
    TL_VOTE :          353, // action：自動削除投票
    USER_OPE :         40,
    USER_ADD :         401, // action：追加
    USER_DELETE :      402, // action：削除
    USER_GETINFO :     403, // action：ユーザ情報
    USER_COUNT :       404, // action：ユーザ数
    USER_ALLID :       405, // action：全ユーザID
    FRIEND_OPE :       50,
    FRIEND_FOLLOWS :   501,
    FRIEND_FOLLOWERS : 502,
    FRIEND_MUTES :     503,
    FRIEND_NORETWEETS: 504,
    FRIEND_FRIENDSHIPS:505,
    FRIEND_LATESTS :   506,
    FRIEND_CLEARLIST : 511,
    MSG_OPE :          60,
    MSG_TRANSMSG :     601, // action：変換
    MSG_SHOWNOTIF :    602, // action：通知
    MSG_REMOVE :       603, // action：通知削除
    MSG_READ :         604, // action：通知既読
    MSG_RELOAD :       605, // action：再通知
    WINDOW_OPE :       70,
    WINDOW_OPEN   :    701, // action：ウィンドウ開く
    WINDOW_INITED :    702, // action：ウィンドウ開いた
    WINDOW_RUNINMAINUI:703  // action：メインUIで実行
};

// update notify (from background to content)
TwitSideModule.UPDATE = {
    TWEET_LOADED :     1,  // ツイート取得後
    REPLACE_LOADED :   2,  // 既存ツイートの差し替え時
    REPLY_LOADED :     3,  // 返信ツイート取得時
    STREAM_EVENT :     4,  // ストリームイベント受信時
    PROGRESS :         5,  // 画像ツイート進捗
    IMAGE_LOADED :     8,  // 画像イメージ更新時
    TWEET_DELETED :    9,  // 既存ツイートの削除時
    TWEET_ALLDELETED : 10, // 既存ツイートの削除時
    STATE_CHANGED :    11, // タイムラインのステータス更新時
    ACTION_COMPLETED : 12, // ツイートの操作完了時
    MESSAGE_RCVD :     21, // メッセージ受信時
    NOTIF_CHANGED :    22, // 通知内容更新時
    VOTE_REQUIRED :    23, // 投票
    UI_CHANGED :       31, // UI更新時
    COLUMN_CHANGED :   32, // カラム情報更新時
    BUTTON_CHANGED :   33, // ツールバーボタン更新時
    WINDOW_CHANGED :   34, // ウィンドウ更新時
    USER_CHANGED :     41, // ユーザ情報更新時
    FUNCTION_RECIEVED: 51, // メインウィンドウ向け関数実行時
    CONFIG_CHANGED :   81, // コンフィグ更新時
    ERROR :            91  // エラー時
};

TwitSideModule.TL_STATE = {
    STOPPED :         1,  // 取得前、取得後停止
    STREAM_STOPPED :  2,  // ストリーム停止
    STARTING :        11, // 最新ツイート取得中
    STARTED :         12, // ツイート取得後：自動更新動作中
    LOADING :         13, // ツイート取得後：過去、途中ツイート取得中
    LOADED :          14, // ツイート取得後：過去、途中ツイート取得後
    STARTING_STREAM : 21, // ストリーム開始中
    STREAMING :       22, // ストリーム動作中
    WAITING_START :   31, // 予期しない切断後ウェイト
    WAITING_STREAM :  32  // 予期しないストリーム切断後ウェイト
};

// columns, addcolumnsと連携
TwitSideModule.TL_TYPE = {
    TIMELINE :      1,
    CONNECT :       2,
    RETWEETED :     3,
    FAVORITE :      4,
    DIRECTMESSAGE : 5,
    SEARCH :        6,
    LISTTIMELINE :  7,
    TEMP_USERTIMELINE :      11,
    TEMP_FOLLOW :            12,
    TEMP_FOLLOWER :          13,
    TEMP_FAVORITE :          14,
    TEMP_OWNERSHIPLISTS :    15,
    TEMP_SUBSCRIPTIONLISTS : 16,
    TEMP_MEMBERSHIPLISTS :   17,
    TEMP_DIRECTMESSAGE :     18,
    TEMP_SEARCH :            21,
    TEMP_MUTE :              31,
    TEMP_NORETWEET :         32,
    TEMP_LISTMEMBER :        33,
    TEMP_LISTSUBSCRIBER :    34
};

TwitSideModule.getTimelineName = function(tl_type)
{
    var tlNameMap = new Map([
        [1,  'timeline'],
        [2,  'connect'],
        [3,  'retweeted'],
        [4,  'favorite'],
        [5,  'directmessage'],
        [6,  'search'],
        [7,  'listtimeline'],
        [11, 'usertimeline'],
        [12, 'follow'],
        [13, 'follower'],
        [14, 'favorite'],
        [15, 'ownershiplists'],
        [16, 'subscriptionlists'],
        [17, 'membershiplists'],
        [18, 'directmessage'],
        [21, 'search'],
        [31, 'mute'],
        [32, 'noretweet'],
        [33, 'listmember'],
        [34, 'listsubscriber']
    ]);

    return tlNameMap.get(tl_type);
};

TwitSideModule.TWEET_STATUS = {
    OK :                 1,
    CONNECTED :          11,
    STREAM_RECEIVED :    13,
    CLOSED_MANUALLY :    21,
    CLOSED_MAINTAINANCE: 22,
    CLOSED_NETWORK :     23,
    CLOSED_API :         24,
    CLOSED_HTTP :        25
};

TwitSideModule.WINDOW_TYPE = {
    MAIN :     1,
    PROFILE :  2,
    SEARCH :   3,
    MUTE :     4,
    NORETWEET: 5,
    LISTMEMBER:6
};

TwitSideModule.FRIEND_TYPE = {
    FOLLOW :    1,
    FOLLOWER :  2,
    MUTE :      3,
    NORETWEET : 4,
    SHOW :      11
};

TwitSideModule.MUTE_TYPE = {
    REGEXP : 1,
    STRING : 2
};

TwitSideModule.FUNCTION_TYPE = {
    OPENURL : 1,
    QUOTE :   2,
    RT :      3,
    REPLY :   4,
    REPLYALL: 5
};

TwitSideModule.ACTION = {
    ADD :        1,
    EDIT :       2,
    SORT :       3,
    DELETE :     11,
    DELETE_ALL : 12
};
