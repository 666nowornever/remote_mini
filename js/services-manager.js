// Менеджер управления службами RkDexch и CRM
const ServicesManager = {
    // Текущая выбранная служба
    selectedService: null,

    // Инициализация менеджера
    init: function() {
        console.log('🔄 ServicesManager: инициализация...');
    },

    // Выбор службы
    selectService: function(serviceName, serviceDisplayName) {
        this.selectedService = {
            name: serviceName,
            displayName: serviceDisplayName
        };
        
        // Сохраняем выбранную службу в sessionStorage
        sessionStorage.setItem('selectedService', JSON.stringify(this.selectedService));
        
        // Переходим на страницу управления службой
        Navigation.showPage('service-management-global');
    },

    // Загрузка страницы управления службой
    loadServiceManagementPage: function() {
        const serviceData = sessionStorage.getItem('selectedService');
        
        if (!serviceData) {
            Navigation.showPage('services');
            return;
        }

        this.selectedService = JSON.parse(serviceData);

        // Обновляем заголовок
        const titleElement = document.getElementById('globalServiceManagementTitle');
        if (titleElement) {
            titleElement.textContent = `Управление службой: ${this.selectedService.displayName}`;
        }

        // Проверяем статус службы
        this.checkServiceStatus();
    },

    // Проверка статуса службы
    checkServiceStatus: function() {
        const statusElement = document.getElementById('globalServiceStatus');
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

    // Добавление сообщения в лог
    addToServiceLog: function(message, type = 'info') {
        const logElement = document.getElementById('globalServiceActionLog');
        if (!logElement) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
};

// Инициализация ServicesManager при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ServicesManager !== 'undefined' && ServicesManager.init) {
        ServicesManager.init();
    }
});