$(function() {
    const regexEmail = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;

    function subGuest(pageType, pageValue, typeSub, id, template) {
        DLEprompt('Введіть E-mail для підписки на оновлення цього аніме','', 'Підписка', function(email) {
            if (regexEmail.test(email)) {
                $.ajax({
                    type: 'POST',
                    url: dle_root + 'engine/lazydev/dle_subscribe/ajax.php',
                    data: {pageType: pageType, pageValue: pageValue, typeSub: typeSub, email: email, action: 'subscribe', template: template, dle_hash: dle_login_hash},
                    success: function(data) {
                        data = $.parseJSON(data);
                        if (data.error) {
                            errorMessage(data.text);
                        } else {
                            $('#block_sub_' + id).replaceWith(data.tpl);
                            if (data.guest) {
                                DLEalert('На ваш E-mail, ' + email + ', надіслано листа з підтвердженням про підписку.', 'Підтвердіть підписку');
                            }
                        }
                    }
                });
            } else {
                subGuest(pageType, pageValue, typeSub, id, template);
            }
        }, false);
    }

    function unsubGuest(pageType, pageValue, typeSub, id, template) {
        DLEprompt('Введіть E-mail для відписки','', 'Відписатися', function(email) {
            if (regexEmail.test(email)) {
                $.ajax({
                    type: 'POST',
                    url: dle_root + 'engine/lazydev/dle_subscribe/ajax.php',
                    data: {pageType: pageType, pageValue: pageValue, typeSub: typeSub, email: email, action: 'subscribe', template: template, dle_hash: dle_login_hash},
                    success: function(data) {
                        data = $.parseJSON(data);
                        if (data.error) {
                            errorMessage(data.text);
                        } else {
                            $('#block_sub_' + id).replaceWith(data.tpl);
                        }
                    }
                });
            } else {
                unsubGuest(pageType, pageValue, typeSub, id, template);
            }
        }, false);
    }

    function subUser(pageType, pageValue, typeSub, id, template) {
        $.ajax({
            type: 'POST',
            url: dle_root + 'engine/lazydev/dle_subscribe/ajax.php',
            data: {pageType: pageType, pageValue: pageValue, typeSub: typeSub, action: 'subscribe', template: template, dle_hash: dle_login_hash},
            success: function(data) {
                data = $.parseJSON(data);
                if (data.error) {
                    errorMessage(data.text);
                } else {
                    $('#block_sub_' + id).replaceWith(data.tpl);
                }
            }
        });
    }

    function errorMessage(info) {
        DLEalert(info, 'Ошибка');
    }

    $('body').on('click', '[data-subscribe]', function() {
        let pageType = $(this).data('pagetype');
        let pageValue = $(this).data('pagevalue');
        let typeSub = $(this).data('type');
        let template = $(this).data('template');
        let id = $(this).data('block');
        if (dle_group == 5) {
            if (typeSub == 'unsubscribe') {
                DLEconfirm('Відписатися від оновлення цього аніме', dle_confirm, function() {
                    unsubGuest(pageType, pageValue, typeSub, id, template);
                });
            } else {
                subGuest(pageType, pageValue, typeSub, id, template);
            }
        } else {
            if (typeSub == 'unsubscribe') {
                DLEconfirm('Відписатися від оновлення цього аніме', dle_confirm, function() {
                    subUser(pageType, pageValue, typeSub, id, template);
                });
            } else {
                subUser(pageType, pageValue, typeSub, id, template);
            }
        }

    });
});