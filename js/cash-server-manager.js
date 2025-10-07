// Менеджер управления кассовыми серверами
const CashServerManager = {
    // Список кассовых серверов
    servers: [
        "rk01-active", "rk02-active", "rk03-active", "rk04-active", "rk05-active",
        "rk06-active", "rk07-active", "rk08-active", "rk09-active", "rk10-active",
        "rk11-active", "rk12-active", "rk13-active", "rk14-active", "rk15-active",
        "rk15p-active", "rk16-active", "rk17-active", "rk18-active", "rk19-active",
        "rk20-active", "rk21-active", "rk22-active", "rk23-active", "rk24-active",
        "rk25-active", "rk26-active", "rk27-active", "rk28-active", "rk29-active",
        "rk30-active", "rk31-active", "rk32-active", "rk33-active", "rk34-active",
        "rk35-active", "rk36-active", "rk37-active", "rk38-active", "rk39-active",
        "rk40-active", "rk41-active", "rk42-active", "rk43-active", "rk44-active",
        "rk45-active", "rk46-active", "rk47-active", "rk48-active", "sk-test"
    ],

    // Список служб
    services: [
        { id: 'midserv', name: 'MidServ', displayName: 'MidServ' },
        { id: 'winprint', name: 'WinPrint', displayName: 'WinPrint' },
        { id: 'farcards_egais', name: 'Farcards EGAIS', displayName: 'Farcards EGAIS' },
        { id: 'farcards', name: 'FarCards', displayName: 'FarCards' },
        { id: 'qrpay', name: 'QRpay', displayName: 'QRpay' }
    ],

    // Текущий выбранный сервер
    selectedServer: null,

    // Инициализация менеджера
    init: function() {
        console.log('🔄 CashServerManager: инициализация...');
    },

    // Метод для совместимости с navigation.js
    initialize: function() {
        console.log('🔄 CashServerManager: инициализация списка серверов...');
        this.initializeServersList();
    },

    // Инициализация списка серверов
    initializeServersList: function() {
        const listContainer = document.getElementById('cashServersList');
        if (!listContainer) {
            console.error('❌ CashServerManager: контейнер cashServersList не найден');
            return;
        }

        listContainer.innerHTML = '';

        this.servers.forEach((server, index) => {
            const serverItem = document.createElement('div');
            serverItem.className = 'server-item cash-server-item';
            
            serverItem.innerHTML = `
                <div class="server-name cash-server-name-centered">
                    <span class="server-address">${server}</span>
                </div>
            `;
            serverItem.addEventListener('click', () => this.selectServer(server));
            listContainer.appendChild(serverItem);
        });

        console.log(`✅ CashServerManager: загружено ${this.servers.length} серверов`);
    },

    // Выбор сервера
    selectServer: function(serverName) {
        this.selectedServer = serverName;
        
        // Сохраняем выбранный сервер в sessionStorage
        sessionStorage.setItem('selectedCashServer', serverName);
        
        // Переходим на страницу управления сервером
        Navigation.showPage('cash-server-management');
    },

    // Загрузка страницы управления сервером
    loadServerManagementPage: function() {
        const serverName = sessionStorage.getItem('selectedCashServer');
        if (!serverName) {
            Navigation.showPage('cash-servers');
            return;
        }

        this.selectedServer = serverName;

        // Обновляем заголовок
        const titleElement = document.getElementById('serverManagementTitle');
        if (titleElement) {
            titleElement.textContent = `Управление сервером: ${serverName}`;
        }
    },

    // Открытие страницы служб
    openServicesPage: function() {
        Navigation.showPage('cash-server-services');
    },

    // Загрузка страницы служб
    loadServicesPage: function() {
        const serverName = sessionStorage.getItem('selectedCashServer');
        if (!serverName) {
            Navigation.showPage('cash-server-management');
            return;
        }

        this.selectedServer = serverName;

        // Обновляем заголовок
        const titleElement = document.getElementById('servicesTitle');
        if (titleElement) {
            titleElement.textContent = `Службы сервера: ${serverName}`;
        }
    },

    // Выбор службы
    selectService: function(service) {
        this.selectedService = service;
        
        // Сохраняем выбранную службу в sessionStorage
        sessionStorage.setItem('selectedService', JSON.stringify(service));
        
        // Переходим на страницу управления службой
        Navigation.showPage('service-management');
    },

    // Загрузка страницы управления службой
    loadServiceManagementPage: function() {
        const serverName = sessionStorage.getItem('selectedCashServer');
        const serviceData = sessionStorage.getItem('selectedService');
        
        if (!serverName || !serviceData) {
            Navigation.showPage('cash-server-services');
            return;
        }

        this.selectedServer = serverName;
        this.selectedService = JSON.parse(serviceData);

        // Обновляем заголовок
        const titleElement = document.getElementById('serviceManagementTitle');
        if (titleElement) {
            titleElement.textContent = `${this.selectedService.displayName} - ${serverName}`;
        }

        // Проверяем статус службы
        this.checkServiceStatus();
    },

    // Проверка статуса службы
    checkServiceStatus: function() {
        const statusElement = document.getElementById('serviceStatus');
        if (!statusElement) return;
        
        // Имитация проверки статуса
        statusElement.innerHTML = '<i class="fas fa-sync fa-spin"></i> Проверка статуса...';
        
        setTimeout(() => {
            // Случайный статус для демонстрации
            const statuses = ['Running', 'Stopped', 'Paused', 'Starting'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            let statusIcon = 'fa-question-circle';
            let statusColor = '#ff9800';
            
            switch(randomStatus) {
                case 'Running':
                    statusIcon = 'fa-check-circle';
                    statusColor = '#4CAF50';
                    break;
                case 'Stopped':
                    statusIcon = 'fa-times-circle';
                    statusColor = '#f44336';
                    break;
                case 'Paused':
                    statusIcon = 'fa-pause-circle';
                    statusColor = '#ff9800';
                    break;
                case 'Starting':
                    statusIcon = 'fa-play-circle';
                    statusColor = '#2196F3';
                    break;
            }
            
            statusElement.innerHTML = `<i class="fas ${statusIcon}" style="color: ${statusColor}"></i> Статус: ${randomStatus}`;
            statusElement.className = 'service-status';
        }, 1500);
    },

    // Команда RESTART для службы
    restartService: function() {
        if (!this.selectedService) return;

        this.addToServiceLog(`🔄 Перезапуск службы ${this.selectedService.displayName}...`);
        
        // Имитация перезапуска службы
        setTimeout(() => {
            this.addToServiceLog(`✅ Служба ${this.selectedService.displayName} перезапущена`, 'success');
            
            // Обновляем статус после перезапуска
            setTimeout(() => {
                this.checkServiceStatus();
            }, 1000);
        }, 2000);
    },

    // Команда START для службы
    startService: function() {
        if (!this.selectedService) return;

        this.addToServiceLog(`🔄 Запуск службы ${this.selectedService.displayName}...`);
        
        // Имитация запуска службы
        setTimeout(() => {
            this.addToServiceLog(`✅ Служба ${this.selectedService.displayName} запущена`, 'success');
            
            // Обновляем статус после запуска
            setTimeout(() => {
                this.checkServiceStatus();
            }, 1000);
        }, 2000);
    },

    // Команда STOP для службы
    stopService: function() {
        if (!this.selectedService) return;

        this.addToServiceLog(`🔄 Остановка службы ${this.selectedService.displayName}...`);
        
        // Имитация остановки службы
        setTimeout(() => {
            this.addToServiceLog(`✅ Служба ${this.selectedService.displayName} остановлена`, 'success');
            
            // Обновляем статус после остановки
            setTimeout(() => {
                this.checkServiceStatus();
            }, 1000);
        }, 2000);
    },

    // Команда STATUS для службы
    checkServiceStatusAction: function() {
        if (!this.selectedService) return;

        this.addToServiceLog(`🔍 Проверка статуса службы ${this.selectedService.displayName}...`);
        this.checkServiceStatus();
    },

    // Открытие страницы статуса всех служб
    openServicesStatusPage: function() {
        Navigation.showPage('services-status');
    },

    // Загрузка страницы статуса всех служб
    loadServicesStatusPage: function() {
        const serverName = sessionStorage.getItem('selectedCashServer');
        if (!serverName) {
            Navigation.showPage('cash-server-management');
            return;
        }

        this.selectedServer = serverName;

        // Обновляем заголовок
        const titleElement = document.getElementById('servicesStatusTitle');
        if (titleElement) {
            titleElement.textContent = `Статус служб сервера: ${serverName}`;
        }

        // Проверяем статус всех служб
        this.checkAllServicesStatus();
    },

    // Проверка статуса всех служб
    checkAllServicesStatus: function() {
        const statusContainer = document.getElementById('allServicesStatus');
        if (!statusContainer) return;
        
        // Имитация проверки статуса всех служб
        statusContainer.innerHTML = '<div class="loading-status"><i class="fas fa-sync fa-spin"></i> Проверка статуса служб...</div>';
        
        setTimeout(() => {
            let statusHTML = '';
            
            this.services.forEach(service => {
                // Случайный статус для демонстрации
                const statuses = ['Running', 'Stopped', 'Paused'];
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                
                let statusIcon = 'fa-question-circle';
                let statusColor = '#ff9800';
                
                switch(randomStatus) {
                    case 'Running':
                        statusIcon = 'fa-check-circle';
                        statusColor = '#4CAF50';
                        break;
                    case 'Stopped':
                        statusIcon = 'fa-times-circle';
                        statusColor = '#f44336';
                        break;
                    case 'Paused':
                        statusIcon = 'fa-pause-circle';
                        statusColor = '#ff9800';
                        break;
                }
                
                statusHTML += `
                    <div class="service-status-item">
                        <div class="service-status-name">${service.displayName}</div>
                        <div class="service-status-value" style="color: ${statusColor}">
                            <i class="fas ${statusIcon}"></i> ${randomStatus}
                        </div>
                    </div>
                `;
            });
            
            statusContainer.innerHTML = statusHTML;
        }, 2000);
    },

    // Команда PING для сервера
    pingServer: function() {
        if (!this.selectedServer) return;

        this.addToLog(`🔄 Отправка PING на ${this.selectedServer}...`);
        
        // Имитация PING запроса
        setTimeout(() => {
            const success = Math.random() > 0.2;
            if (success) {
                this.addToLog(`✅ PING успешен! ${this.selectedServer} отвечает`, 'success');
            } else {
                this.addToLog(`❌ PING неудачен! ${this.selectedServer} не отвечает`, 'error');
            }
        }, 2000);
    },

    // Команда RESTART для сервера
    restartServer: function() {
        if (!this.selectedServer) return;

        // Подтверждение перезагрузки
        if (confirm(`Вы уверены, что хотите перезагрузить сервер ${this.selectedServer}?`)) {
            this.addToLog(`🔄 Запуск перезагрузки ${this.selectedServer}...`);
            
            // Имитация перезагрузки
            setTimeout(() => {
                this.addToLog(`✅ Команда перезагрузки отправлена на ${this.selectedServer}`, 'success');
            }, 1500);
        }
    },

    // Добавление сообщения в лог управления сервером
    addToLog: function(message, type = 'info') {
        const logElement = document.getElementById('serverActionLog');
        if (!logElement) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    },

    // Добавление сообщения в лог управления службой
    addToServiceLog: function(message, type = 'info') {
        const logElement = document.getElementById('serviceActionLog');
        if (!logElement) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
};

// Инициализация CashServerManager при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof CashServerManager !== 'undefined' && CashServerManager.init) {
        CashServerManager.init();
    }
});