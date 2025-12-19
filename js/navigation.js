// Управление навигацией
const Navigation = {
    // Маппинг страниц (ДОБАВЛЯЕМ НОВЫЕ СТРАНИЦЫ)
    pages: {
        'main': 'pages/main.html',
        'support': 'pages/support.html',
        'first-line': 'pages/first-line.html',
        'second-line': 'pages/second-line.html',
        'restaurants': 'pages/restaurants.html',
        'cash-servers': 'pages/cash-servers.html',
        'cash-registers': 'pages/cash-registers.html',
        'cash-details': 'pages/cash-details.html',
        'manager-pcs': 'pages/manager-pcs.html',
        'music-pcs': 'pages/music-pcs.html',
        'device-details': 'pages/device-details.html',
        'service-printers': 'pages/service-printers.html',
        'printer-departments': 'pages/printer-departments.html',
        'printer-details': 'pages/printer-details.html',
        'cash-server-management': 'pages/cash-server-management.html',
        'cash-server-services': 'pages/cash-server-services.html',
        'service-management': 'pages/service-management.html',
        'services-status': 'pages/services-status.html',
        'services': 'pages/services.html',
        'service-management-global': 'pages/service-management-global.html',
        'crm-services': 'pages/crm-services.html',
        'calendar': 'pages/calendar.html'
    },

    // Заголовки страниц (ДОБАВЛЯЕМ НОВЫЕ ЗАГОЛОВКИ)
    pageTitles: {
        'main': 'Главная страница',
        'support': 'Служба поддержки',
        'first-line': '1st Line - Выбор раздела',
        'second-line': '2nd Line - Системы',
        'restaurants': 'Управление ресторанами',
        'cash-servers': 'Кассовые серверы',
        'cash-registers': 'Управление кассами',
        'cash-details': 'Детали кассы',
        'manager-pcs': 'ПК Менеджера',
        'music-pcs': 'Музыкальные моноблоки',
        'device-details': 'Управление устройством',
        'service-printers': 'Сервис принтеры',
        'printer-departments': 'Выбор цеха',
        'printer-details': 'Управление принтером',
        'cash-server-management': 'Управление сервером',
        'cash-server-services': 'Службы сервера',
        'service-management': 'Управление службой',
        'services-status': 'Статус служб',
        'services': 'Службы',
        'service-management-global': 'Управление службой',
        'crm-services': 'Службы CRM',
        'calendar': 'Календарь дежурств'
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

   // Инициализация логики страницы после загрузки (ОБНОВЛЯЕМ С ПРОВЕРКАМИ)
initializePage: function(pageId) {
    switch(pageId) {
        case 'cash-registers':
            console.log('🔄 Инициализация страницы касс...');
            if (typeof CashManager !== 'undefined') {
                CashManager.initializeCashList();
            }
            break;
            case 'second-line':
            console.log('🔄 Инициализация страницы second-line...');
            // Привязываем кнопку ERP после загрузки страницы
            setTimeout(() => {
                if (typeof ERPHandler !== 'undefined' && ERPHandler.bindERPButton) {
                    ERPHandler.bindERPButton();
                }
            }, 100);
            break;
        case 'cash-details':
            console.log('🔄 Инициализация страницы деталей кассы...');
            if (typeof CashManager !== 'undefined') {
                CashManager.loadCashDetails();
            }
            break;
        case 'manager-pcs':
            console.log('🔄 Инициализация страницы ПК менеджера...');
            if (typeof PCManager !== 'undefined' && PCManager.initialize) {
                PCManager.initialize(PCManager.deviceTypes.MANAGER_PC);
            }
            break;
        case 'music-pcs':
            console.log('🔄 Инициализация страницы музыкальных моноблоков...');
            if (typeof PCManager !== 'undefined' && PCManager.initialize) {
                PCManager.initialize(PCManager.deviceTypes.MUSIC_PC);
            }
            break;
        case 'device-details':
            console.log('🔄 Инициализация страницы деталей устройства...');
            this.initializeDeviceDetailsPage();
            break;
        case 'service-printers':
            console.log('🔄 Инициализация страницы сервис принтеров...');
            if (typeof PrinterManager !== 'undefined' && PrinterManager.initialize) {
                PrinterManager.initialize();
            } else {
                console.error('❌ PrinterManager не доступен');
            }
            break;
        case 'printer-departments':
            console.log('🔄 Инициализация страницы выбора цеха...');
            if (typeof PrinterManager !== 'undefined' && PrinterManager.loadDepartmentsPage) {
                PrinterManager.loadDepartmentsPage();
            }
            break;
        case 'printer-details':
            console.log('🔄 Инициализация страницы деталей принтера...');
            if (typeof PrinterManager !== 'undefined' && PrinterManager.loadPrinterDetails) {
                PrinterManager.loadPrinterDetails();
            }
            break;
        case 'restaurants':
            console.log('🔄 Инициализация страницы ресторанов...');
            break;
             case 'cash-servers':
                console.log('🔄 Инициализация страницы кассовых серверов...');
                if (typeof CashServerManager !== 'undefined' && CashServerManager.initialize) {
                    CashServerManager.initialize();
                }
                break;
            case 'cash-server-management':
                console.log('🔄 Инициализация страницы управления сервером...');
                if (typeof CashServerManager !== 'undefined' && CashServerManager.loadServerManagementPage) {
                    CashServerManager.loadServerManagementPage();
                }
                break;
            case 'cash-server-services':
                console.log('🔄 Инициализация страницы служб сервера...');
                if (typeof CashServerManager !== 'undefined' && CashServerManager.loadServicesPage) {
                    CashServerManager.loadServicesPage();
                }
                break;
            case 'service-management':
                console.log('🔄 Инициализация страницы управления службой...');
                if (typeof CashServerManager !== 'undefined' && CashServerManager.loadServiceManagementPage) {
                    CashServerManager.loadServiceManagementPage();
                }
                break;
            case 'services-status':
                console.log('🔄 Инициализация страницы статуса служб...');
                if (typeof CashServerManager !== 'undefined' && CashServerManager.loadServicesStatusPage) {
                    CashServerManager.loadServicesStatusPage();
                }
                break;
             case 'services':
                console.log('🔄 Инициализация страницы служб...');
                // Страница не требует специальной инициализации
                break;
            case 'crm-services':
                console.log('🔄 Инициализация страницы служб CRM...');
                if (typeof ServicesManager !== 'undefined' && ServicesManager.loadCrmServicesPage) {
                    ServicesManager.loadCrmServicesPage();
                }
                break;
            case 'service-management-global':
                console.log('🔄 Инициализация страницы управления глобальной службой...');
                if (typeof ServicesManager !== 'undefined' && ServicesManager.loadServiceManagementPage) {
                    ServicesManager.loadServiceManagementPage();
                }
                break;
            case 'calendar':
                console.log('🔄 Инициализация страницы календаря...');
                if (typeof CalendarManager !== 'undefined' && CalendarManager.loadCalendarPage) {
                    CalendarManager.loadCalendarPage();
                }
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