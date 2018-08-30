/**
 * @fileOverview URL list
 * @name urls.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

TwitSideModule.urls = {
    twit :
    {
        oauthBase : 'https://api.twitter.com/oauth',
        apiBase : 'https://api.twitter.com/1.1',
        tonBase : 'https://ton.twitter.com/1.1',
        uploadBase : 'https://upload.twitter.com/1.1',
        /**
         * 末尾 ?有り：GET用URL
         * 末尾 /無し：URL続かない
         * 末尾 /有り：URL続く
         */
        urlRequest : '/request_token?',
        urlAuthorize : '/authorize?',
        urlAccess : '/access_token',

        urlStatusesUpdate : '/statuses/update.json',
        urlStatusesUpdateWithMedia : '/statuses/update_with_media.json',
        urlStatusesRetweet : '/statuses/retweet/',
        urlStatusesShow : '/statuses/show.json?',
        urlStatusesDestroy : '/statuses/destroy/',

        urlFavoritesList : '/favorites/list.json?',
        urlFavoritesCreate : '/favorites/create.json',
        urlFavoritesDestroy : '/favorites/destroy.json',

        urlStatusesHomeTimeline : '/statuses/home_timeline.json?',
        urlStatusesUserTimeline : '/statuses/user_timeline.json?',
        urlStatusesMentionsTimeline : '/statuses/mentions_timeline.json?',
        urlStatusesRetweetsOfMe : '/statuses/retweets_of_me.json?',
        urlStatusesRetweets : '/statuses/retweets.json?',

        urlListsStatuses : '/lists/statuses.json?',
        urlListsOwnerships : '/lists/ownerships.json?',
        urlListsSubscriptions : '/lists/subscriptions.json?',
        urlListsMemberships : '/lists/memberships.json?',
        urlListsSubscribers : '/lists/subscribers.json?',
        urlListsMembers : '/lists/members.json?',
        urlListsSubscribersCreate : '/lists/subscribers/create.json',
        urlListsSubscribersDestroy : '/lists/subscribers/destroy.json',
        urlListsMembersCreateAll : '/lists/members/create_all.json',
        urlListsMembersDestroyAll : '/lists/members/destroy_all.json',
        urlListsCreate : '/lists/create.json',
        urlListsUpdate : '/lists/update.json',
        urlListsDestroy : '/lists/destroy.json',

        urlUsersLookup : '/users/lookup.json?',
        urlUsersShow : '/users/show.json?',

        urlFriendsIds : '/friends/ids.json?',
        urlFollowersIds : '/followers/ids.json?',
        urlMutesUsersIds : '/mutes/users/ids.json?',
        urlMutesUsersCreate : '/mutes/users/create.json',
        urlMutesUsersDestroy : '/mutes/users/destroy.json',

        urlFriendshipsCreate : '/friendships/create.json',
        urlFriendshipsDestroy : '/friendships/destroy.json',
        urlFriendshipsNoRetweets : '/friendships/no_retweets/ids.json?',
        urlFriendshipsShow : '/friendships/show.json?',
        urlFriendshipsUpdate : '/friendships/update.json',


        urlDirectMessagesEventsList : '/direct_messages/events/list.json?',
        urlDirectMessagesEventsNew : '/direct_messages/events/new.json',
        urlDirectMessagesEventsDestory : '/direct_messages/events/destroy.json?',

        urlSearchTweets : '/search/tweets.json?',
        urlHelpConfiguration : '/help/configuration.json?',

        urlAPI : '/application/rate_limit_status.json?',

        urlMediaUpload : '/media/upload.json'
    },

    auth :
    {
        base : 'https://twit-side.filewo.net/index11.cgi',
        get urlBase()
        {
            return TwitSideModule.config.getPref('alturl') || this.base;
        },
        urlSignature : '/signature/',
        urlRequest : '/request/',
        urlAccess : '/access/',
        urlMessage : '/message/'
    }
};
