/**
 * @fileOverview text operation functions shared by content script and background script
 * @name text-ope.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

if (!TwitSideModule) var TwitSideModule = {};

TwitSideModule.text = {
    encodeURI : function(str)
    {
        return encodeURIComponent(str)
            .replace(new RegExp("!","g"), "%21")
            .replace(new RegExp("'","g"), "%27")
            .replace(new RegExp("\\(","g"), "%28")
            .replace(new RegExp("\\)","g"), "%29")
            .replace(new RegExp("\\*","g"), "%2A");
    },

    unescapeHTML : function(str)
    {
        return str.replace(/(&amp;|&lt;|&gt;|&quot;|&#039;)/g,
                           function($0) {
                               return {
                                   "&amp;":"&",
                                   "&lt;":"<",
                                   "&gt;":">",
                                   "&quot;":"'",
                                   "&#039;":"'"
                               }[$0];
                           });
    },

    escapeHTML : function(str)
    {
        return str.replace(/[&<>"']/g,
                           function($0){
                               return {
                                   "&":"&amp;",
                                   "<":"&lt;",
                                   ">":"&gt;",
                                   '"':"&quot;",
                                   "'":"&#039;"
                               }[$0];
                           });
    },

    convertTimeStamp : function(date, format)
    {
        var ja_wday = ['日', '月', '火', '水', '木', '金', '土'],
            ja_day = '日',
            en_month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        switch(format) {
        case "default":
            return date.toString();
        case 'locale':
            return date.toLocaleString();
        case "japan1":
            return date.getFullYear()
                +'/'+(date.getMonth()+1)
                +'/'+date.getDate()
                +'('+ja_wday[date.getDay()]+') '
                +('0'+date.getHours()).slice(-2)
                +':'+('0'+date.getMinutes()).slice(-2)
                +':'+('0'+date.getSeconds()).slice(-2);
        case "japan2":
            return date.getDate()+ja_day+' '
                +('0'+date.getHours()).slice(-2)
                +':'+('0'+date.getMinutes()).slice(-2)
                +':'+('0'+date.getSeconds()).slice(-2);
        case "pattern1":
            return date.getFullYear()
                +'/'+(date.getMonth()+1)
                +'/'+date.getDate()
                +' '
                +('0'+date.getHours()).slice(-2)
                +':'+('0'+date.getMinutes()).slice(-2)
                +':'+('0'+date.getSeconds()).slice(-2);
        case "pattern2":
            return (en_month[date.getMonth()])
                +' '+date.getDate()
                +' '
                +date.getHours()
                +':'+('0'+date.getMinutes()).slice(-2)
                +':'+('0'+date.getSeconds()).slice(-2);
        case "pattern3":
            return date.getDate()
                +'/'+(date.getMonth()+1)
                +'/'+date.getFullYear()
                +' '
                +date.getHours()
                +':'+('0'+date.getMinutes()).slice(-2)
                +':'+('0'+date.getSeconds()).slice(-2);
        case "diff":
            return "";
        default:
            return "";
        }
    },

    analyzeTimestamp : function(date)
    {
        // Sun Jul 01 11:45:04 +0000 2012
        return typeof date === 'number'
            ? new Date(date)
            : new Date(Date.parse(date));
    },

    getUnixTime : function()
    {
        return ~~(Date.now() / 1000);
    },

    // make DOM id for columns
    makeid : function()
    {
        var array = [],
            str = '';

        for (let i = 0; i < 10; i++)
            array.push(String.fromCharCode('0'.charCodeAt() + i));
        for (let i = 0; i < 26; i++)
            array.push(String.fromCharCode('a'.charCodeAt() + i));
        for (let i = 0; i < 26; i++)
            array.push(String.fromCharCode('A'.charCodeAt() + i));

        for (let i = 0; i < 5; i++)
            str += array[Math.floor(Math.random() * 62)];

        return str;
    }
};
