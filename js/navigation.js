// Управление навигацией
const Navigation = {
    // Маппинг страниц
    pages: {
        'main': 'pages/main.html',
        'first-line': 'pages/first-line.html',
        'second-line': 'pages/second-line.html',
        'restaurants': 'pages/restaurants.html',
        'cash-servers': 'pages/cash-servers.html',
        'cash-registers': 'pages/cash-registers.html' // ДОБАВЛЯЕМ ЭТУ СТРОКУ
    },

    // Заголовки страниц
    pageTitles: {
        'main': 'Главная страница',
        'first-line': '1st Line - Выбор раздела',
        'second-line': '2nd Line - Системы',
        'restaurants': 'Управление ресторанами',
        'cash-servers': 'Кассовые серверы',
        'cash-registers': 'Управление кассами' // ДОБАВЛЯЕМ ЭТУ СТРОКУ
    },

    // Показать страницу
    showPage: function(pageId) {
        const pageUrl = this.pages[pageId];
        if (!pageUrl) {
            console.error('Страница не найдена:', pageId);
            return;
        }

        // Загружаем страницу
        this.loadPage(pageUrl, pageId);
    },

    // Загрузить страницу
    loadPage: function(url, pageId) {
        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Страница не найдена');
                return response.text();
            })
            .then(html => {
                document.getElementById('page-content').innerHTML = html;
                this.updateHeader(pageId);
                this.animatePage();
                
                // После загрузки страницы инициализируем её логику
                this.initializePage(pageId);
            })
            .catch(error => {
                console.error('Ошибка загрузки страницы:', error);
            });
    },

    // Инициализация логики страницы после загрузки
    initializePage: function(pageId) {
        switch(pageId) {
            case 'cash-registers':
                // Здесь можно добавить логику для страницы касс
                console.log('🔄 Инициализация страницы касс...');
                break;
            case 'restaurants':
                // Логика для страницы ресторанов
                console.log('🔄 Инициализация страницы ресторанов...');
                break;
            // Добавьте другие страницы по необходимости
        }
    },

    // Обновить заголовок
    updateHeader: function(pageId) {
        const subtitle = this.pageTitles[pageId] || 'Remote mini';
        const subtitleElement = document.querySelector('.header .subtitle');
        if (subtitleElement) {
            subtitleElement.textContent = subtitle;
        }
    },

    // Анимация появления страницы
    animatePage: function() {
        const elements = document.querySelectorAll('.btn, .card, .server-item');
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                el.style.transition = 'all 0.5s ease';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }
};
