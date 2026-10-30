(function($) {
    $.fn.extend({
        elegantcarousel: function(options) {
            // Значення за замовчуванням
            const defaults = {
                delay: 150,
                fade: 300,
                slide: 500,
                effect: 'fade',
                orientation: 'horizontal',
                captionFade: 150,
                loop: false,
                autoplay: true,
                time: 40000
            };
            
            // Об'єднання налаштувань користувача з налаштуваннями за замовчуванням
            const settings = $.extend(defaults, options);
            
            return this.each(function() {
                // Основні змінні
                const carousel = this;
                const $carousel_container = $(carousel).find('.carousel_container');
                const $items = $carousel_container.find('ul li');
                const $prev = $(carousel).find('.carousel_prev');
                const $next = $(carousel).find('.carousel_next');
                let interval;
                let isPageVisible = true; // змінна для відстеження видимості сторінки
                
                // Розміри елементів
                const visible_width = parseInt($carousel_container.css('width'), 10);
                const visible_height = parseInt($carousel_container.css('height'), 10);
                const item_width = parseInt($items.css('width'), 10);
                const item_height = parseInt($items.css('height'), 10);
                const item_marginRight = parseInt($items.css('marginRight'), 10);
                const item_marginLeft = parseInt($items.css('marginLeft'), 10);
                const item_marginTop = parseInt($items.css('marginTop'), 10);
                const item_marginBottom = parseInt($items.css('marginBottom'), 10);
                
                // Розрахунки видимих елементів і слайдів
                const total_items = $items.length;
                const visible_items = (settings.orientation === 'horizontal')
                    ? Math.ceil(visible_width / (item_width + item_marginRight + item_marginLeft))
                    : Math.ceil(visible_height / (item_height + item_marginTop + item_marginBottom));
                const total_slides = Math.ceil(total_items / visible_items);
                const animation_easing = "easeInOutQuart";
                
                // Ініціалізація
                function initialize() {
                    setupItemClasses();
                    updateNavigationState();
                    
                    if (settings.effect === 'slide') {
                        setupItemPositions();
                    }
                    
                    bindEvents();
                    
                    if (settings.autoplay && isPageVisible) {
                        startAutoplay();
                    }
                }
                
                // Встановлення класів видимості для елементів
                function setupItemClasses() {
                    $items.each(function(index) {
                        const class_number = Math.floor((index + visible_items) / visible_items);
                        $(this).addClass('visible_' + class_number);
                        $(this).css('display', class_number === 1 ? 'block' : 'none');
                        $(this).find('.inner').css('display', class_number === 1 ? 'block' : 'none');
                    });
                }
                
                // Оновлення стану кнопок навігації
function updateNavigationState() {
    const $visible = $carousel_container.find('ul li:visible');
    const visible_item_class = $visible.attr('class');
    
    if (!visible_item_class) {
        // Немає видимого елемента — примусово показуємо перший слайд
        $carousel_container.find('li.visible_1').css('display', 'block');
        $carousel_container.find('li.visible_1 .inner').css('display', 'block');
        return;
    }
    
    const visible_id = visible_item_class.split('_')[1];
    
    if (!settings.loop) {
        $prev.toggleClass('disable', visible_id === '1');
        $next.toggleClass('disable', visible_id == total_slides);
    }
}
                
                // Встановлення позицій елементів для ефекту слайду
                function setupItemPositions() {
                    $items.each(function() {
                        $(this).css('display', 'none').css('position', 'absolute');
                        if (settings.orientation === 'horizontal') {
                            $(this).css({
                                top: '0',
                                left: visible_width + parseInt($carousel_container.css('paddingLeft')) + parseInt($carousel_container.css('paddingRight'), 10)
                            });
                        } else {
                            $(this).css({
                                left: '0',
                                top: visible_height + parseInt($carousel_container.css('paddingTop')) + parseInt($carousel_container.css('paddingBottom'), 10)
                            });
                        }
                    });
                    
                    $carousel_container.find("li.visible_1").each(function(index) {
                        $(this).css('display', 'block');
                        const position = (settings.orientation === 'horizontal')
                            ? (index * (item_width + item_marginRight + item_marginLeft)) + parseInt($carousel_container.css('paddingLeft'), 10)
                            : (index * (item_height + item_marginTop + item_marginBottom)) + parseInt($carousel_container.css('paddingTop'), 10);
                        
                        if (settings.orientation === 'horizontal') {
                            $(this).css({ left: position });
                        } else {
                            $(this).css({ top: position });
                        }
                    });
                }
                
                // Показ наступного/попереднього слайду
                function showSlide(direction) {
                    if (!isPageVisible) return; // Не запускати анімацію, якщо сторінка не видима
                    
                    const visible_item_class = $carousel_container.find("li:visible").attr('class');
                    const visible_id = parseInt(visible_item_class.split('_')[1], 10);
                    
                    let target_id;
                    if (direction === 'next') {
                        target_id = (visible_id === total_slides) ? 1 : visible_id + 1;
                    } else {
                        target_id = (visible_id === 1) ? total_slides : visible_id - 1;
                    }
                    
                    switch (settings.effect) {
                        case 'fade':
                            fadeTransition(visible_item_class, target_id, direction);
                            break;
                        case 'slide':
                            slideTransition(visible_item_class, target_id, direction);
                            break;
                    }
                }
                
                // Ефект переходу "fade"
                function fadeTransition(visible_class, target_id, direction) {
                    $carousel_container.find("li:visible").each(function(index) {
                        const delay = (direction === 'prev')
                            ? index * settings.delay  // Змінено для правильної анімації при натисканні "prev"
                            : index * settings.delay;
                        
                        $(this).find('.inner').delay(delay).fadeOut(settings.fade, function() {
                            if (index + 1 === $carousel_container.find("li." + visible_class).length) {
                                $('li.' + visible_class).css('display', 'none');
                                showItemsWithFade(target_id, direction);
                            }
                        });
                    });
                }
                
                // Показ елементів з ефектом "fade"
                function showItemsWithFade(id, direction) {
                    const target_class = 'visible_' + id;
                    $carousel_container.find("li." + target_class).css('display', 'block').each(function(index) {
                        const delay = (direction === 'prev')
                            ? index * settings.delay  // Змінено для правильної анімації при натисканні "prev"
                            : index * settings.delay;
                        
                        $(this).find('.inner').delay(delay).fadeIn(settings.fade, function() {
                            if (index + 1 === visible_items || id === total_slides) {
                                updateNavigationState();
                            }
                        });
                    });
                }
                
                // Ефект переходу "slide"
                function slideTransition(visible_class, target_id, direction) {
                    // Підготовка попереднього класу для slide
                    $carousel_container.find("li.visible_" + ((direction === 'next') ? target_id - 2 : target_id + 2)).each(function() {
                        const position = (settings.orientation === 'horizontal')
                            ? (direction === 'next'
                                ? visible_width + parseInt($carousel_container.css('paddingLeft'), 10) + parseInt($carousel_container.css('paddingRight'), 10)
                                : '-' + item_width + 'px')
                            : (direction === 'next'
                                ? visible_height + parseInt($carousel_container.css('paddingTop'), 10) + parseInt($carousel_container.css('paddingBottom'), 10)
                                : '-' + item_height + 'px');
                        
                        if (settings.orientation === 'horizontal') {
                            $(this).css({ left: position });
                        } else {
                            $(this).css({ top: position });
                        }
                    });
                    
                    // Анімація поточних елементів
                    $carousel_container.find("li." + visible_class).each(function(index) {
                        const delay = (direction === 'prev')
                            ? index * settings.delay  // Змінено для правильної анімації при натисканні "prev"
                            : index * settings.delay;
                        
                        const zindex = index + 10;
                        $(this).css('z-index', zindex);
                        
                        const position = (settings.orientation === 'horizontal')
                            ? (direction === 'next'
                                ? '-' + item_width
                                : visible_width + parseInt($carousel_container.css('paddingLeft'), 10) + parseInt($carousel_container.css('paddingRight'), 10))
                            : (direction === 'next'
                                ? '-' + item_height
                                : visible_height + parseInt($carousel_container.css('paddingTop'), 10) + parseInt($carousel_container.css('paddingBottom'), 10));
                        
                        const animationProps = settings.orientation === 'horizontal'
                            ? { left: position }
                            : { top: position };
                        
                        $(this).delay(delay).animate(animationProps, settings.slide, animation_easing, function() {
                            if (index + 1 === $carousel_container.find("li." + visible_class).length) {
                                $('li.' + visible_class).css('display', 'none');
                                showItemsWithSlide(target_id, direction);
                            }
                        });
                    });
                }
                
                // Показ елементів з ефектом "slide"
                function showItemsWithSlide(id, direction) {
                    const target_class = 'visible_' + id;
                    
                    $carousel_container.find("li." + target_class).css('display', 'block');
                    $carousel_container.find("li." + target_class + " .inner").css('display', 'block');
                    
                    $carousel_container.find("li." + target_class).each(function(index) {
                        const delay = (direction === 'prev')
                            ? index * settings.delay  // Змінено для правильної анімації при натисканні "prev"
                            : index * settings.delay;
                        
                        if (settings.orientation === 'horizontal') {
                            const left_position = (index * (item_width + item_marginRight + item_marginLeft)) + parseInt($carousel_container.css('paddingLeft'), 10);
                            
                            $(this).delay(delay).animate({ left: left_position }, settings.slide, animation_easing, function() {
                                if (index + 1 === visible_items || id === total_slides) {
                                    updateNavigationState();
                                }
                            });
                        } else {
                            const top_position = (index * (item_height + item_marginTop + item_marginBottom)) + parseInt($carousel_container.css('paddingTop'), 10);
                            
                            $(this).delay(delay).animate({ top: top_position }, settings.slide, animation_easing, function() {
                                if (index + 1 === visible_items || id === total_slides) {
                                    updateNavigationState();
                                }
                            });
                        }
                    });
                }
                
                // Запуск автоматичного відтворення
                function startAutoplay() {
                    if (settings.autoplay && isPageVisible) {
                        clearInterval(interval); // Очищення попереднього інтервалу
                        interval = setInterval(function() {
                            const visible_item_class = $carousel_container.find("li:visible").attr('class');
                            const visible_id = visible_item_class.split('_')[1];
                            
                            if (!settings.loop && visible_id == total_slides) {
                                clearInterval(interval);
                            } else {
                                showSlide('next');
                            }
                        }, settings.time);
                    }
                }
                
                // Зупинка автоматичного відтворення
                function stopAutoplay() {
                    clearInterval(interval);
                }
                
                // Прив'язка подій
                function bindEvents() {
                    // Кнопки навігації
                    $next.on('click', function(e) {
                        e.preventDefault();
                        stopAutoplay();
                        showSlide('next');
                        if (settings.autoplay && isPageVisible) {
                            startAutoplay();
                        }
                    });
                    
                    $prev.on('click', function(e) {
                        e.preventDefault();
                        stopAutoplay();
                        showSlide('prev');
                        if (settings.autoplay && isPageVisible) {
                            startAutoplay();
                        }
                    });
                    
                    // Ефекти підписів при наведенні
                    $items.hover(
                        function() {
                            stopAutoplay();
                            $(this).find('.caption').fadeIn(settings.captionFade);
                        },
                        function() {
                            $(this).find('.caption').fadeOut(settings.captionFade);
                            if (settings.autoplay && isPageVisible) {
                                startAutoplay();
                            }
                        }
                    );
                    
                    // Відновлення автоматичного відтворення при виведенні миші
                    $(carousel).on('mouseleave', function() {
                        if (settings.autoplay && isPageVisible) {
                            startAutoplay();
                        }
                    });
                    
                    // Моніторинг видимості сторінки
                    document.addEventListener('visibilitychange', function() {
                        isPageVisible = !document.hidden;
                        
                        if (!isPageVisible) {
                            stopAutoplay();
                        } else if (settings.autoplay) {
                            startAutoplay();
                        }
                    });
                    
                    // Зупинка анімації при втраті фокусу вікном
                    $(window).on('blur', function() {
                        isPageVisible = false;
                        stopAutoplay();
                    });
                    
                    // Відновлення анімації при поверненні фокусу
                    $(window).on('focus', function() {
                        isPageVisible = true;
                        if (settings.autoplay) {
                            startAutoplay();
                        }
                    });
                }
                
                // Запуск ініціалізації
                initialize();
            });
        }
    });
})(jQuery);