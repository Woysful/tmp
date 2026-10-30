// ============================================================
// КОНСТАНТИ
// ============================================================
var TIMEOUTS = {
    clearInput:  1000,
    messageHide: 2800,
    messageFade: 450,
};

// ============================================================
// НАВІГАЦІЯ ПО НОМЕРУ СЕРІЇ
// ============================================================
function goToEpisode() {
    var $input        = $('#episodeNumberInput');
    var episodeNumber = parseInt($input.val().trim(), 10);
    var $visible      = $('.playlists-videos .playlists-items li.pl-vis');

    if (isNaN(episodeNumber) || episodeNumber < 1 || episodeNumber > $visible.length) {
        alert('Введіть номер від 1 до ' + $visible.length + '.');
        return;
    }

    var $target = $visible.eq(episodeNumber - 1);
    $target.trigger('click');

    var $items = $target.closest('.playlists-items');
    if ($items.length && typeof PlScroller !== 'undefined') {
        setTimeout(function () { PlScroller.scrollToEl($items, $target[0], false); }, 50);
    }

    closeEpisodeDialog();
    setTimeout(function () { $input.val(''); }, TIMEOUTS.clearInput);
}

function closeEpisodeDialog() { $('#episodeDialog').fadeOut(); }

$('body').on('click', '#goToEpisodeBtn', goToEpisode);
$('body').on('keydown', '#episodeDialog', function (e) {
    if (e.which === 13) { e.preventDefault(); goToEpisode(); }
});
$('#toggle-serr').on('click', function () {
    $('#episodeDialog').fadeIn();
    $('#episodeNumberInput').focus();
});
$('.dialog-container').on('click', function (e) {
    if (!$(e.target).closest('.dialog-content').length) closeEpisodeDialog();
});
// ============================================================
// FULLSCREEN TRACKING
// ============================================================
var _wasFullscreen  = false;
var _nativeFromIframe = false; 

document.addEventListener('fullscreenchange', function () {
    var isNow = !!document.fullscreenElement;

    if (isNow) {
        if (FS._active && document.fullscreenElement &&
            document.fullscreenElement.tagName === 'IFRAME') {
            _nativeFromIframe = true;
        }
    } else {
        // fullscreen вимкнувся
        if (_nativeFromIframe) {
            _nativeFromIframe = false;
            if (FS._active) {
                FS._onActivity();
            }
        } else if (FS._active) {
            FS.exit();
        }
    }

    _wasFullscreen = isNow;
});

document.addEventListener('webkitfullscreenchange', function () {
    if (!document.webkitFullscreenElement && FS._active && !_nativeFromIframe) {
        FS.exit();
    }
});

// ============================================================
// ПОВНОЕКРАННИЙ РЕЖИМ — бокові панелі
// ============================================================
var FS = {
    _active:         false,
    _hideTimer:      null,
    _mouseBlocker:   null,
    _boundMouseMove: null,
    _boundDblClick:  null,

    // ── Mouse-blocker ──────────────────────────────────────
    _createMouseBlocker: function () {
        if (this._mouseBlocker) return this._mouseBlocker;
        var el   = document.createElement('div');
        var self = this;
        el.id            = 'fs-mouse-blocker';
        el.style.cssText = 'display:none;position:absolute;inset:0;z-index:5;' +
                           'pointer-events:none;background:transparent;cursor:none;';
        el.addEventListener('mousemove', function () { self._onActivity(); });
        el.addEventListener('dblclick',  function () { self.exit(); });
        document.querySelector('.playlists-player').appendChild(el);
        this._mouseBlocker = el;
        return el;
    },

    // ── Кнопки навігації (без fs-episode-info) ─────────────
    _createNavButtons: function () {
        var player = document.querySelector('.playlists-player');
        var self   = this;

        if (!document.getElementById('fs-prev')) {
            var prev       = document.createElement('button');
            prev.id        = 'fs-prev';
            prev.className = 'fs-nav-btn fs-prev-btn';
            prev.innerHTML = '<span class="fs-arrow">&#8592;</span><span class="fs-label">Попередня</span>';
            prev.addEventListener('click', function (e) {
                e.stopPropagation();
                switchToPreviousEpisode();
                self._onActivity();
            });
            player.appendChild(prev);
        }

        if (!document.getElementById('fs-next')) {
            var next       = document.createElement('button');
            next.id        = 'fs-next';
            next.className = 'fs-nav-btn fs-next-btn';
            next.innerHTML = '<span class="fs-label">Наступна</span><span class="fs-arrow">&#8594;</span>';
            next.addEventListener('click', function (e) {
                e.stopPropagation();
                switchToNextEpisode();
                self._onActivity();
            });
            player.appendChild(next);
        }

        if (!document.getElementById('fs-exit')) {
            var exitBtn    = document.createElement('button');
            exitBtn.id        = 'fs-exit';
            exitBtn.className = 'fs-nav-btn fs-exit-btn';
            exitBtn.innerHTML = '&#10005;';
            exitBtn.title     = 'Вийти (Esc)';
            exitBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                self.exit();
            });
            player.appendChild(exitBtn);
        }
    },

    // ── Скрол правої панелі до активної серії ─────────────
    // behavior: 'instant' при вході, 'smooth' при перемиканні серії
    // skipIfTabChange: true → не скролити (перемикання плеєра/таба)
    _scrollToActive: function (behavior) {
        var videos = document.querySelector('.playlists-player.fs-active .playlists-videos');
        if (!videos) return;

        var $active = $(videos).find('li.active.pl-vis');
        if (!$active.length) return;

        var li     = $active[0];
        var ul     = videos.querySelector('ul');
        var liTop  = li.offsetTop + (ul ? ul.offsetTop : 0);
        var center = liTop - videos.clientHeight / 2 + li.offsetHeight / 2;
        videos.scrollTo({ top: Math.max(0, center), behavior: behavior || 'smooth' });
    },

    // ── Показати / сховати UI ──────────────────────────────
    _showUI: function () {
        if (!this._active) return;
        document.querySelector('.playlists-player').classList.remove('fs-ui-hidden');
        if (this._mouseBlocker) {
            this._mouseBlocker.style.pointerEvents = 'none';
            this._mouseBlocker.style.cursor        = 'default';
        }
    },
    _hideUI: function () {
        if (!this._active) return;
        document.querySelector('.playlists-player').classList.add('fs-ui-hidden');
        if (this._mouseBlocker) {
            this._mouseBlocker.style.pointerEvents = 'auto';
            this._mouseBlocker.style.cursor        = 'none';
        }
    },
    _onActivity: function () { this._showUI(); this._scheduleHide(); },
    _scheduleHide: function () {
        var self = this;
        clearTimeout(this._hideTimer);
        this._hideTimer = setTimeout(function () { self._hideUI(); }, 3000);
    },

    // ── Вхід ──────────────────────────────────────────────
    enter: function () {
        if (this._active) return;
        var self   = this;
        var player = document.querySelector('.playlists-player');

        var go = function () {
            self._active = true;
            player.classList.add('fs-active');
            document.body.classList.add('fs-body');

            var mb = self._createMouseBlocker();
            mb.style.display = 'block';

            self._createNavButtons();
            // Показуємо тільки prev/next/exit (не episode-info)
            ['fs-prev', 'fs-next', 'fs-exit'].forEach(function (id) {
                var el = document.getElementById(id);
                if (el) el.style.display = '';
            });

            // Скрол до активної серії одразу після рендеру
            setTimeout(function () { self._scrollToActive('instant'); }, 80);

            self._boundDblClick = function (e) {
                if (!self._active) return;
                if (e.target.closest('#fs-prev,#fs-next,#fs-exit,.playlists-lists,.playlists-videos')) return;
                self.exit();
            };
            player.addEventListener('dblclick', self._boundDblClick, true);

            self._boundMouseMove = function () { self._onActivity(); };
            player.addEventListener('mousemove', self._boundMouseMove);

            self._scheduleHide();
        };

        var req = player.requestFullscreen ||
                  player.webkitRequestFullscreen ||
                  player.mozRequestFullScreen;

        if (req) { req.call(player).then(go).catch(go); }
        else      { go(); }
    },

    // ── Вихід ─────────────────────────────────────────────
    exit: function () {
        if (!this._active) return;
        this._active = false;
        clearTimeout(this._hideTimer);

        var player = document.querySelector('.playlists-player');
        player.classList.remove('fs-active', 'fs-ui-hidden');
        document.body.classList.remove('fs-body');

        if (this._boundDblClick) {
            player.removeEventListener('dblclick', this._boundDblClick, true);
            this._boundDblClick = null;
        }
        if (this._boundMouseMove) {
            player.removeEventListener('mousemove', this._boundMouseMove);
            this._boundMouseMove = null;
        }
        if (this._mouseBlocker) {
            this._mouseBlocker.style.display       = 'none';
            this._mouseBlocker.style.pointerEvents = 'none';
        }

        // Ховаємо кнопки
        ['fs-prev', 'fs-next', 'fs-exit'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Скидаємо FS-специфічні inline стилі
        var lists  = player.querySelector('.playlists-lists');
        var videos = player.querySelector('.playlists-videos');
        var fsProps = ['position','top','bottom','transform','width','maxHeight','overflowY','overflowX'];
        fsProps.forEach(function (p) {
            if (lists)  lists.style[p]  = '';
            if (videos) videos.style[p] = '';
        });

        if (document.fullscreenElement || document.webkitFullscreenElement) {
            (document.exitFullscreen || document.webkitExitFullscreen)
                .call(document).catch(function () {});
        }

        // Синхронізуємо горизонтальний скрол звичайного плеєра до активної серії
        setTimeout(function () {
            var $active = $('.playlists-videos li.active.pl-vis');
            if ($active.length && typeof PlScroller !== 'undefined') {
                PlScroller.scrollToEl(
                    $active.closest('.playlists-items'),
                    $active[0],
                    true   // instant
                );
            }
        }, 80);
    },


    onEpisodeChange: function () {
        if (!this._active) return;
        this._scrollToActive('smooth');
        this._onActivity();
    },


    onTabChange: function () {
        if (!this._active) return;
        this._onActivity();
        var self = this;
        setTimeout(function () {
            var videos = document.querySelector('.playlists-player.fs-active .playlists-videos');
            if (!videos) return;
            var $active = $(videos).find('li.active.pl-vis');
            if (!$active.length) return;
            var li      = $active[0];
            var ul      = videos.querySelector('ul');
            var liTop   = li.offsetTop + (ul ? ul.offsetTop : 0);
            var liBot   = liTop + li.offsetHeight;
            var scrTop  = videos.scrollTop;
            var scrBot  = scrTop + videos.clientHeight;
            if (liTop < scrTop || liBot > scrBot) {
                var center = liTop - videos.clientHeight / 2 + li.offsetHeight / 2;
                videos.scrollTo({ top: Math.max(0, center), behavior: 'smooth' });
            }
        }, 60);
    },
};

// ── Точки входу ───────────────────────────────────────────
document.getElementById('toggle-overlay').addEventListener('click', function () {
    FS.enter();
});

document.addEventListener('keydown', function (e) {
    if (!FS._active) return;
    if (e.key === 'Escape')     { FS.exit(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); switchToPreviousEpisode(); FS._onActivity(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); switchToNextEpisode();     FS._onActivity(); }
});



$(document).on('click', '.playlists-videos li', function () {
    setTimeout(function () { FS.onEpisodeChange(); }, 50);
});


$(document).on('click', '.playlists-lists li', function () {
    setTimeout(function () { FS.onTabChange(); }, 60);
});