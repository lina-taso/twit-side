/**
 * @fileOverview Pref operation
 * @name pref.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var prefs = {};

window.addEventListener('load', () => {
    localization();
    vivify();

    // コンフィグ取得
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                  action : TwitSideModule.COMMAND.CONFIG_LOAD })
        .then((p) => {
            prefs = p;
            restorePrefs();
            initHovermenu();
        });
});

// add other event listener
function vivify()
{
    // カラム並び替え
    $('#hovermenuContainer').sortable({
        items : 'tr',
        cursor : 'more',
        opacity : '0.5',
        axis : 'y',
        containment : '#hovermenuContainer',
        distance : 10,
        tolerance : 'pointer',
        update : function() {
            $('button.save_button2').addClass('blink');
            $('#hovermenuContainer').attr('data-changed', 'true');
        }
    });
    // フォーム
    $('form')
        .on('change', function(e) {
            // 変更あり
            $(this).find('button.save_button').addClass('blink');
            e.target.dataset.changed = true;

            // ホバーメニュー
            if ($('#hovermenuContainer').find(e.target).length) {
                // 排他処理
                if (!checkHovermenu(e.target)) return;
                $('button.save_button2').addClass('blink');
                $('#hovermenuContainer').attr('data-changed', 'true');
            }
        });

    // 通常の保存ボタン
    $('button.save_button')
        .on('click', function() {
            $(this).removeClass('blink');
            $(this).closest('form').find('[data-changed=true]').each(function() {
                switch(this.type) {
                case 'number':
                    // コンフィグ設定
                    setPref(this.id, parseInt(this.value));
                    break;
                case 'checkbox':
                    // コンフィグ設定
                    setPref(this.id, this.checked);
                    break;
                default:
                    // コンフィグ設定
                    setPref(this.id, this.value);
                }
                $(this).removeAttr('data-changed');
            });
            // コンフィグ取得
            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                          action : TwitSideModule.COMMAND.CONFIG_LOAD })
                .then((p) => {
                    prefs = p;
                });
        });
    // ホバーメニュー保存ボタン
    $('button.save_button2')
        .on('click', function() {
            $(this).removeClass('blink');
            let $hovermenuContainer = $('#hovermenuContainer');
            // ホバーメニューの順序
            if ($hovermenuContainer.is('[data-changed=true]')) {
                let menux = $hovermenuContainer.find(':checked').toArray();
                for (let i=0; i<4; i++)
                    setPref('hover_menu'+i, menux[i] ? menux[i].value : '');
            }
            // ホバーメニューの有効無効
            $hovermenuContainer.find('input[data-changed=true]').each(function() {
                // コンフィグ設定
                setPref(this.id, this.checked);
                $(this).removeAttr('data-changed');
            });
            // コンフィグ取得
            browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                          action : TwitSideModule.COMMAND.CONFIG_LOAD })
                .then((p) => {
                    prefs = p;
                });
        });
}


/**
 * 全体
 */
// localization content ui
function localization()
{
    for (let datum of l10nDefinition) {
        if (datum.selector == 'title') {
            document.title = browser.i18n.getMessage(datum.word);
            continue;
        }

        switch (datum.place) {
        case "text":
            $(datum.selector).text(browser.i18n.getMessage(datum.word));
            break;
        case "html":
            $(datum.selector).html(browser.i18n.getMessage(datum.word));
            break;
        case "attr":
            $(datum.selector).attr(datum.attr, browser.i18n.getMessage(datum.word));
            break;
        }
    }

    // timestamp sample
    $('#timeformat').children().each(function() {
        $(this).text($(this).text().replace('###', TwitSideModule.text.convertTimeStamp(new Date(), $(this).val())));
    });
}

function restorePrefs() {
    for (let item in prefs) {
        switch (typeof prefs[item]) {
        case 'string':
            $('#'+item).val(prefs[item]);
            break;
        case 'number':
            $('#'+item).val(prefs[item]);
            break;
        case 'boolean':
            $('#'+item).prop('checked', prefs[item]);
            break;
        }
    }
}

// ホバーメニュー初期化
function initHovermenu()
{
    var menux = [];

    for (let i=0; i<4; i++)
        menux.push(getPref('hover_menu'+i));

    for (let i=0; i<4; i++) {
        if (menux[i] == '') continue;
        $('#hover_'+menux[i]).closest('tr')
            .insertBefore($('#hovermenuContainer tr').eq(i));
    }
}

// ホバーメニューチェック数制限
function checkHovermenu(checkbox)
{
    if ($('#hovermenuContainer').find('input[type=checkbox]:checked').length > 4) {
        $(checkbox).prop('checked', false);
        return false;
    }
    return true;
}


/**
 * Config operation
 */
function setPref(key, value) {
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.CONFIG_OPE,
                                  action : TwitSideModule.COMMAND.CONFIG_SET,
                                  key : key,
                                  value : value });
}

function getPref(key) {
    return prefs[key] == null ? null : prefs[key];
}
