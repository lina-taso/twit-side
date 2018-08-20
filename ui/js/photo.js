/**
 * @fileOverview photo content script
 * @name photo.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'photo';

var prefs = {},
    winid,
    photos; // 写真一覧（init parameter）

window.addEventListener('load', () => {
    localization();
    buttonize(['.buttonItem', '#prevPhoto', '#nextPhoto'], commandExec);
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
        UI.setStyleSheets();

        // ウィンドウ初期化済通知
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.WINDOW_OPE,
                                      action : TwitSideModule.COMMAND.WINDOW_INITED,
                                      suffix : SUFFIX,
                                      id : winid });
    });
});
window.addEventListener('beforeunload', () => {
    UI.finish();
});

// add other event listener
function vivify()
{
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {
    case 'openDirectUrl':
        openURL(photos[$('#photoContainer').attr('data-active-photo')].urls.fullurl);
        break;
    case 'closeButton':
        browser.windows.getCurrent()
            .then((win) => {
                browser.windows.remove(win.id);
            });
        break;
    case 'prevPhoto':
            changePhoto(parseInt($('#photoContainer').attr('data-active-photo')) - 1);
        break;
    case 'nextPhoto':
            changePhoto(parseInt($('#photoContainer').attr('data-active-photo')) + 1);
        break;
//    case '':
//        break;
    }

    // identify from class
    switch (true) {
//    case btn.classList.contains(''):
//        break;
    }
}


/**
 * Panel operation
 */
function initialize()
{
    var $photoContainer = $('#photoContainer');

    // 初期化
    $photoContainer.empty()
        .attr('data-active-photo', 0);

    // 写真を追加
    for (let i=0; i<photos.length; i++) {
        let $box = $('<video />');
        // youtube
        if (photos[i].urls.provider == 'youtube')
            $box = $('<iframe />')
            .addClass('youtube')
            .attr('src', photos[i].urls.embedurl + '?enablejsapi=1');
        // 動画
        else if (photos[i].urls.variants) {
            // twitter
            for (let source of photos[i].urls.variants) {
                let $video =  $('<source />')
                    .attr({ src : source.url,
                            type : source.content_type })
                    .appendTo($box);
            }
            $box.addClass('video')
                .attr({ preload : 'auto',
                        loop : 'loop',
                        controls : 'contols',
                        muted : 'muted' });
        }
        // 写真
        else {
            $box.addClass('photo')
                .attr('poster', photos[i].urls.rawurl);
        }
        $box.appendTo($photoContainer);
    }
}

// 写真切り替え
function changePhoto(index)
{
    var $photoContainer = $('#photoContainer'),
        len = $photoContainer.children().length;

    if (index < 0 || index >= len) return;

    // indexだけ表示
    $photoContainer.attr('data-active-photo', index)
        .children().eq(index).css('display', '').each(function() {
            if (this.className == 'video') this.play();
        })
        .siblings().css('display', 'none').each(function() {
            if (this.className == 'video') this.pause();
            else if (this.className == 'youtube')
                this.contentWindow.postMessage(JSON.stringify({ event : 'command',
                                                                func : 'pauseVideo',
                                                                args : '' }),
                                               '*');
        });

    // 矢印表示切り替え
    $('#prevPhoto').attr('data-disabled', index == 0 ? 'true' : 'false');
    $('#nextPhoto').attr('data-disabled', index+1 == len ? 'true' : 'false');

    // URL
    $('#directUrl').val(photos[index].urls.rawurl);
}
