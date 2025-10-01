const Navigation = {
    // Маппинг страниц
    pages: {
        'main': 'pages/main.html',
        'first-line': 'pages/first-line.html',
        'second-line': 'pages/second-line.html',
        'restaurants': 'pages/restaurants.html',
        'cash-registers': 'pages/cash-registers.html',
        'cash-details': 'pages/cash-details.html',
        'cash-servers': 'pages/cash-servers.html'
    },

    // Заголовки страниц
    pageTitles: {
        'main': 'Главная страница',
        'first-line': '1st Line - Выбор раздела',
        'second-line': '2nd Line - Системы',
        'restaurants': 'Управление ресторанами',
        'cash-registers': 'Управление кассами',
        'cash-details': 'Детали кассы',
        'cash-servers': 'Кассовые серверы'
    },

    // Показать страницу
    showPage: function(pageId) {
        const pageUrl = this.pages[pageId];
        if (!pageUrl) {
            console.error('Страница не найдена:', pageId);
            return;
        }

        this.loadPage(pageUrl, pageId);
        
        // Специальная инициализация для некоторых страниц
        if (pageId === 'cash-registers') {
            setTimeout(() => CashManager.initializeCashList(), 100);
        } else if (pageId === 'cash-details') {
            setTimeout(() => CashManager.loadCashDetails(), 100);
        }
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
                this.animatePage();
            })
            .catch(error => {
                console.error('Ошибка загрузки страницы:', error);
            });
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
