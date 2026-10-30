$(document).ready(function() {

function simpleToast(message, type) {
    type = type || 'success';

    var container = document.getElementById('simple-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'simple-toast-container';
        document.body.appendChild(container);
    }

    var toast = document.createElement('div');
    toast.className = 'simple-toast simple-toast--' + type;
    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(function() {
        toast.classList.add('simple-toast--show');
    });

    setTimeout(function() {
        toast.classList.remove('simple-toast--show');
        setTimeout(function() {
            toast.remove();
        }, 300);
    }, 2000);
}

var notifListCache = { data: null, ts: 0 };
var NOTIF_LIST_CACHE_MS = 8000;

function applyNotifListData(data) {
    $('.badge-counter').html(data.notice_count);
    $('#alertsDropdownList').html(data.notice_list);
    $('#alertsDropdownListMob').html(data.notice_list);
    $('#alertsDropdownListFloating').html(data.notice_list);

    if (data.notice_count > 0) {
        $('#RingCount').addClass('ring');
        $('#floatingBellBadge').text(data.notice_count > 99 ? '99+' : data.notice_count).show();
        $('#floatingBellBtn').addClass('has-unread');
    } else {
        $('#floatingBellBadge').hide();
        $('#floatingBellBtn').removeClass('has-unread');
    }
}

function anime_notifications(action, notif_id = false, forceRefresh = false) {
    if (action === 'list' && !forceRefresh && notifListCache.data && (Date.now() - notifListCache.ts) < NOTIF_LIST_CACHE_MS) {
        applyNotifListData(notifListCache.data);
        return;
    }

    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        action: action,
        notif_id: notif_id,
        user_hash: dle_login_hash
    }, function(data) {
        if (action == 'badge') {
            $('.badge-counter').html(data.notice_count);
            if (data.notice_count > 0) {
                $('#RingCount').addClass('ring');
                $('#floatingBellBadge').text(data.notice_count > 99 ? '99+' : data.notice_count).show();
                $('#floatingBellBtn').addClass('has-unread');
            } else {
                $('#floatingBellBadge').hide();
                $('#floatingBellBtn').removeClass('has-unread');
            }
        } else if (action == 'list') {
            notifListCache = { data: data, ts: Date.now() };
            applyNotifListData(data);
        } else if (action == 'main_delete') {
            $('[data-notifid="' + notif_id + '"]').each(function () {
                $(this).slideUp("fast", function () { $(this).remove(); });
            });
            var notificationCount = parseInt($('#MainBadgeCounter').text().trim());
            if (notificationCount === 0) {
                $('#RingCount').removeClass('ring');
            }
            anime_notifications('list', false, true);
        } else if (action == 'delete') {
            $('[data-notifid="' + notif_id + '"]').remove();
            anime_notifications('list', false, true);
        } else if (action == 'full_delete') {
            var $list = $('.notifications-list');
            $list.find('.notification').fadeOut(200, function () { $(this).remove(); });
            $('.notification-all').remove();
            setTimeout(function () {
                if ($list.length && $list.children('.notification').length === 0) {
                    $list.html('<p class="no-found-list">Сповіщень немає.</p>');
                }
            }, 250);
            $('#RingCount').removeClass('ring');
            anime_notifications('list', false, true);
            simpleToast('Усі сповіщення видалено!', 'success');
        } else if (action == 'read') {
            $('#notification-' + notif_id + '').removeClass('unread');
            $('#notreaded-' + notif_id + '').hide();
            $('#readed-' + notif_id + '').show();
        } else if (action == 'unread') {
            $('#notification-' + notif_id + '').addClass('unread');
            $('#notreaded-' + notif_id + '').show();
            $('#readed-' + notif_id + '').hide();
        } else if (action == 'full_read') {
            $('.notification.unread').each(function () {
                var id = $(this).attr('id').replace('notification-', '');
                $(this).removeClass('unread');
                $('#notreaded-' + id).hide();
                $('#readed-' + id).show();
            });
            $('#RingCount').removeClass('ring');
            anime_notifications('list', false, true);
            simpleToast('Усі сповіщення прочитано!', 'success');
        } else if (action == 'full_read_main') {
            $('#RingCount').removeClass('ring');
            anime_notifications('list', false, true);
            simpleToast('Усі сповіщення прочитано!', 'success');
        } else if (action == 'full_delete_main') {
            $('#RingCount').removeClass('ring');
            anime_notifications('list', false, true);
            simpleToast('Усі сповіщення видалено!', 'success');
        } else {
            DLEalert(data.error, 'Увага');
        }
    }, "json");
}

$(document).on('click', '.segment', function() {
    var btn = $(this);
    if (btn.hasClass('active')) return;

    var control = btn.closest('.segmented-control');
    var newsId = control.data('news');
    var team = control.data('team');
    var value = btn.data('value');

    var label = '';
    if (team === '*') {
        if (value === 'all') label = 'увесь тайтл';
        else if (value === 'sub') label = 'субтитри (всі команди)';
        else if (value === 'ozv') label = 'озвучення (всі команди)';
        else label = 'відписано від тайтла';
    } else if (value === 'none') {
        label = 'відписано від команди «' + team + '»';
    } else {
        label = btn.text().trim() + ' — команда «' + team + '»';
    }

    var prevActive = control.find('.segment.active');

    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        post_id: newsId,
        subaction: 'set_subscription',
        team: team,
        value: value,
        user_hash: dle_login_hash
    }, function(data) {
        if (data.status) {
            var sameLevelControls = $('.segmented-control[data-news="' + newsId + '"][data-team="' + team + '"]');
            sameLevelControls.find('.segment').removeClass('active');
            sameLevelControls.find('.segment[data-value="' + value + '"]').addClass('active');

            if (data.removed && data.removed.length) {
                var resetTeams = {};
                data.removed.forEach(function (r) { resetTeams[r.team] = true; });
                Object.keys(resetTeams).forEach(function (team_name) {
                    var otherControl = $('.segmented-control[data-news="' + newsId + '"][data-team="' + team_name + '"]');
                    otherControl.find('.segment').removeClass('active');
                    otherControl.find('.segment[data-value="none"]').addClass('active');
                });
            }

            if (team !== '*') {
                var globalControls = $('.segmented-control[data-news="' + newsId + '"][data-team="*"]');
                if (value !== 'none') {
                    globalControls.find('.segment').removeClass('active');
                } else {
                    var stillAnyTeamActive = $('.segmented-control[data-news="' + newsId + '"]')
                        .not('[data-team="*"]')
                        .find('.segment.active[data-value!="none"]').length > 0;
                    if (!stillAnyTeamActive) {
                        globalControls.find('.segment').removeClass('active');
                        globalControls.find('.segment[data-value="none"]').addClass('active');
                    }
                }
            }

            simpleToast(value === 'none' ? 'Відписано' : 'Підписка оформлена: ' + label, 'success');
            refreshSubscribeTriggerLabel();
        } else {
            prevActive.addClass('active');
            btn.removeClass('active');
            DLEalert(data.error, 'Увага');
        }
    }, "json").fail(function() {
        prevActive.addClass('active');
        btn.removeClass('active');
    });
});

function openSubscribeModal() {
    $('#subscribeModalOverlay').addClass('open');
}

function closeSubscribeModal() {
    $('#subscribeModalOverlay').removeClass('open');
}

$('#subscribeModalOverlay').on('click', function(e) {
    if (e.target === this) closeSubscribeModal();
});

function toggleSubscribeAdvanced(toggleBtn) {
    var btn = $(toggleBtn);
    var panel = btn.closest('.subscribe-modal').find('.subscribe-advanced');
    btn.toggleClass('open');
    panel.toggleClass('open');

    var lazyBlock = panel.find('.subscribe-teams-lazy');
    if (!lazyBlock.length || lazyBlock.data('loaded')) return;

    lazyBlock.data('loaded', true);
    var newsId = lazyBlock.data('news');

    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        post_id: newsId,
        subaction: 'subscribe_options',
        user_hash: dle_login_hash
    }, function (data) {
        if (data.status) {
            lazyBlock.replaceWith(data.html);
        } else {
            lazyBlock.html('<p class="subscribe-teams-empty">Не вдалося завантажити команди</p>');
        }
    }, "json").fail(function () {
        lazyBlock.data('loaded', false);
        lazyBlock.html('<p class="subscribe-teams-empty">Не вдалося завантажити команди</p>');
    });
}

$(document).on('keydown', function (e) {
    if (e.key === 'Escape') closeSubscribeModal();
});

function refreshSubscribeTriggerLabel() {
    var btn = $('.subscribe-trigger-btn');
    if (!btn.length) return;

    var globalControl = $('.segmented-control[data-team="*"]');
    var globalActive = globalControl.find('.segment.active');
    var globalValue = globalActive.data('value');

    var anyTeamActive = $('.segmented-control').not(globalControl).find('.segment.active[data-value!="none"]').length > 0;

    var label = 'Підписатися';
    var subscribed = false;

    if (globalValue && globalValue !== 'none') {
        label = globalActive.text().trim();
        subscribed = true;
    } else if (anyTeamActive) {
        label = 'Вибіркова підписка';
        subscribed = true;
    }

    btn.toggleClass('is-subscribed', subscribed);
    btn.html('<i class="fa fa-bell"></i> ' + label);
}

function PostSubscribe(post_id, action, element) {
    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        post_id: post_id,
        subaction: action,
        team: '*',
        type: '*',
        user_hash: dle_login_hash
    }, function(data) {
        if (data.status) {
            simpleToast(
                action === 'subscribe' ? 'Ви підписалися на оновлення!' : 'Ви відписалися від оновлень!',
                'success'
            );
        } else {
            DLEalert(data.error, 'Увага');
        }
    }, "json");
}

function unsubscribeFromList(newsId, team, type, element) {
    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        post_id: newsId,
        subaction: 'unsubscribe',
        team: team,
        type: type,
        user_hash: dle_login_hash
    }, function (data) {
        if (data.status) {
            $(element).fadeOut(200, function () {
                $(this).remove();
                var row = $('#subscription-row-' + newsId);
                if (row.find('.subscription-badge').length === 0) {
                    row.fadeOut(200, function () { $(this).remove(); });
                }
            });
            simpleToast('Відписано', 'success');
        }
    }, "json");
}

$(document).on('change', '.category-subscribe-toggle', function () {
    var checkbox = $(this);
    var categoryId = checkbox.data('category');
    var action = checkbox.is(':checked') ? 'subscribe_category' : 'unsubscribe_category';

    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", {
        category_id: categoryId,
        subaction: action,
        user_hash: dle_login_hash
    }, function (data) {
        if (data.status) {
            checkbox.closest('.subscribe-toggle-item').toggleClass('active', action === 'subscribe_category');
            simpleToast(
                action === 'subscribe_category' ? 'Підписано на нові тайтли категорії!' : 'Відписано від категорії',
                'success'
            );
        } else {
            checkbox.prop('checked', !checkbox.is(':checked'));
        }
    }, "json").fail(function () {
        checkbox.prop('checked', !checkbox.is(':checked'));
    });
});

$(document).on('change', '.notif-settings-toggle', function () {
    var allValues = {};
    $('.notif-settings-toggle').each(function () {
        allValues[$(this).data('key')] = $(this).is(':checked') ? '1' : '0';
    });

    $.get(dle_root + "engine/ajax/controller.php?mod=notifications", $.extend({
        subaction: 'save_notif_settings',
        user_hash: dle_login_hash
    }, allValues), function (data) {
        if (data.status) {
            simpleToast('Налаштування збережено', 'success');
        }
    }, "json");
});

function toggleFloatingNotifPanel() {
    var panel = $('#floatingNotifPanel');
    if (panel.hasClass('open')) {
        closeFloatingNotifPanel();
    } else {
        panel.addClass('open');
        $('#floatingNotifOverlay').addClass('open');
        anime_notifications('list'); 
    }
}

function closeFloatingNotifPanel() {
    $('#floatingNotifPanel').removeClass('open');
    $('#floatingNotifOverlay').removeClass('open');
}

$(document).ready(function () {
    if (typeof dle_login_hash === 'undefined' || !dle_login_hash) return; 
    if ($('#floatingBellBtn').length === 0) return; 
    anime_notifications('badge');
});

window.anime_notifications = anime_notifications;
window.openSubscribeModal = openSubscribeModal;
window.closeSubscribeModal = closeSubscribeModal;
window.toggleSubscribeAdvanced = toggleSubscribeAdvanced;
window.PostSubscribe = PostSubscribe;
window.unsubscribeFromList = unsubscribeFromList;
window.toggleFloatingNotifPanel = toggleFloatingNotifPanel;
window.closeFloatingNotifPanel = closeFloatingNotifPanel;

});