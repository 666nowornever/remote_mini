// Менеджер управления сервис принтерами
const PrinterManager = {
    // Список ресторанов (TM01-TM48) - будет инициализирован в init()
    restaurants: [],
    
    // Список цехов
    departments: [
        { id: 15, name: 'Пицца' },
        { id: 16, name: 'Кондитерский' },
        { id: 17, name: 'Холодный' },
        { id: 18, name: 'Горячий' },
        { id: 19, name: 'Бар' }
    ],

    // Текущие выбранные данные
    selectedRestaurant: null,
    selectedDepartment: null,
    selectedPrinter: null,

    // Инициализация менеджера
    init: function() {
        console.log('🔄 PrinterManager: инициализация...');
        // Генерируем рестораны при инициализации
        this.restaurants = this.generateRestaurants(48);
        console.log('✅ PrinterManager: рестораны сгенерированы');
    },

    // Генерация списка ресторанов
    generateRestaurants: function(count) {
        const restaurants = [];
        for (let i = 1; i <= count; i++) {
            restaurants.push({
                id: i,
                displayName: `TM${i}`,
                network: `10.0.${i}`
            });
            
            // Добавляем разделители для лучшей читаемости
            if (i % 10 === 0 && i < count) {
                restaurants.push('');
            }
        }
        return restaurants;
    },

    // Метод для совместимости с navigation.js
    initialize: function() {
        console.log('🔄 PrinterManager: инициализация списка ресторанов...');
        this.initializeRestaurantsList();
    },

    // Инициализация списка ресторанов
    initializeRestaurantsList: function() {
        const listContainer = document.getElementById('printersList');
        if (!listContainer) {
            console.error('❌ PrinterManager: контейнер printersList не найден');
            return;
        }

        listContainer.innerHTML = '';

        this.restaurants.forEach((restaurant, index) => {
            if (restaurant === '') {
                // Добавляем разделитель
                const separator = document.createElement('div');
                separator.className = 'printer-separator';
                separator.innerHTML = '<div class="separator-line"></div>';
                listContainer.appendChild(separator);
            } else {
                // Добавляем ресторан
                const restaurantItem = document.createElement('div');
                restaurantItem.className = 'server-item printer-item';
                
                restaurantItem.innerHTML = `
                    <div class="server-name printer-name-centered">
                        <span class="printer-address">${restaurant.displayName}</span>
                    </div>
                `;
                restaurantItem.addEventListener('click', () => this.selectRestaurant(restaurant));
                listContainer.appendChild(restaurantItem);
            }
        });

        console.log(`✅ PrinterManager: загружено ${this.restaurants.filter(item => item !== '').length} ресторанов`);
    },

    // Выбор ресторана
    selectRestaurant: function(restaurant) {
        this.selectedRestaurant = restaurant;
        
        // Сохраняем выбранный ресторан в sessionStorage
        sessionStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
        
        // Переходим на страницу выбора цеха
        Navigation.showPage('printer-departments');
    },

    // Загрузка страницы выбора цеха
    loadDepartmentsPage: function() {
        const restaurantData = sessionStorage.getItem('selectedRestaurant');
        if (!restaurantData) {
            Navigation.showPage('service-printers');
            return;
        }

        this.selectedRestaurant = JSON.parse(restaurantData);

        // Обновляем заголовок
        const titleElement = document.getElementById('departmentsTitle');
        if (titleElement) {
            titleElement.textContent = `Выбор цеха - ${this.selectedRestaurant.displayName}`;
        }
    },

    // Выбор цеха
    selectDepartment: function(department) {
        this.selectedDepartment = department;
        
        // Формируем полный IP принтера
        const printerIp = `${this.selectedRestaurant.network}.${department.id}`;
        const printerName = `${this.selectedRestaurant.displayName} ${department.name}`;
        
        this.selectedPrinter = {
            ip: printerIp,
            name: printerName,
            restaurant: this.selectedRestaurant.displayName,
            department: department.name
        };
        
        // Сохраняем выбранный принтер в sessionStorage
        sessionStorage.setItem('selectedPrinter', JSON.stringify(this.selectedPrinter));
        
        // Переходим на страницу деталей принтера
        Navigation.showPage('printer-details');
    },

    // Загрузка деталей принтера
    loadPrinterDetails: function() {
        const printerData = sessionStorage.getItem('selectedPrinter');
        if (!printerData) {
            Navigation.showPage('service-printers');
            return;
        }

        this.selectedPrinter = JSON.parse(printerData);

        // Обновляем информацию на странице
        document.getElementById('selectedPrinterName').textContent = this.selectedPrinter.name;
        document.getElementById('selectedPrinterIp').textContent = this.selectedPrinter.ip;

        // Проверяем статус принтера
        this.checkPrinterStatus(this.selectedPrinter.ip);
    },

    // Проверка статуса принтера
    checkPrinterStatus: function(printerIp) {
        const statusElement = document.getElementById('printerStatus');
        if (!statusElement) return;
        
        // Имитация проверки статуса
        statusElement.innerHTML = '<i class="fas fa-sync fa-spin"></i> Проверка статуса...';
        
        setTimeout(() => {
            // Случайный статус для демонстрации
            const isOnline = Math.random() > 0.3;
            if (isOnline) {
                statusElement.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50"></i> Статус: ONLINE';
                statusElement.className = 'printer-status online';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336"></i> Статус: OFFLINE';
                statusElement.className = 'printer-status offline';
            }
        }, 1500);
    },

    // Команда PING
    pingPrinter: function() {
        if (!this.selectedPrinter) return;

        this.addToLog(`🔄 Отправка PING на ${this.selectedPrinter.ip}...`);
        
        // Имитация PING запроса
        setTimeout(() => {
            const success = Math.random() > 0.2;
            if (success) {
                this.addToLog(`✅ PING успешен! ${this.selectedPrinter.ip} отвечает`, 'success');
            } else {
                this.addToLog(`❌ PING неудачен! ${this.selectedPrinter.ip} не отвечает`, 'error');
            }
        }, 2000);
    },

    // Команда RESTART
    restartPrinter: function() {
        if (!this.selectedPrinter) return;

        // Подтверждение перезагрузки
        if (confirm(`Вы уверены, что хотите перезагрузить принтер ${this.selectedPrinter.name} (${this.selectedPrinter.ip})?`)) {
            this.addToLog(`🔄 Запуск перезагрузки ${this.selectedPrinter.ip}...`);
            
            // Имитация перезагрузки
            setTimeout(() => {
                this.addToLog(`✅ Команда перезагрузки отправлена на ${this.selectedPrinter.ip}`, 'success');
                
                // Обновляем статус после "перезагрузки"
                setTimeout(() => {
                    this.checkPrinterStatus(this.selectedPrinter.ip);
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

// Инициализация PrinterManager при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    if (typeof PrinterManager !== 'undefined' && PrinterManager.init) {
        PrinterManager.init();
    }
});
