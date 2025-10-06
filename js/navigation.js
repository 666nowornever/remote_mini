// Управление навигацией
const Navigation = {
    // Маппинг страниц
    pages: {
        'main': 'pages/main.html',
        'first-line': 'pages/first-line.html',
        'second-line': 'pages/second-line.html',
        'restaurants': 'pages/restaurants.html',
        'cash-servers': 'pages/cash-servers.html',
        'cash-registers': 'pages/cash-registers.html',
        'cash-details': 'pages/cash-details.html',
        'manager-pcs': 'pages/manager-pcs.html',
        'music-pcs': 'pages/music-pcs.html',
        'device-details': 'pages/device-details.html'
    },

    // Заголовки страниц
    pageTitles: {
        'main': 'Главная страница',
        'first-line': '1st Line - Выбор раздела',
        'second-line': '2nd Line - Системы',
        'restaurants': 'Управление ресторанами',
        'cash-servers': 'Кассовые серверы',
        'cash-registers': 'Управление кассами',
        'cash-details': 'Детали кассы',
        'manager-pcs': 'ПК Менеджера',
        'music-pcs': 'Музыкальные моноблоки',
        'device-details': 'Управление устройством'
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
                console.log('🔄 Инициализация страницы касс...');
                if (typeof CashManager !== 'undefined') {
                    CashManager.initializeCashList();
                }
                break;
            case 'cash-details':
                console.log('🔄 Инициализация страницы деталей кассы...');
                if (typeof CashManager !== 'undefined') {
                    CashManager.loadCashDetails();
                }
                break;
            case 'manager-pcs':
                console.log('🔄 Инициализация страницы ПК менеджера...');
                if (typeof PCManager !== 'undefined') {
                    PCManager.initialize(PCManager.deviceTypes.MANAGER_PC);
                }
                break;
            case 'music-pcs':
                console.log('🔄 Инициализация страницы музыкальных моноблоков...');
                if (typeof PCManager !== 'undefined') {
                    PCManager.initialize(PCManager.deviceTypes.MUSIC_PC);
                }
                break;
            case 'device-details':
                console.log('🔄 Инициализация страницы деталей устройства...');
                this.initializeDeviceDetailsPage();
                break;
            case 'restaurants':
                console.log('🔄 Инициализация страницы ресторанов...');
                break;
        }
    },

    // Инициализация страницы деталей устройства
    initializeDeviceDetailsPage: function() {
        if (typeof PCManager !== 'undefined') {
            PCManager.loadDeviceDetails();
        }
        
        // Инициализируем кнопку "Назад" после загрузки страницы
        this.initializeBackButton();
    },

    // Инициализация кнопки "Назад" для страницы device-details
    initializeBackButton: function() {
        const backBtn = document.getElementById('deviceBackBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.handleDeviceDetailsBack();
            });
        }
    },

    // Обработка кнопки "Назад" на странице device-details
    handleDeviceDetailsBack: function() {
        const deviceType = sessionStorage.getItem('selectedDeviceType');
        
        if (deviceType === 'manager_pc') {
            this.showPage('manager-pcs');
        } else if (deviceType === 'music_pc') {
            this.showPage('music-pcs');
        } else {
            // По умолчанию возвращаем в рестораны
            this.showPage('restaurants');
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
