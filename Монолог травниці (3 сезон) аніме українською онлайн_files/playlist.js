// ============================================================
// КОНФІГУРАЦІЯ — всі "магічні числа" в одному місці 
// ============================================================
var PL_CONFIG = {
    MIN_RESUME_TIME:      10,     // мінімальний час (сек) для відновлення/збереження
    SAVE_INTERVAL_MS:     60000,  // інтервал автозбереження прогресу (мс)
    AUTOPLAY_DELAY_MS:    8000,   // затримка перед autoplay-командою (мс)
    RESUME_HINT_TTL_MS:   15000,  // час показу підказки "продовжити" (мс)
    COUNTDOWN_SECONDS:    5,      // секунди зворотного відліку до наступної серії
    DRAG_THRESHOLD_PX:    4,      // мінімальний зсув мишки для розпізнання drag
    ARROW_SCROLL_RESERVE: 60,     // резерв при розрахунку кроку скролу
    ARROW_SCROLL_MIN:     100,    // мінімальний крок скролу стрілками
    SAVE_STATE_DEBOUNCE:  300,    // debounce збереження стану у localStorage (мс)
    SEEK_READY_DELAY_MS:  500,    // затримка seek після ready (мс)
    SEEK_CLEAR_DELAY_MS:  1500,   // затримка зняття _seekPending без autoplay (мс)
    PLAY_AFTER_SEEK_MS:   500,    // затримка play після seek (мс)
    PROGRESS_UPDATE_MS:   5000,   // мінімальний інтервал оновлення прогрес-бара (мс)
    SCROLL_TO_EP_DELAY:   200,    // затримка прокрутки до активної серії (мс)
    RESUME_HINT_DELAY_MS: 1500,   // затримка показу підказки після ініціалізації (мс)
    NEXT_COUNTDOWN_FADE:  300,    // тривалість fadeOut countdown (мс)
    PLAYER_WAIT_STEP_MS:  200,    // крок очікування готовності плеєра (мс)
    PLAYER_WAIT_MAX_MS:   5000,   // максимальний час очікування плеєра (мс)
    LOAD_DEBOUNCE_MS:     400,    // debounce get_progress при швидкому перемиканні серій (мс)
    PAUSE_DEBOUNCE_MS:    2000,   // debounce save_progress при паузі (мс)
};

// Довірені origins для postMessage
var PL_TRUSTED_ORIGINS = (function () {
    var list = [
        'https://moonanime.art',
        'https://tortuga.tw',
        'https://ashdi.vip',
        'https://tortuga.wtf',
        'https://fenixplay.xyz'
    ];
    // Set для O(1) пошуку; fallback на масив для старих браузерів
    if (typeof Set !== 'undefined') {
        var s = new Set(list);
        return { has: function (o) { return s.has(o); } };
    }
    return { has: function (o) { return list.indexOf(o) !== -1; } };
})();

// ============================================================
// localStorage — безпечна обгортка (приватний режим / QuotaExceededError)
// ============================================================
var _ls = {
    get: function (key) {
        try { return localStorage.getItem(key); } catch (e) { return null; }
    },
    set: function (key, val) {
        try { localStorage.setItem(key, val); } catch (e) {}
    },
    remove: function (key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }
};

// ============================================================
// PlScroller
// ============================================================
var PlScroller = (function () {

    function initDrag(ul) {
        var isDragging = false, startX, startScroll, hasMoved = false;

        ul.addEventListener('mousedown', function (e) {
            // Drag дозволений з будь-якого місця li, включно з .playlists-view.
            // Якщо це був drag (hasMoved=true) — blocker у mouseup заблокує наступний
            // click, тому іконка "переглянуто" не спрацює випадково після перетягування.
            isDragging  = true;
            hasMoved    = false;
            startX      = e.pageX;
            startScroll = ul.scrollLeft;
            ul.classList.add('pl-drag');
            e.preventDefault();
        });

        // passive: true — браузер не блокує рендеринг в очікуванні preventDefault
        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            var delta = e.pageX - startX;
            if (Math.abs(delta) > PL_CONFIG.DRAG_THRESHOLD_PX) hasMoved = true;
            ul.scrollLeft = startScroll - delta;
        }, { passive: true });

        document.addEventListener('mouseup', function () {
            if (!isDragging) return;
            isDragging = false;
            ul.classList.remove('pl-drag');
            if (hasMoved) {
                var blocker = function (ev) {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ul.removeEventListener('click', blocker, true);
                };
                ul.addEventListener('click', blocker, true);
            }
            hasMoved = false;
        });

        // mouseleave на document — скидаємо drag якщо миша вийшла з вікна
        document.addEventListener('mouseleave', function () {
            if (isDragging) {
                isDragging = false;
                hasMoved   = false;
                ul.classList.remove('pl-drag');
            }
        });
    }

    function updateArrows($wrap, ul) {
        var canScroll = ul.scrollWidth > ul.clientWidth + 2;
        $wrap.toggleClass('pl-scroll', canScroll);
        if (canScroll) {
            $wrap.find('.playlists-prev').toggleClass('pl-edge', ul.scrollLeft <= 2);
            $wrap.find('.playlists-next').toggleClass('pl-edge',
                ul.scrollLeft >= ul.scrollWidth - ul.clientWidth - 2);
        }
    }

    function init($wrap) {
        var $ul = $wrap.children('ul');
        if (!$ul.length) return;
        var ul = $ul[0];

        if (!$wrap.find('.playlists-prev').length) {
            $wrap.prepend('<div class="playlists-prev" role="button" aria-label="Назад"></div>');
            $wrap.append('<div class="playlists-next" role="button" aria-label="Вперед"></div>');
        }

        // Крок рахується при кожному кліку — щоб враховувати поточну ширину після resize
        $wrap.find('.playlists-prev').off('click.pl').on('click.pl', function () {
            var step = Math.max(ul.clientWidth - PL_CONFIG.ARROW_SCROLL_RESERVE, PL_CONFIG.ARROW_SCROLL_MIN);
            ul.scrollBy({ left: -step, behavior: 'smooth' });
        });
        $wrap.find('.playlists-next').off('click.pl').on('click.pl', function () {
            var step = Math.max(ul.clientWidth - PL_CONFIG.ARROW_SCROLL_RESERVE, PL_CONFIG.ARROW_SCROLL_MIN);
            ul.scrollBy({ left: step, behavior: 'smooth' });
        });

        $ul.off('scroll.pl').on('scroll.pl', function () { updateArrows($wrap, ul); });

        if (!ul._plDragInit) { ul._plDragInit = true; initDrag(ul); }

        if (window.ResizeObserver) {
            if (!ul._plRO) {
                ul._plRO = new ResizeObserver(function () { updateArrows($wrap, ul); });
                ul._plRO.observe(ul);
            }
        } else {
            setTimeout(function () { updateArrows($wrap, ul); }, 100);
        }

        updateArrows($wrap, ul);
        $wrap.data('pl-ul', ul);
    }

    function scrollToEl($wrap, liEl, instant) {
        var ul = $($wrap).data('pl-ul');
        if (!ul || !liEl) return;
        var left = liEl.offsetLeft - ul.clientWidth / 2 + liEl.offsetWidth / 2;
        ul.scrollTo({ left: Math.max(0, left), behavior: instant ? 'instant' : 'smooth' });
    }

    return { init: init, scrollToEl: scrollToEl, updateArrows: updateArrows };
})();

// ============================================================
// Публічні функції скролера
// ============================================================

function sly_execute() {
    $('.playlists-items').each(function () { PlScroller.init($(this)); });
}

function updateScrollerFor($items) {
    var ul = $($items).data('pl-ul');
    if (ul) {
        ul.scrollTo({ left: 0, behavior: 'instant' });
        PlScroller.updateArrows($($items), ul);
    }
}

function filterEpisodes($videosItems, activeId) {
    var sid  = String(activeId);
    var $all = $videosItems.find('ul li');
    $all.removeClass('pl-vis active');
    $all.filter(function () { return String($(this).data('id')) === sid; }).addClass('pl-vis');
    updateScrollerFor($videosItems);
}

function filterTabRow($row, parentId) {
    var pid  = String(parentId);
    var $all = $row.find('li');
    $all.removeClass('pl-vis active');
    $all.filter(function () {
        var id = String($(this).data('id') || '');
        return id === pid || id.indexOf(pid + '_') === 0;
    }).addClass('pl-vis');
    updateScrollerFor($row);
}

// ============================================================
// WATCH PROGRESS — фабрична функція (підтримує кілька плеєрів на сторінці)
// ============================================================

// loggeds — встановлюється один раз після першого успішного ajax-запиту
var loggeds = false;

function createWatchProgress() {
    return {
    _lastFile:           null,
    _resumeTime:         0,
    _duration:           0,
    _currentFile:        null,
    _currentTime:        0,
    _news_id:            null,
    _xfname:             null,
    _saveInterval:       null,
    _messageHandler:     null,
    _isDirty:            false,
    _loaded:             false,
    _seekPending:        false,
    _playerReady:        false,
    _currentIframe:      null,
    _episodeNum:         null,
    _currentLiEl:        null,
    _$currentLiEl:       null,
    _lastProgressUpdate: 0,
    _autoPlay:           false,
    _countdownTimer:     null,
    _loadTimer:          null,  // debounce таймер для get_progress
    _pauseTimer:         null,  // debounce таймер для save при паузі
    _playerType:         '',    // moon | tortuga | ashdi | fenix | ''
    _iframeLoadHandler:  null,  // handshake get_ready для Fenix
    _iframeLoaded:       false, // чи відбувся load поточного src (Fenix)

    load: function (news_id, xfname, callback) {
        var self = this;
        self._news_id = news_id;
        self._xfname  = xfname;
        if (!loggeds) { self._loaded = true; callback(null); return; }

        // Debounce — якщо юзер швидко перемикає серії, скасовуємо попередній запит
        // і чекаємо 400мс. Запит піде тільки коли юзер зупинився на серії.
        if (self._loadTimer) {
            clearTimeout(self._loadTimer);
            self._loadTimer = null;
        }

        self._loadTimer = setTimeout(function () {
            self._loadTimer = null;
            $.getJSON('/engine/ajax/progress.php',
                { get_progress: 1, news_id: news_id, xfname: xfname },
                function (data) {
                    self._loaded = true;
                    if (data.progress) {
                        self._lastFile   = data.progress.file_url;
                        self._resumeTime = parseInt(data.progress.resume_time) || 0;
                        self._duration   = parseInt(data.progress.duration)    || 0;
                    }
                    callback(data.progress || null);
                }
            ).fail(function () { self._loaded = true; callback(null); });
        }, PL_CONFIG.LOAD_DEBOUNCE_MS);
    },

    save: function (file_url, resume_time, duration) {
        if (!loggeds || !file_url) return;
        var self = this;
        self._lastFile   = file_url;
        self._resumeTime = resume_time;
        self._duration   = duration;
        self._isDirty    = false;
        var p = {
            save_progress: 1,
            news_id:       self._news_id,
            xfname:        self._xfname,
            file_url:      file_url,
            resume_time:   resume_time,
            duration:      duration
        };
        if (self._episodeNum !== null) p.episode_num = self._episodeNum;
        $.post('/engine/ajax/progress.php', p);
    },

    updateProgressBar: function () {
        var self = this;
        if (!self._$currentLiEl || !self._currentTime || self._duration < 1) return;
        var now = Date.now();
        if (now - self._lastProgressUpdate < PL_CONFIG.PROGRESS_UPDATE_MS) return;
        self._lastProgressUpdate = now;
        var pct = Math.min(Math.round(self._currentTime / self._duration * 100), 100);
        // ✅ Використовуємо єдину функцію рендерингу прогрес-бара
        _setEpProgressBar(self._$currentLiEl, pct);
    },

    // Зупиняє та очищає таймер countdown (викликається при зміні серії)
    _clearCountdown: function () {
        var self = this;
        if (self._countdownTimer) {
            clearInterval(self._countdownTimer);
            self._countdownTimer = null;
        }
        // Видаляємо UI якщо ще є на сторінці
        $('.next-episode-countdown').remove();
    },

    showNextEpisodeCountdown: function (container) {
        var self = this;

        // Зупиняємо попередній countdown якщо був
        self._clearCountdown();

        var $next = container.find('.playlists-videos li.active.pl-vis').nextAll('.pl-vis').first();
        if (!$next.length) return;

        // Безпечне отримання тексту — без XSS
        var title = $next.contents().filter(function () { return this.nodeType === 3; })
            .text().trim() || 'Наступна серія';

        var autoEnabled = _ls.get('pl_autonext') !== '0';
        var countdown   = PL_CONFIG.COUNTDOWN_SECONDS;

        // Будуємо DOM без конкатенації user-даних у HTML-рядок
        var $cd = $('<div class="next-episode-countdown">' +
            '<div class="nec-header">' +
                '<div class="nec-header-text">' +
                    '<div class="nec-label">НАСТУПНА СЕРІЯ</div>' +
                    '<div class="nec-title"></div>' +    // текст вставляємо через .text() нижче
                '</div>' +
                '<label class="nec-autonext-toggle" title="Автоперехід">' +
                    '<input type="checkbox" class="nec-autonext-cb"' + (autoEnabled ? ' checked' : '') + '>' +
                    '<span class="nec-toggle-track">' +
                        '<span class="nec-toggle-thumb"></span>' +
                    '</span>' +
                    '<span class="nec-toggle-label">Автоперехід</span>' +
                '</label>' +
            '</div>' +
            '<div class="nec-bar-wrap"><div class="nec-bar cd-bar"></div></div>' +
            '<div class="nec-actions">' +
                '<button class="cd-play">▶ Дивитись зараз</button>' +
                '<button class="cd-cancel">✕</button>' +
            '</div>' +
            '<div class="cd-seconds nec-seconds"></div>' +
        '</div>');

        // ✅ XSS-безпечне вставляння назви серії
        $cd.find('.nec-title').text(title);

        container.find('.playlists-iframe').append($cd);

        function startTimer() {
            // ✅ Зупиняємо попередній таймер якщо він ще активний
            // (напр. якщо чекбокс клікнули двічі швидко)
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            countdown = PL_CONFIG.COUNTDOWN_SECONDS;
            $cd.find('.nec-seconds').text('Перехід через ' + countdown + ' сек...');
            $cd.find('.cd-bar').css('transition', 'none').css('width', '100%');
            setTimeout(function () {
                $cd.find('.cd-bar')
                   .css('transition', 'width ' + countdown + 's linear')
                   .css('width', '0%');
            }, 50);

            self._countdownTimer = setInterval(function () {
                countdown--;
                $cd.find('.nec-seconds').text('Перехід через ' + countdown + ' сек...');
                if (countdown <= 0) {
                    self._clearCountdown();
                    $cd.fadeOut(PL_CONFIG.NEXT_COUNTDOWN_FADE, function () { $cd.remove(); });
                    self._playNext($next, container);
                }
            }, 1000);
        }

        function stopTimer() {
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            $cd.find('.cd-bar').css('transition', 'none').css('width', '0%');
            $cd.find('.nec-seconds').text('Автоперехід вимкнено');
        }

        if (autoEnabled) { startTimer(); } else { stopTimer(); }

        $cd.find('.nec-autonext-cb').on('change', function () {
            var checked = $(this).is(':checked');
            _ls.set('pl_autonext', checked ? '1' : '0');
            if (checked) { startTimer(); } else { stopTimer(); }
        });

        $cd.find('.cd-play').on('click', function () {
            self._clearCountdown();
            $cd.fadeOut(PL_CONFIG.NEXT_COUNTDOWN_FADE, function () { $cd.remove(); });
            self._playNext($next, container);
        });

        $cd.find('.cd-cancel').on('click', function () {
            self._clearCountdown();
            $cd.fadeOut(PL_CONFIG.NEXT_COUNTDOWN_FADE, function () { $cd.remove(); });
        });
    },

    // ============================================================
    // АВТОПЕРЕХІД МІЖ СЕЗОНАМИ ФРАНШИЗИ
    // ============================================================

    // Знаходить наступний сезон у блоці франшизи і показує countdown
    showNextSeasonCountdown: function ($pp) {
        var self      = this;
        var currentId = $pp.closest('.playlists-ajax').data('news_id');

        // Знаходимо всі картки франшизи по порядку в DOM
        // Очікується що article має data-news-id:
        // <article class="news fran" data-news-id="{news-id}">
        var $cards    = $('.news.fran');
        var $nextCard = null;

        $cards.each(function (i) {
            var cardId = String($(this).data('news-id') || '');
            if (cardId === String(currentId)) {
                // Знайшли поточний — беремо наступний
                var $next = $cards.eq(i + 1);
                if ($next.length) $nextCard = $next;
                return false; // break
            }
        });

        if (!$nextCard || !$nextCard.length) return; // наступного сезону нема

        // Отримуємо URL і назву наступного сезону
        var $link   = $nextCard.closest('a');
        var nextUrl = $link.attr('href') || '';
        if (!nextUrl) return;

        // Назва — з alt картинки або span.link або title посилання
        var nextTitle = $nextCard.find('.link').text().trim()
                     || $nextCard.find('img').attr('alt')
                     || $link.attr('title')
                     || 'Наступний сезон';

        // Постер — src або data-src якщо використовується lazy load
        var $img    = $nextCard.find('img').first();
        var nextImg = $img.attr('src') || $img.attr('data-src') || '';

        self._showSeasonCountdown(nextUrl, nextTitle, nextImg);
    },

    // Показує UI countdown для переходу на наступний сезон
    _showSeasonCountdown: function (nextUrl, nextTitle, nextImg) {
        var self = this;

        // Видаляємо якщо вже є
        $('.next-season-countdown').remove();

        var autoEnabled = _ls.get('pl_autonext') !== '0';
        var countdown   = PL_CONFIG.COUNTDOWN_SECONDS;

        // Постер — показуємо тільки якщо є зображення
        var posterHtml = nextImg
            ? '<div class="nsc-poster-wrap"><img class="nsc-poster" src="' + nextImg + '" alt=""></div>'
            : '';

        var $cd = $('<div class="next-episode-countdown next-season-countdown' + (nextImg ? ' nsc-has-poster' : '') + '">' +
            posterHtml +
            '<div class="nsc-content">' +
                '<div class="nec-header">' +
                    '<div class="nec-header-text">' +
                        '<div class="nec-label">НАСТУПНИЙ СЕЗОН</div>' +
                        '<div class="nec-title"></div>' +
                    '</div>' +
                    '<label class="nec-autonext-toggle" title="Автоперехід">' +
                        '<input type="checkbox" class="nec-autonext-cb"' + (autoEnabled ? ' checked' : '') + '>' +
                        '<span class="nec-toggle-track">' +
                            '<span class="nec-toggle-thumb"></span>' +
                        '</span>' +
                        '<span class="nec-toggle-label">Автоперехід</span>' +
                    '</label>' +
                '</div>' +
                '<div class="nec-bar-wrap"><div class="nec-bar cd-bar"></div></div>' +
                '<div class="nec-actions">' +
                    '<button class="cd-play">▶ Перейти</button>' +
                    '<button class="cd-cancel">✕</button>' +
                '</div>' +
                '<div class="cd-seconds nec-seconds"></div>' +
            '</div>' +
        '</div>');

        // XSS-безпечне вставляння назви
        $cd.find('.nec-title').text(nextTitle);

        $('.playlists-iframe').first().append($cd);

        function startTimer() {
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            countdown = PL_CONFIG.COUNTDOWN_SECONDS;
            $cd.find('.nec-seconds').text('Перехід через ' + countdown + ' сек...');
            $cd.find('.cd-bar').css('transition', 'none').css('width', '100%');
            setTimeout(function () {
                $cd.find('.cd-bar')
                   .css('transition', 'width ' + countdown + 's linear')
                   .css('width', '0%');
            }, 50);

            self._countdownTimer = setInterval(function () {
                countdown--;
                $cd.find('.nec-seconds').text('Перехід через ' + countdown + ' сек...');
                if (countdown <= 0) {
                    clearInterval(self._countdownTimer);
                    self._countdownTimer = null;
                    window.location.href = nextUrl;
                }
            }, 1000);
        }

        function stopTimer() {
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            $cd.find('.cd-bar').css('transition', 'none').css('width', '0%');
            $cd.find('.nec-seconds').text('Автоперехід вимкнено');
        }

        if (autoEnabled) { startTimer(); } else { stopTimer(); }

        $cd.find('.nec-autonext-cb').on('change', function () {
            var checked = $(this).is(':checked');
            _ls.set('pl_autonext', checked ? '1' : '0');
            if (checked) { startTimer(); } else { stopTimer(); }
        });

        $cd.find('.cd-play').on('click', function () {
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            window.location.href = nextUrl;
        });

        $cd.find('.cd-cancel').on('click', function () {
            if (self._countdownTimer) {
                clearInterval(self._countdownTimer);
                self._countdownTimer = null;
            }
            $cd.fadeOut(PL_CONFIG.NEXT_COUNTDOWN_FADE, function () { $cd.remove(); });
        });
    },

    _playNext: function ($nextLi, container) {
        var self = this;
        $nextLi.closest('.playlists-items').find('li').removeClass('active');
        $nextLi.addClass('active');

        var fileUrl = $nextLi.data('file') || '';
        var id      = $nextLi.data('id');
        var index   = $nextLi.closest('.playlists-items').find('li.pl-vis').index($nextLi);

        container.find('.episode-name').removeClass('active').hide();
        container.find('.episode-name[data-id=' + id + ']:eq(' + index + ')').addClass('active').show();

        var $pa     = $nextLi.closest('.playlists-ajax');
        var news_id = $pa.data('news_id');
        var xfname  = $pa.data('xfname');
        _saveState($pa);

        setTimeout(function () {
            PlScroller.scrollToEl($nextLi.closest('.playlists-items'), $nextLi[0], false);
        }, PL_CONFIG.SCROLL_TO_EP_DELAY);

        var em = ($nextLi.contents()
            .filter(function () { return this.nodeType === 3; })
            .text().trim()).match(/^(\d+)\s*серія/i);

        self._episodeNum = em ? parseInt(em[1]) : null;
        self._news_id    = news_id;
        self._xfname     = xfname;

        var iframeEl = container.find('.playlists-iframe iframe')[0];
        if (!iframeEl) return;

        iframeEl.src = addNoplParam(fileUrl, container);
        self._resumeTime = 0;
        self._lastFile   = null;
        self.startTracking(fileUrl, iframeEl, $nextLi[0]);
        self._autoPlay = true;

        // Для плеєрів що не надсилають 'ready' — autoplay з затримкою
        var pt = _detectPlayerType(fileUrl);
        if (pt) {
            setTimeout(function () {
                if (self._autoPlay) {
                    self._autoPlay = false;
                    _playerCmd(iframeEl, 'play');
                }
            }, PL_CONFIG.AUTOPLAY_DELAY_MS);
        }

        if (loggeds) self.save(fileUrl, 0, 0);
    },

    startTracking: function (file_url, iframeEl, liEl) {
        var self = this;

        // Спочатку зупиняємо поточний трекінг (знімає старий messageHandler і saveInterval)
        self.stopTracking();

        self._currentFile        = file_url;
        self._currentTime        = 0;
        self._isDirty            = false;
        self._playerReady        = false;
        self._seekPending        = false;
        self._currentIframe      = iframeEl;
        self._currentLiEl        = liEl || null;
        self._$currentLiEl       = liEl ? $(liEl) : null;  // кешований jQuery-об'єкт
        self._lastProgressUpdate = 0;
        self._playerType         = _detectPlayerType(file_url);
        // НЕ скидаємо _resumeTime і _lastFile — вони встановлені зовні

        self._messageHandler = function (event) {
            if (!PL_TRUSTED_ORIGINS.has(event.origin)) return;
            var d = event.data;
            if (!d || typeof d !== 'object') return;

            // Fenix: приймаємо тільки від власного iframe і приводимо до внутрішніх подій
            if (d.fenix === true) {
                if (!iframeEl || event.source !== iframeEl.contentWindow) return;
                // Повідомлення до load — від попередньої серії в цьому ж iframe
                if (!self._iframeLoaded) return;
                d = _normalizeFenixMessage(d);
                if (!d) return;
            }
            if (!d.event) return;

            switch (d.event) {

                case 'init':
                case 'ready':
                    // Fenix шле і відповідь на get_ready, і подію ready — обробляємо один раз
                    if (self._playerType === 'fenix' && self._playerReady) break;
                    self._playerReady = true;
                    var rt = self.getResumeTime(file_url);
                    if (rt > 0 && iframeEl) {
                        self._seekPending = true;
                        setTimeout(function () {
                            _playerCmd(iframeEl, 'seek', rt);
                            if (self._autoPlay) {
                                setTimeout(function () {
                                    _playerCmd(iframeEl, 'play');
                                    setTimeout(function () { self._seekPending = false; }, 1000);
                                }, PL_CONFIG.PLAY_AFTER_SEEK_MS);
                            } else {
                                setTimeout(function () { self._seekPending = false; }, PL_CONFIG.SEEK_CLEAR_DELAY_MS);
                            }
                        }, PL_CONFIG.SEEK_READY_DELAY_MS);
                    } else if (self._autoPlay) {
                        self._autoPlay = false;
                        setTimeout(function () {
                            _playerCmd(iframeEl, 'play');
                        }, 300);
                    }
                    break;

                case 'time':
                    if (self._seekPending) return;
                    var t   = parseFloat(d.time || d.data || 0);
                    var dur = parseFloat(d.duration || 0);
                    // _currentTimeAt — коли отримали позицію (watchroom екстраполює між оновленнями)
                    if (t > 0)   { self._currentTime = t; self._currentTimeAt = Date.now(); self._isDirty = true; }
                    if (dur > 0)   self._duration = dur;
                    self.updateProgressBar();
                    break;

                case 'duration':
                    var d2 = parseFloat(d.data || d.duration || 0);
                    if (d2 > 0) self._duration = d2;
                    break;

                case 'pause':
                    var pt0 = parseFloat(d.time || 0);
                    if (pt0 > 0 && !self._seekPending) { self._currentTime = pt0; self._isDirty = true; }
                    // Debounce — зберігаємо через 2 сек після паузи.
                    // Якщо юзер натиснув паузу/play кілька разів — зайвих запитів не буде.
                    if (self._pauseTimer) clearTimeout(self._pauseTimer);
                    self._pauseTimer = setTimeout(function () {
                        self._pauseTimer = null;
                        if (self._currentTime > PL_CONFIG.MIN_RESUME_TIME && self._isDirty)
                            self.save(self._currentFile, Math.floor(self._currentTime), Math.floor(self._duration));
                    }, PL_CONFIG.PAUSE_DEBOUNCE_MS);
                    break;

                case 'end':
                    self.save(self._currentFile, 0, Math.floor(self._duration));
                    if (self._$currentLiEl) _setEpProgressBar(self._$currentLiEl, 0);
                    var $pp = $(self._currentIframe).closest('.playlists-ajax').find('.playlists-player');
                    if (!$pp.length) break;

                    // Є наступна серія в поточному сезоні — звичайний countdown
                    var $nextEp = self._$currentLiEl
                        ? self._$currentLiEl.nextAll('.pl-vis').first()
                        : $();

                    if ($nextEp.length) {
                        self.showNextEpisodeCountdown($pp);
                    } else {
                        // Наступної серії нема — перевіряємо чи сезон дійсно завершений
                        if (_isSeasonFinished($pp)) {
                            self.showNextSeasonCountdown($pp);
                        }
                    }
                    break;
            }
        };

        window.addEventListener('message', self._messageHandler);

        // Fenix відповідає на команди лише після handshake get_ready.
        // Шлемо тільки на load: src щойно змінено, і до load в iframe ще живе ПОПЕРЕДНЯ серія
        // (той самий origin) — вона відповіла б ready замість нової, і play пішов би в нікуди.
        if (self._playerType === 'fenix' && iframeEl) {
            var fenixOrigin = _originOf(iframeEl.src);
            self._iframeLoaded = false;
            self._iframeLoadHandler = function () {
                self._iframeLoaded = true;
                self._playerReady  = false;
                try { iframeEl.contentWindow.postMessage({ action: 'get_ready' }, fenixOrigin); } catch (e) {}
            };
            iframeEl.addEventListener('load', self._iframeLoadHandler);
        }

        self._saveInterval = setInterval(function () {
            if (!self._seekPending &&
                self._currentFile &&
                self._currentTime > PL_CONFIG.MIN_RESUME_TIME &&
                self._isDirty) {
                self.save(
                    self._currentFile,
                    Math.floor(self._currentTime),
                    Math.floor(self._duration)
                );
            }
        }, PL_CONFIG.SAVE_INTERVAL_MS);
    },

    stopTracking: function () {
        var self = this;
        if (self._saveInterval) {
            clearInterval(self._saveInterval);
            self._saveInterval = null;
        }
        if (self._messageHandler) {
            window.removeEventListener('message', self._messageHandler);
            self._messageHandler = null;
        }
        if (self._iframeLoadHandler) {
            if (self._currentIframe) self._currentIframe.removeEventListener('load', self._iframeLoadHandler);
            self._iframeLoadHandler = null;
        }
        // Скасовуємо debounce таймери якщо є
        if (self._loadTimer) {
            clearTimeout(self._loadTimer);
            self._loadTimer = null;
        }
        if (self._pauseTimer) {
            clearTimeout(self._pauseTimer);
            self._pauseTimer = null;
        }
        self._autoPlay = false;
        // Зберігаємо прогрес перед зупинкою
        if (self._currentFile && self._currentTime > PL_CONFIG.MIN_RESUME_TIME && self._isDirty)
            self.save(self._currentFile, Math.floor(self._currentTime), Math.floor(self._duration));
    },

    getResumeTime: function (file_url) {
        if (this._lastFile !== file_url || this._resumeTime < PL_CONFIG.MIN_RESUME_TIME) return 0;
        return this._resumeTime;
    },

    showResumeHint: function (container, progress) {
        if (!progress || !progress.file_url) return;
        // ✅ Захист від повторного виклику — не показуємо два hint одночасно
        if (container.find('.progress-resume-hint').length) return;
        var self        = this;
        var resumeTime  = parseInt(progress.resume_time) || 0;
        if (resumeTime < PL_CONFIG.MIN_RESUME_TIME) return;

        var h  = Math.floor(resumeTime / 3600);
        var m  = Math.floor((resumeTime % 3600) / 60);
        var s  = resumeTime % 60;
        var ts = h > 0
            ? h + ':' + (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s
            : m + ':' + (s < 10 ? '0' : '') + s;

        container.find('.progress-resume-hint').remove();

        var hint = $('<div class="progress-resume-hint">' +
            '<div class="prh-left"><span class="prh-icon">⏱</span>' +
                '<div><div class="prh-label">ПРОДОВЖИТИ ПЕРЕГЛЯД</div>' +
                '<div class="prh-time">Зупинились на <b>' + ts + '</b></div></div>' +
            '</div>' +
            '<div class="prh-actions">' +
                '<button class="resume-hint-yes">▶ Продовжити</button>' +
                '<button class="resume-hint-no">↺ З початку</button>' +
            '</div>' +
        '</div>');

        container.find('.playlists-iframe').append(hint);

        // Спільна функція очікування готовності плеєра, потім виконання дії
        function waitForPlayerAndDo(action) {
            var iframe = self._currentIframe || container.find('.playlists-iframe iframe')[0];
            if (!iframe) return;
            if (self._playerReady) { action(iframe); return; }
            var waited = 0;
            var wi = setInterval(function () {
                waited += PL_CONFIG.PLAYER_WAIT_STEP_MS;
                if (self._playerReady || waited >= PL_CONFIG.PLAYER_WAIT_MAX_MS) {
                    clearInterval(wi);
                    action(iframe);
                }
            }, PL_CONFIG.PLAYER_WAIT_STEP_MS);
        }

        hint.find('.resume-hint-yes').on('click', function () {
            hint.fadeOut(300, function () { hint.remove(); });
            waitForPlayerAndDo(function (iframe) {
                _playerCmd(iframe, 'seek', resumeTime);
                setTimeout(function () {
                    _playerCmd(iframe, 'play');
                }, PL_CONFIG.PLAY_AFTER_SEEK_MS);
            });
        });

        hint.find('.resume-hint-no').on('click', function () {
            hint.fadeOut(300, function () { hint.remove(); });
            self._resumeTime = 0;
            self._lastFile   = null;
            waitForPlayerAndDo(function (iframe) {
                setTimeout(function () {
                    _playerCmd(iframe, 'seek', 0);
                    setTimeout(function () {
                        _playerCmd(iframe, 'play');
                    }, 300);
                }, 200);
            });
        });

        setTimeout(function () { hint.fadeOut(500, function () { hint.remove(); }); }, PL_CONFIG.RESUME_HINT_TTL_MS);
    }
    }; // end of createWatchProgress return object
} // end of createWatchProgress

// Глобальний singleton — для зворотної сумісності з одним плеєром на сторінці.
// При наявності кількох .playlists-ajax кожен отримує власний екземпляр через $self.data('wp').
var WatchProgress = createWatchProgress();

window.addEventListener('beforeunload', function () {
    // Зупиняємо всі активні екземпляри WatchProgress
    $('.playlists-ajax').each(function () {
        var wp = $(this).data('wp');
        if (wp) wp.stopTracking();
    });
    // Зупиняємо глобальний singleton (якщо використовувався)
    WatchProgress.stopTracking();
});

// ============================================================
// HELPERS
// ============================================================

// Перевіряє чи сезон завершений — за статусом І кількістю серій.
// Обидві умови мають виконуватись одночасно.
//
// HTML на сторінці:
// <span id="anime-status"
//       data-status="{xfields[status]}"
//       data-episode="{xfields[episode]}"
//       style="display:none"></span>
//
// data-status:  finished | proceed | abandoned | unknown
// data-episode: "24 з 24" | "12 з 24" | "12 з 12+ОВА" | "4 з ХХ"
function _isSeasonFinished($pp) {
    var $el = $('#anime-status');

    // ── Перевірка 1: статус ──────────────────────────────────
    var status = $el.data('status');
    if (status !== 'finished') return false;

    // ── Перевірка 2: кількість серій у плейлисті ─────────────
    // Рахуємо скільки серій є у видимому плейлисті (pl-vis)
    var totalInPlaylist = $pp
        .find('.playlists-videos li.pl-vis')
        .length;

    // ── Перевірка 3: поле серій на сторінці ──────────────────
    // Формати: "24 з 24", "12 з 24+ОВА", "12 з 12+ОВА", "4 з ХХ"
    var episodeStr = String($el.data('episode') || '').trim();

    if (episodeStr) {
        // Парсимо перше і друге число
        // \d+ — поточна кількість, потім "з", потім число або ХХ
        var match = episodeStr.match(/^(\d+)\s*з\s*(\d+|ХХ|XX)/i);

        if (match) {
            var current = parseInt(match[1]);
            var total   = match[2].toUpperCase();

            // Якщо загальна кількість невідома — не показуємо перехід
            if (total === 'ХХ' || total === 'XX') return false;

            total = parseInt(total);

            // Поточна кількість серій у плейлисті має збігатись з полем
            // (захист від випадку коли поле каже "24 з 24" але в плейлисті
            // лише 20 серій — значить ще не всі додані)
            if (totalInPlaylist < current) return false;

            // Переглянута кількість має дорівнювати загальній
            if (current < total) return false;
        }
        // Якщо формат не розпізнано — довіряємо статусу
    }

    return true;
}

function addNoplParam(url, playerEl) {
    if (!url || url.indexOf('ashdi') === -1) return url;
    var isLogged = $(playerEl).closest('.playlists-ajax').data('is-logged');
    if (!isLogged || /[?&]nopl/.test(url)) return url;
    return url + (url.indexOf('?') !== -1 ? '&' : '?') + 'nopl';
}

// Визначає тип плеєра за URL — для autoplay-затримки
function _detectPlayerType(url) {
    if (!url) return '';
    if (url.indexOf('moonanime.art') !== -1) return 'moon';
    if (url.indexOf('tortuga')       !== -1) return 'tortuga';
    if (url.indexOf('ashdi.vip')       !== -1) return 'ashdi';
    if (url.indexOf('fenixplay.xyz') !== -1) return 'fenix';

    return '';
}

function _originOf(url) {
    try { return new URL(url, location.href).origin; } catch (e) { return '*'; }
}

// Надсилає команду в iframe плеєра з урахуванням його протоколу.
// cmd: play | pause | seek; value — для seek (секунди)
var _FENIX_CMD = { play: 'player_play', pause: 'player_pause', toggle: 'player_toggle',
                   seek: 'player_seek', speed: 'player_speed' };

function _playerCmd(iframeEl, cmd, value) {
    if (!iframeEl || !iframeEl.contentWindow) return;
    var msg;
    try {
        if (_detectPlayerType(iframeEl.src) === 'fenix') {
            msg = { action: _FENIX_CMD[cmd] || cmd };
            if (value !== undefined) msg.value = value;
            iframeEl.contentWindow.postMessage(msg, _originOf(iframeEl.src));
        } else {
            msg = { api: cmd };
            if (value !== undefined) msg.set = value;
            iframeEl.contentWindow.postMessage(msg, '*');
        }
    } catch (e) {}
}

// Перетворює повідомлення Fenix у внутрішній формат { event, ... }; null — ігнорувати
function _normalizeFenixMessage(d) {
    if (d.action === 'get_ready') return d.result ? { event: 'ready' } : null;
    switch (d.event) {
        case 'ready':      return { event: 'ready' };
        case 'play':       return { event: 'play' };
        case 'loaded':
        case 'timeupdate': return { event: 'time', time: d.time, duration: d.duration };
        case 'pause':      return { event: 'pause', time: d.time };
        case 'ended':      return { event: 'end' };
    }
    return null;
}

// ✅ Єдина функція рендерингу прогрес-бара — використовується і при init, і при оновленні
function _setEpProgressBar($li, pct) {
    if (!$li || !$li.length) return;
    $li.find('.ep-progress-bar').remove();
    if (pct >= 1) {
        $li.append('<div class="ep-progress-bar" data-pct="' + pct + '%" style="width:' + pct + '%;"></div>');
    }
}

// Публічна обгортка для виклику при ініціалізації (приймає liEl + час)
function renderEpisodeProgress(liEl, resumeTime, duration) {
    if (!resumeTime || !duration || resumeTime < PL_CONFIG.MIN_RESUME_TIME) return;
    var pct = Math.min(Math.round(resumeTime / duration * 100), 100);
    _setEpProgressBar($(liEl), pct);
}

// ============================================================
// ЗБЕРЕЖЕННЯ / ВІДНОВЛЕННЯ СТАНУ
// ============================================================

// _saveStateTimer — debounce для _saveState
var _saveStateTimer = null;

function _saveState($ajax) {
    // Якщо відбувається відновлення — не зберігаємо
    if ($ajax.data('isRestoring')) return;

    // ✅ Збираємо всі дані ДО setTimeout — $ajax може бути видалено з DOM за 300мс
    var news_id    = $ajax.data('news_id');
    var player     = $ajax.find('.playlists-player');
    var pls        = player.find('.playlists-lists .playlists-items');
    var idxs       = '';
    for (var i = 0; i < pls.length; i++) {
        idxs += $(pls).eq(i).find('li.pl-vis').index($(pls).eq(i).find('li.active'));
        if (i + 1 < pls.length) idxs += '|';
    }
    var activeFile = player.find('.playlists-videos li.active.pl-vis').data('file') || '';
    var epIdx      = player.find('.playlists-videos li.pl-vis').index(
                        player.find('.playlists-videos li.active.pl-vis'));
    var stateVal   = idxs + ':' + epIdx;

    clearTimeout(_saveStateTimer);
    _saveStateTimer = setTimeout(function () {
        _ls.set('episode' + news_id,       stateVal);
        _ls.set('episode' + news_id + 'u', activeFile);
    }, PL_CONFIG.SAVE_STATE_DEBOUNCE);
}

// ============================================================
// ВІДНОВЛЕННЯ СЕРІЇ ЗА file_url
// ============================================================

function _normalizeUrl(u) {
    return String(u || '')
        .replace(/[?&]nopl$/, '')
        .replace(/\?nopl&/, '?')
        .replace(/&nopl&/, '&');
}

function _findLiByUrl(player, cleanTarget) {
    var $found = null;
    player.find('.playlists-videos li[data-file]').each(function () {
        if (_normalizeUrl($(this).data('file')) === cleanTarget) {
            $found = $(this);
            return false; // break
        }
    });
    return $found;
}

function _clickTabsForTarget(player, segments) {
    var $lists = player.find('.playlists-lists .playlists-items');
    $lists.each(function (i) {
        var levelId = segments.slice(0, i + 2).join('_');
        var $tab    = $(this).find('li[data-id="' + levelId + '"]');
        if (!$tab.length) $tab = $(this).find('li:first');
        if ($tab.length && !$tab.hasClass('active')) {
            $tab.trigger('click');
        }
    });
}

function _restoreByFileUrl($ajax, fileUrl) {
    if (!fileUrl) return false;

    var player      = $ajax.find('.playlists-player');
    var cleanTarget = _normalizeUrl(fileUrl);
    var $target     = _findLiByUrl(player, cleanTarget);

    if (!$target || !$target.length) return false;

    var segments = String($target.data('id') || '').split('_');
    _clickTabsForTarget(player, segments);

    $target.trigger('click');

    setTimeout(function () {
        PlScroller.scrollToEl(
            player.find('.playlists-videos .playlists-items'),
            $target[0],
            true
        );
    }, 50);

    return true;
}

// ============================================================
// ТАБИ
// ============================================================

$('body').on('click', '.playlists-lists li', function () {
    var $li    = $(this);
    var player = $li.closest('.playlists-player');
    var id     = $li.data('id');
    var rowIdx = $li.closest('.playlists-items').index();
    var count  = $li.closest('.playlists-lists').find('.playlists-items').length;

    $li.closest('.playlists-items').find('li').removeClass('active');
    $li.addClass('active');

    for (var i = rowIdx + 1; i < count; i++) {
        var $row = player.find('.playlists-lists .playlists-items:eq(' + i + ')');
        filterTabRow($row, String(id));
        var $firstVis = $row.find('li.pl-vis:first').addClass('active');
        id = $firstVis.data('id');
    }

    var $vi    = player.find('.playlists-videos .playlists-items');
    filterEpisodes($vi, id);

    var $first = $vi.find('li.pl-vis:first').addClass('active');
    if (!$first.length) return;

    var url = addNoplParam($first.data('file'), player);
    player.find('.playlists-iframe').html(
        '<iframe src="' + url + '" allowfullscreen loading="lazy"' +
        ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen;"' +
        ' scrolling="no" frameborder="0" width="100%" height="100%"></iframe>'
    );
    player.find('.episode-name').removeClass('active').hide();
    player.find('.episode-name[data-id=' + id + ']:eq(0)').addClass('active').show();

    var $ajax = $li.closest('.playlists-ajax');
    if (!$ajax.data('isRestoring')) {
        var fileUrl  = $first.data('file') || '';
        var iframeEl = player.find('.playlists-iframe iframe')[0];
        if (fileUrl && iframeEl) {
            var em = ($first.contents()
                .filter(function () { return this.nodeType === 3; })
                .text().trim()).match(/^(\d+)\s*серія/i);
            var wp = $ajax.data('wp') || WatchProgress;
            wp._episodeNum = em ? parseInt(em[1]) : null;
            wp._resumeTime = 0;
            wp._lastFile   = null;
            wp.startTracking(fileUrl, iframeEl, $first[0]);
        }
        _saveState($ajax);
    }
});

// ============================================================
// СЕРІЯ
// ============================================================

// Блокування подвійного кліку по серії на час завантаження iframe
var _episodeClickLock = false;

$('body').on('click', '.playlists-videos li', function (event) {
    if (event.target.tagName !== 'LI') { event.stopPropagation(); return false; }
    if (_episodeClickLock) return false;
    _episodeClickLock = true;
    setTimeout(function () { _episodeClickLock = false; }, 500);

    var $li     = $(this);
    var player  = $li.closest('.playlists-player');
    var $ajax   = $li.closest('.playlists-ajax');
    var news_id = $ajax.data('news_id');
    var xfname  = $ajax.data('xfname');

    // Зупиняємо countdown якщо користувач вибрав іншу серію вручну
    var wp = $ajax.data('wp') || WatchProgress;
    wp._clearCountdown();

    $li.closest('.playlists-items').find('li').removeClass('active');
    $li.addClass('active');

    var fileUrl = $li.data('file') || '';
    var url     = addNoplParam(fileUrl, player);
    player.find('.playlists-iframe').html(
        '<iframe src="' + url + '" allowfullscreen loading="lazy"' +
        ' allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen;"' +
        ' scrolling="no" frameborder="0" width="100%" height="100%"></iframe>'
    );

    var id    = $li.data('id');
    var index = $li.closest('.playlists-items').find('li.pl-vis').index($li);
    player.find('.episode-name').removeClass('active').hide();
    player.find('.episode-name[data-id=' + id + ']:eq(' + index + ')').addClass('active').show();

    var iframeEl = player.find('.playlists-iframe iframe')[0];
    var em       = ($li.contents()
        .filter(function () { return this.nodeType === 3; })
        .text().trim()).match(/^(\d+)\s*серія/i);

    wp._episodeNum = em ? parseInt(em[1]) : null;
    wp._news_id    = news_id;
    wp._xfname     = xfname;

    if ($ajax.data('isRestoring')) {
        // Під час відновлення — тільки запускаємо трекінг,
        // але НЕ скидаємо resumeTime і НЕ робимо save()
        wp.startTracking(fileUrl, iframeEl, $li[0]);
    } else {
        wp._resumeTime = 0;
        wp._lastFile   = null;
        wp.startTracking(fileUrl, iframeEl, $li[0]);
        if (loggeds && fileUrl) {
            var pt = _detectPlayerType(fileUrl);
            if (pt) wp.save(fileUrl, wp.getResumeTime(fileUrl), wp._duration || 0);
            else    wp.save(fileUrl, 0, 0);
        }
        _saveState($ajax);
    }
});

// ============================================================
// МІТКА "ПЕРЕГЛЯНУТО"
// Звужений селектор — тільки li всередині .playlists-ajax
// ============================================================

$('body').on('click', '.playlists-ajax li', function () {
    var pv = $(this).find('.playlists-view');
    if (pv.hasClass('watched')) return;
    pv.addClass('watched');
    var news_id = $(this).closest('.playlists-ajax').data('news_id');
    var xfname  = $(this).closest('.playlists-ajax').data('xfname');
    var file    = $(this).data('file');
    if (file !== undefined) {
        var c = 'playlists-' + news_id + '-' + xfname + '-' + file;
        if (!_ls.get(c)) _ls.set(c, '1');
        else             _ls.remove(c);
    }
});

$('body').on('click', '.playlists-ajax li .playlists-view.watched', function (event) {
    event.stopPropagation();
    $(this).removeClass('watched');
});

// ============================================================
// ІНІЦІАЛІЗАЦІЯ
// ============================================================

$(document).ready(function () {
    $('.playlists-ajax').each(function () {
        var $self   = $(this);
        var xfname  = $self.data('xfname');
        var news_id = $self.data('news_id');

        $.ajax({
            url:      '/engine/ajax/playlists.php',
            data:     { news_id: news_id, xfield: xfname, user_hash: dle_login_hash },
            dataType: 'JSON',
            success: function (data) {
                if (!data.success) { console.log('Playlists', data.message); return; }

                $self.html(data.response);
                $self.data('is-logged', data.is_logged === true);

                // loggeds встановлюємо тільки один раз
                if (!loggeds) loggeds = data.is_logged === true;

                // ✅ Кожен плейлист отримує власний екземпляр WatchProgress
                var wp = createWatchProgress();
                $self.data('wp', wp);

                // Мітки "переглянуто"
                $self.find('.playlists-videos li').each(function () {
                    var file = $(this).data('file');
                    var c    = 'playlists-' + news_id + '-' + xfname + '-' + file;
                    $(this).append('<span class="playlists-view"></span>');
                    if (_ls.get(c)) $(this).find('.playlists-view').addClass('watched');
                });

                // Ініціалізуємо скролери
                sly_execute();

                // Завантажуємо прогрес з БД
                wp.load(news_id, xfname, function (progress) {

                    // Прогрес-бар на збереженій серії
                    if (progress && progress.file_url) {
                        var $t = $self.find('.playlists-videos li').filter(function () {
                            return $(this).data('file') === progress.file_url;
                        });
                        if ($t.length &&
                            parseInt(progress.resume_time) > PL_CONFIG.MIN_RESUME_TIME &&
                            parseInt(progress.duration) > 0) {
                            renderEpisodeProgress($t[0], parseInt(progress.resume_time), parseInt(progress.duration));
                        }
                    }

                    // Позначаємо елемент як такий, що відновлюється
                    $self.data('isRestoring', true);

                    var restored = false;

                    // ПРІОРИТЕТ 1: БД (тільки якщо залогінений)
                    if (progress && progress.file_url) {
                        restored = _restoreByFileUrl($self, progress.file_url);
                    }

                    // ПРІОРИТЕТ 2: localStorage file_url
                    if (!restored) {
                        var savedUrl = _ls.get('episode' + news_id + 'u');
                        if (savedUrl) restored = _restoreByFileUrl($self, savedUrl);
                    }

                    // ПРІОРИТЕТ 3: перший таб/серія
                    if (!restored) {
                        if ($self.find('.playlists-lists li').length)
                            $self.find('.playlists-lists li:first').trigger('click');
                        else
                            $self.find('.playlists-videos li:first').trigger('click');
                    }

                    // Знімаємо прапор відновлення
                    $self.data('isRestoring', false);

                    // Показуємо плеєр
                    $self.addClass('pl-ready');

                    // Підказка "продовжити перегляд"
                    if (progress && progress.file_url) {
                        setTimeout(function () {
                            wp.showResumeHint($self.find('.playlists-player'), progress);
                        }, PL_CONFIG.RESUME_HINT_DELAY_MS);
                    }
                });
            },
            error: function () { console.log('Playlists', 'ERR_REQUEST_FAILED'); }
        });
    });
});

// ============================================================
// НАВІГАЦІЯ КЛАВІАТУРОЮ ТА КНОПКАМИ
// ============================================================

function scrollToActive($li) {
    if (!$li || !$li.length) return;
    PlScroller.scrollToEl($li.closest('.playlists-items'), $li[0], false);
}

function switchToNextEpisode() {
    var $a = $('.playlists-videos li.active.pl-vis');
    var $n = $a.nextAll('.pl-vis').first();
    if ($n.length) {
        $a.removeClass('active');
        $n.addClass('active').trigger('click');
        scrollToActive($n);
    }
}

function switchToPreviousEpisode() {
    var $a = $('.playlists-videos li.active.pl-vis');
    var $p = $a.prevAll('.pl-vis').first();
    if ($p.length) {
        $a.removeClass('active');
        $p.addClass('active').trigger('click');
        scrollToActive($p);
    }
}

$(document).keydown(function (e) {
    // Ігноруємо якщо фокус у полі вводу — щоб стрілки не перемикали серії
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (e.which === 37) switchToPreviousEpisode();
    else if (e.which === 39) switchToNextEpisode();
});

$('.previous-episode').on('click', switchToPreviousEpisode);
$('.next-episode').on('click', switchToNextEpisode);