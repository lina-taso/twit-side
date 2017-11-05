/**
 * @fileOverview Default prefs
 * @name defaultprefs.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

TwitSideModule.DefaultPrefs = {
    version: '',
    // update
    timeout: 10,
    timeout_upload: 600,
    timeline_count: 50,
    connect_count: 20,
    retweeted_count: 20,
    favorite_count: 20,
    search_count: 20,
    profile_count: 20,
    autopager: true,
    autopager_count: 50,
    autoreload_time: 300,
    autosearch_time: 600,
    autoreload_aftertweet: true,
    autoreload_totop: true,
    // extra
    exURL: true,
    exURL_cut: true,
    URL_tabactive: true,
    mute_onsearch: false,
    mute_ts: true,
    retweets_onlyfriends: false,
    domestic_search: true,
    // style
    theme: "card_white",
    color_retweets: true,
    screenname_first: false,
    circle_icon: true,
    timeformat: "default",
    viewthumbnail: true,
    popup_photo: true,
    viewsource: true,
    linefeed: true,
    animation: true,
    // scale
    column_minwidth: 300,
//    lock: true,
    font_size: 12,
    icon_size: 'large',
    button_size: 'medium',
    // notification
    notif_all: false,
    notif_forme: true,
    notif_forme_retweeted: true,
    notif_favorite: true,
    notif_unfavorite: true,
    notif_follow: true,
    notif_directmessage: true,
    notif_count: 10,
    // tweetmenu
    menu_reply: true,
    menu_favorite: false,
    menu_conversation: false,
    menu_url: false,
    hover_menu0: "retweet",
    hover_menu1: "replyall",
    hover_menu2: "favorite",
    hover_menu3: "showreply",
    hover_retweet: true,
    hover_RT: false,
    hover_showtext: false,
    hover_insurl: false,
    hover_opentweeturl: false,
    hover_replyall: true,
    // confirm
    confirm_tweet: true,
    confirm_retweet: true,
    confirm_favorite: true,
    confirm_delete: true,
    confirm_follow: true,
    confirm_mute: true,
    confirm_noretweet: true,
    confirm_deletecolumn: true,
    // init values
    columns: "",
    users: "",
    hidden_message: "[]",
    newtweet_pinned: false,
    tutorial: true
};

Object.freeze(TwitSideModule.DefaultPrefs);
