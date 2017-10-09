/**
 * @fileOverview columns content script
 * @name columns.js
 * @author tukapiyo <webmaster@filewo.net>
 * @license Mozilla Public License, version 2.0
 */

var myport;

const SUFFIX = 'columns';

var prefs = {},
    winid,
    originalIndex;

window.addEventListener('load', () => {
    localization();
    buttonize(['.buttonItem'], commandExec);
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
    // カラム並び替え
    $('#columnListContainer').sortable({
        items : 'tr',
        cursor : 'more',
        opacity : '0.5',
        axis : 'y',
        containment : '#columnListBody',
        distance : 10,
        tolerance : 'pointer',
        // 並べ替え開始
        start : (e, ui) => {
            originalIndex = $(ui.item).index();
        },
        // 並べ替え終了
        update : (e, ui) => {
            onSortColumn($(ui.item).index());
        }
    });
    // 行アクティブ
    $('#columnListBody')
        .on('click focus', '.columnListRow', function() {
            $(this).attr('data-selected', 'true')
                .siblings().attr('data-selected', '');
        })
        .on('dblclick', '.columnListRow', onClickEditColumn);
    // 排他処理
    $('#tlType, input[type="checkbox"]')
        .on('change', checkboxControl);
}

// event asignment
function commandExec(btn)
{
    // identify from id
    switch (btn.id) {
    case 'addButton':
        onClickAddColumn();
        break;
    case 'removeButton':
        onClickRemoveColumn();
        break;
    case 'editButton':
        onClickEditColumn();
        break;
    case 'closeButton':
        browser.windows.getCurrent()
            .then((win) => {
                browser.windows.remove(win.id);
            });
        break;
    case 'closeAddColumnC':
    case 'cancelButton':
        addColumnContainerToggle(false);
        break;
    case 'okButton':
        onAcceptForAddColumn();
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
function addColumnContainerToggle(open)
{
    $('#addColumnContainer').attr('data-open', open);
    if (open) $('#columnLabel').focus();
}

function showColumns(focus)
{
    var $columnList = $('#columnListBody'),
        selected = $columnList.children('[data-selected="true"]').index();

    // 初期化
    $columnList.empty();

    // フォーカスを外す
    $columnList.children().attr('data-selected', 'false');

    Promise.all([
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                      action : TwitSideModule.COMMAND.COLUMN_GETCOLINFO,
                                      columnindex : null, key : null, win_type : null }),
        browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                      action : TwitSideModule.COMMAND.USER_GETINFO,
                                      userid : null, key : null })])
        .then(([all_colinfo, all_userinfo]) => {
            for (let idx in all_colinfo) {
                let columninfo = all_colinfo[idx],
                    $listItem = $('#templateContainer .columnListRow').clone()
                    .attr('data-tltype', columninfo.tl_type);

                $listItem.children().eq(0).attr('title', columninfo.columnlabel);
                $listItem.children().eq(1).attr('title', '@' + all_userinfo[columninfo.userid].screen_name);
                $listItem.children().eq(2).attr('title', browser.i18n.getMessage(
                    'column_' + TwitSideModule.getTimelineName(columninfo.tl_type)
                ));
                $listItem.children().eq(3).prop('checked', columninfo.options.notif);
                $listItem.children().eq(4).prop('checked', columninfo.options.onstart);
                $listItem.children().eq(5).prop('checked', columninfo.options.autoreload);
                $listItem.children().eq(6).prop('checked', columninfo.options.stream);
                $listItem.children().eq(7).prop('checked', columninfo.options.veil);

                if (columninfo.parameters.q) {
                    $listItem.children().eq(8).attr('title', 'KEYWORD: ' + columninfo.parameters.q);
                }
                if (columninfo.parameters.list_id) {
                    $listItem.children().eq(8).attr('title', 'LISTID: ' + columninfo.parameters.list_id);
                }
                $listItem.appendTo($columnList);
            }
        });
}

// カラムの追加
function onClickAddColumn()
{
    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.USER_OPE,
                                  action : TwitSideModule.COMMAND.USER_GETINFO,
                                  userid : null, key : null })
        .then((all_userinfo) => {
            $('#screenname').empty();
            for (let userid in all_userinfo){
                let userinfo = all_userinfo[userid];

                $('#templateContainer .tweetUserOption').clone()
                    .val(userinfo.user_id)
                    .text('@' + userinfo.screen_name)
                    .appendTo('#screenname');
            }
            resetAddColumnC();
            addColumnContainerToggle(true);
            $('#addColumnContainer').attr('data-edit-columnindex', 0);
        });
}

// カラムの編集
function onClickEditColumn()
{
    var index = $('.columnListRow[data-selected="true"]').index();
    if (index < 0) return;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_GETCOLINFO,
                                  columnindex : index, key : null, win_type : null })
        .then((colinfo) => {
            resetAddColumnC(colinfo);
            addColumnContainerToggle(true);
            $('#addColumnContainer').attr('data-edit-columnindex', index);
        });
}

// カラムの削除
function onClickRemoveColumn()
{
    var index = $('.columnListRow[data-selected="true"]').index();
    if (index < 0) return;

    if (getPref('confirm_deletecolumn')
        && !confirm(browser.i18n.getMessage('confirmDeleteColumn'))) return;

    browser.runtime.sendMessage({ command : TwitSideModule.COMMAND.COLUMN_OPE,
                                  action : TwitSideModule.COMMAND.COLUMN_DELETE,
                                  columnindex : index })
        .then(() => {
            showColumns();
        });
}

// カラム追加コンテナリセット
function resetAddColumnC(columninfo)
{
    // リセット
    if (!columninfo) {
        $('#addColumnContainer').attr('data-type', 'add');

        $('#columnLabel').val('');
        $('#screenname').removeAttr('disabled')[0].selectedIndex = 0;
        $('#tlType > .tlTypeOption:gt(4)').css('display', 'none').attr('disabled', 'disabled');
        $('#tlType').removeAttr('disabled')[0].selectedIndex = 0;
        $('#notif, #onstart, #autoreload, #stream, #veil').prop('checked', false);
        $('#parameter').css('display', 'none');
    }
    else {
        $('#addColumnContainer').attr('data-type', 'edit');

        $('#columnLabel').val(columninfo.columnlabel);
        $('#screenname').attr('disabled', 'disabled')[0].selectedIndex =
            $('#screenname > .tweetUserOption[value="'+ columninfo.userid +'"]').index();
        $('#tlType > .tlTypeOption').css('display', '').removeAttr('disabled');
        $('#tlType').attr('disabled', 'disabled')[0].selectedIndex =
            $('#tlType > .tlTypeOption[value="'+ columninfo.tl_type +'"]').index();
        checkboxControl();

        $('#notif').prop('checked', columninfo.options.notif);
        $('#onstart').prop('checked', columninfo.options.onstart);
        $('#autoreload').prop('checked', columninfo.options.autoreload);
        $('#stream').prop('checked', columninfo.options.stream);
        $('#veil').prop('checked', columninfo.options.veil);
        if (columninfo.parameters.q) {
            $('.columninfoBox:eq(8)').css('display', '');
            $('#parameter').val(
                'KEYWORD: ' + columninfo.parameters.q
            );
        }
        if (columninfo.parameters.list_id) {
            $('.columninfoBox:eq(8)').css('display', '');
            $('#parameter').val(
                'LISTID: ' + columninfo.parameters.list_id
            );
        }
    }
    checkboxControl();
}

// ボタンの排他処理
function checkboxControl()
{
    var tlType = parseInt($('#tlType')[0].selectedOptions[0].value),
        $notif = $('#notif'),
        $onstart = $('#onstart'),
        $autoreload = $('#autoreload'),
        $stream = $('#stream');

    switch (tlType) {
    case TwitSideModule.TL_TYPE.TIMELINE:
        $notif.removeAttr('disabled');
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.removeAttr('disabled');
        $autoreload.disabled = $stream.checked ? true : false;
        $stream.disabled = $autoreload.checked ? true : false;
        break;
    case TwitSideModule.TL_TYPE.CONNECT:
        $notif.attr('disabled', 'disabled'); $notif.prop('checked', false);
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    case TwitSideModule.TL_TYPE.RETWEETED:
        $notif.attr('disabled', 'disabled'); $notif.prop('checked', false);
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    case TwitSideModule.TL_TYPE.FAVORITE:
        $notif.attr('disabled', 'disabled'); $notif.prop('checked', false);
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    case TwitSideModule.TL_TYPE.DIRECTMESSAGE:
        $notif.attr('disabled', 'disabled'); $notif.prop('checked', false);
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    case TwitSideModule.TL_TYPE.SEARCH:
        $notif.removeAttr('disabled');
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    case TwitSideModule.TL_TYPE.LISTTIMELINE:
        $notif.removeAttr('disabled');
        $onstart.removeAttr('disabled');
        $autoreload.removeAttr('disabled');
        $stream.attr('disabled', 'disabled'); $stream.prop('checked', false);
        break;
    }

    if ($notif.attr('disabled')) $notif.prop('checked', false);
    if ($onstart.attr('disabled')) $onstart.prop('checked', false);
    if ($autoreload.attr('disabled')) $autoreload.prop('checked', false);
    if ($stream.attr('disabled')) $stream.prop('checked', false);
}


/**
 * Column operation
 */
function onAcceptForAddColumn()
{
    var type = $('#addColumnContainer').attr('data-type');

    if (!$('#columnLabel').val()) {
        alert(browser.i18n.getMessage('columns.message.entercolumnlabel'));
        return;
    }

    switch (type) {
    case 'add':
        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.COLUMN_ADD,
              tl_type : parseInt($('#tlType')[0].selectedOptions[0].value),
              columnlabel : $('#columnLabel').val(),
              userid : $('#screenname')[0].selectedOptions[0].value,
              options : { onstart : $('#onstart').prop('checked'),
                          autoreload : $('#autoreload').prop('checked'),
                          stream : $('#stream').prop('checked'),
                          notif : $('#notif').prop('checked'),
                          veil : $('#veil').prop('checked') },
              parameters : null })
            .then(() => {
                addColumnContainerToggle(false);
                showColumns();
            });
        break;
    case 'edit':
        browser.runtime.sendMessage(
            { command : TwitSideModule.COMMAND.COLUMN_OPE,
              action : TwitSideModule.COMMAND.COLUMN_EDIT,
              columnindex : parseInt($('#addColumnContainer').attr('data-edit-columnindex')),
              columninfo : {
                  columnlabel : $('#columnLabel').val(),
                  options : { onstart : $('#onstart').prop('checked'),
                              autoreload : $('#autoreload').prop('checked'),
                              stream : $('#stream').prop('checked'),
                              notif : $('#notif').prop('checked'),
                              veil : $('#veil').prop('checked') },
                  parameters : null }
            })
            .then(() => {
                addColumnContainerToggle(false);
                showColumns();
            });
        break;
    }
}

function onSortColumn(newIndex)
{
    if (originalIndex == null || newIndex == null
        || originalIndex == newIndex) return;

    browser.runtime.sendMessage(
        { command : TwitSideModule.COMMAND.COLUMN_OPE,
          action : TwitSideModule.COMMAND.COLUMN_SORT,
          oldindex : originalIndex,
          newindex : newIndex })
        .then(() => {
            originalIndex = null;
        });
}
