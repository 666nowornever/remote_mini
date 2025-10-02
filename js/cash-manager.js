// Менеджер управления кассами
const CashManager = {
    // Список касс с разделителями
    cashRegisters: [
        "10.0.1.10", "10.0.1.11", "10.0.1.12", "10.0.1.13", "",
        "10.0.2.10", "10.0.2.11", "10.0.2.12", "",
        "10.0.3.10", "10.0.3.11", "",
        "10.0.4.10", "10.0.4.11", "10.0.4.12", "10.0.4.13", "10.0.4.14", "",
        "10.0.5.10", "10.0.5.11", "",
        "10.0.6.10", "10.0.6.11", "10.0.6.12", "",
        "10.0.7.10", "10.0.7.11", "10.0.7.12", "",
        "10.0.8.10", "10.0.8.11", "10.0.8.12", "10.0.8.13", "10.0.8.14", "10.0.8.20", "",
        "10.0.9.10", "10.0.9.11", "",
        "10.0.10.10", "10.0.10.11", "10.0.10.12", "10.0.10.13", "10.0.10.14", "",
        "10.0.11.10", "10.0.11.11", "10.0.11.12", "",
        "10.0.12.10", "10.0.12.11", "",
        "10.0.13.10", "10.0.13.11", "10.0.13.12", "",
        "10.0.14.10", "10.0.14.11", "",
        "10.0.15.10", "10.0.15.11", "",
        "10.0.15.13", "10.0.15.14", "10.0.15.15", "",
        "10.0.16.10", "10.0.16.11", "",
        "10.0.17.10", "10.0.17.11", "10.0.17.12", "10.0.17.13", "10.0.17.14", "",
        "10.0.18.10", "10.0.18.11", "10.0.18.12", "10.0.18.13", "",
        "10.0.19.10", "10.0.19.11", "",
        "10.0.20.10", "10.0.20.11", "",
        "10.0.21.10", "10.0.21.11", "",
        "10.0.22.10", "10.0.22.11", "",
        "10.0.23.10", "10.0.23.11", "",
        "10.0.24.10", "10.0.24.11", "",
        "10.0.25.10", "10.0.25.11", "",
        "10.0.26.10", "10.0.26.11", "10.0.26.12", "10.0.26.13", "",
        "10.0.27.10", "10.0.27.11", "10.0.27.12", "",
        "10.0.28.10", "10.0.28.11", "10.0.28.12", "",
        "10.0.29.10", "10.0.29.11", "10.0.29.12", "",
        "10.0.30.10", "10.0.30.11", "10.0.30.12", "",
        "10.0.31.10", "10.0.31.11", "10.0.31.12", "",
        "10.0.32.10", "10.0.32.11", "10.0.32.12", "",
        "10.0.33.10", "10.0.33.11", "10.0.33.12", "",
        "10.0.34.10", "10.0.34.11", "10.0.34.12", "",
        "10.0.35.10", "10.0.35.11", "10.0.35.12", "",
        "10.0.36.10", "10.0.36.11", "10.0.36.12", "",
        "10.0.37.10", "10.0.37.11", "",
        "10.0.38.10", "10.0.38.11", "",
        "10.0.39.10", "10.0.39.11", "10.0.39.12", "",
        "10.0.40.10", "10.0.40.11", "",
        "10.0.41.10", "10.0.41.11", "10.0.41.12", "",
        "10.0.42.10", "10.0.42.11", "10.0.42.12", "",
        "10.0.43.10", "10.0.43.11", "10.0.43.12", "10.0.43.13", "",
        "10.0.44.10", "10.0.44.11", "10.0.44.12", "10.0.44.13", "",
        "10.0.45.10", "10.0.45.11", "10.0.45.12", "",
        "10.0.46.10", "10.0.46.11", "10.0.46.12", "",
        "10.0.47.10", "10.0.47.11", "10.0.47.12"
    ],

    // Текущая выбранная касса
    selectedCash: null,

    // Метод для совместимости с navigation.js
    initialize: function() {
        console.log('🔄 CashManager: инициализация через метод initialize()');
        this.initializeCashList();
    },

    // Инициализация списка касс
    initializeCashList: function() {
        console.log('🔄 CashManager: инициализация списка касс...');
        const listContainer = document.getElementById('cashRegistersList');
        if (!listContainer) {
            console.error('❌ CashManager: контейнер cashRegistersList не найден');
            return;
        }

        listContainer.innerHTML = '';

        this.cashRegisters.forEach((cash, index) => {
            if (cash === '') {
                // Добавляем разделитель
                const separator = document.createElement('div');
                separator.className = 'cash-separator';
                separator.innerHTML = '<div class="separator-line"></div>';
                listContainer.appendChild(separator);
            } else {
                // Добавляем кассу
                const cashItem = document.createElement('div');
                cashItem.className = 'server-item cash-item';
                cashItem.innerHTML = `
                    <div class="server-name">
                        <span>${cash}</span>
                    </div>
                `;
                cashItem.addEventListener('click', () => this.selectCash(cash));
                listContainer.appendChild(cashItem);
            }
        });

        console.log(`✅ CashManager: загружено ${this.cashRegisters.filter(item => item !== '').length} касс`);
    },

    // Выбор кассы
    selectCash: function(cashIp) {
        this.selectedCash = cashIp;
        
        // Сохраняем выбранную кассу в sessionStorage для передачи между страницами
        sessionStorage.setItem('selectedCash', cashIp);
        
        // Переходим на страницу деталей кассы
        Navigation.showPage('cash-details');
    },

    // Загрузка деталей кассы
    loadCashDetails: function() {
        const cashIp = sessionStorage.getItem('selectedCash');
        if (!cashIp) {
            Navigation.showPage('cash-registers');
            return;
        }

        this.selectedCash = cashIp;

        // Обновляем информацию на странице
        document.getElementById('selectedCashName').textContent = `Касса ${this.getCashNumber(cashIp)}`;
        document.getElementById('selectedCashIp').textContent = cashIp;

        // Проверяем статус кассы
        this.checkCashStatus(cashIp);
    },

    // Получить номер кассы из IP
    getCashNumber: function(ip) {
        const parts = ip.split('.');
        return parts[parts.length - 1];
    },

    // Проверка статуса кассы (заглушка - в реальности будет API запрос)
    checkCashStatus: function(cashIp) {
        const statusElement = document.getElementById('cashStatus');
        
        // Имитация проверки статуса
        statusElement.innerHTML = '<i class="fas fa-sync fa-spin"></i> Проверка статуса...';
        
        setTimeout(() => {
            // Случайный статус для демонстрации
            const isOnline = Math.random() > 0.3;
            if (isOnline) {
                statusElement.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50"></i> Статус: ONLINE';
                statusElement.className = 'cash-status online';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336"></i> Статус: OFFLINE';
                statusElement.className = 'cash-status offline';
            }
        }, 1500);
    },

    // Команда PING
    pingCash: function() {
        if (!this.selectedCash) return;

        this.addToLog(`🔄 Отправка PING на ${this.selectedCash}...`);
        
        // Имитация PING запроса
        setTimeout(() => {
            const success = Math.random() > 0.2;
            if (success) {
                this.addToLog(`✅ PING успешен! ${this.selectedCash} отвечает`, 'success');
            } else {
                this.addToLog(`❌ PING неудачен! ${this.selectedCash} не отвечает`, 'error');
            }
        }, 2000);
    },

    // Команда RESTART
    restartCash: function() {
        if (!this.selectedCash) return;

        // Подтверждение перезагрузки
        if (confirm(`Вы уверены, что хотите перезагрузить кассу ${this.selectedCash}?`)) {
            this.addToLog(`🔄 Запуск перезагрузки ${this.selectedCash}...`);
            
            // Имитация перезагрузки
            setTimeout(() => {
                this.addToLog(`✅ Команда перезагрузки отправлена на ${this.selectedCash}`, 'success');
                
                // Обновляем статус после "перезагрузки"
                setTimeout(() => {
                    this.checkCashStatus(this.selectedCash);
                }, 3000);
            }, 1500);
        }
    },

    // Добавление сообщения в лог
    addToLog: function(message, type = 'info') {
        const logElement = document.getElementById('actionLog');
        if (!logElement) return;

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
};
