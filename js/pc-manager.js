// Менеджер управления ПК менеджера и музыкальными моноблоками
const PCManager = {
    // Типы устройств
    deviceTypes: {
        MANAGER_PC: 'manager_pc',
        MUSIC_PC: 'music_pc'
    },

    // Списки устройств (исправленная инициализация)
    devices: {},

    // Инициализация менеджера
    init: function() {
        console.log('🔄 PCManager: инициализация...');
        // Генерируем устройства при первой инициализации
        this.devices = {
            manager_pc: this.generateDevices('TM', 'PC01', 48),
            music_pc: this.generateDevices('TM', 'PC02', 48)
        };
        console.log('✅ PCManager: устройства сгенерированы');
    },

    // Генерация списка устройств
    generateDevices: function(prefix, suffix, count) {
        const devices = [];
        for (let i = 1; i <= count; i++) {
            const number = i.toString().padStart(3, '0');
            devices.push(`${prefix}${number}-${suffix}`);
            
            // Добавляем разделители для лучшей читаемости
            if (i % 10 === 0 && i < count) {
                devices.push('');
            }
        }
        return devices;
    },

    // Текущее выбранное устройство
    selectedDevice: null,
    currentDeviceType: null,

    // Метод для совместимости с navigation.js
    initialize: function(deviceType) {
        console.log(`🔄 PCManager: инициализация для типа ${deviceType}`);
        this.currentDeviceType = deviceType;
        this.initializeDeviceList(deviceType);
    },

    // Инициализация списка устройств
    initializeDeviceList: function(deviceType) {
        console.log(`🔄 PCManager: инициализация списка устройств типа ${deviceType}...`);
        const listContainer = document.getElementById('devicesList');
        if (!listContainer) {
            console.error('❌ PCManager: контейнер devicesList не найден');
            return;
        }

        listContainer.innerHTML = '';

        const devices = this.devices[deviceType];
        
        if (!devices) {
            console.error('❌ PCManager: устройства типа', deviceType, 'не найдены');
            return;
        }

        devices.forEach((device, index) => {
            if (device === '') {
                // Добавляем разделитель
                const separator = document.createElement('div');
                separator.className = 'device-separator';
                separator.innerHTML = '<div class="separator-line"></div>';
                listContainer.appendChild(separator);
            } else {
                // Добавляем устройство
                const deviceItem = document.createElement('div');
                deviceItem.className = 'server-item device-item';
                
                const icon = deviceType === this.deviceTypes.MANAGER_PC ? 
                    'fas fa-desktop' : 'fas fa-music';
                
                // Форматируем отображение: TM01 вместо TM001-PC01
                const displayName = this.formatDeviceName(device);
                
                deviceItem.innerHTML = `
                    <div class="server-name device-name-centered">
                        <span class="device-address">${displayName}</span>
                    </div>
                `;
                deviceItem.addEventListener('click', () => this.selectDevice(device, deviceType));
                listContainer.appendChild(deviceItem);
            }
        });

        console.log(`✅ PCManager: загружено ${devices.filter(item => item !== '').length} устройств типа ${deviceType}`);
    },

    // Форматирование имени устройства для отображения
    formatDeviceName: function(fullName) {
        // Преобразуем TM001-PC01 в TM01
        const match = fullName.match(/TM(\d+)-PC\d+/);
        if (match) {
            const number = parseInt(match[1]); // Получаем 001
            return `TM${number}`; // Преобразуем в TM1, TM2, ... TM48
        }
        return fullName;
    },

    // Выбор устройства
    selectDevice: function(deviceName, deviceType) {
        this.selectedDevice = deviceName;
        this.currentDeviceType = deviceType;
        
        // Сохраняем выбранное устройство в sessionStorage
        sessionStorage.setItem('selectedDevice', deviceName);
        sessionStorage.setItem('selectedDeviceType', deviceType);
        
        // Переходим на страницу деталей устройства
        Navigation.showPage('device-details');
    },

    // Загрузка деталей устройства
    loadDeviceDetails: function() {
        const deviceName = sessionStorage.getItem('selectedDevice');
        const deviceType = sessionStorage.getItem('selectedDeviceType');
        
        if (!deviceName || !deviceType) {
            console.error('❌ PCManager: данные устройства не найдены в sessionStorage');
            // Возвращаем на соответствующую страницу списка
            if (deviceType === this.deviceTypes.MANAGER_PC) {
                Navigation.showPage('manager-pcs');
            } else {
                Navigation.showPage('music-pcs');
            }
            return;
        }

        this.selectedDevice = deviceName;
        this.currentDeviceType = deviceType;

        // Обновляем информацию на странице
        const deviceTitle = deviceType === this.deviceTypes.MANAGER_PC ? 
            'ПК Менеджера' : 'Музыкальный моноблок';
        
        // Форматируем отображение адреса
        const displayAddress = this.formatDeviceName(deviceName);
        document.getElementById('selectedDeviceId').textContent = displayAddress;

        // Убираем строку с названием устройства (скрываем элемент)
        const deviceNameElement = document.getElementById('selectedDeviceName');
        if (deviceNameElement) {
            deviceNameElement.style.display = 'none';
        }

        // Устанавливаем соответствующий заголовок
        const titleElement = document.getElementById('deviceDetailsTitle');
        if (titleElement) {
            titleElement.textContent = deviceTitle;
        }

        // Проверяем статус устройства
        this.checkDeviceStatus(deviceName);
    },

    // Получить номер устройства из названия
    getDeviceNumber: function(deviceName) {
        const match = deviceName.match(/TM(\d+)-/);
        return match ? match[1] : deviceName;
    },

    // Проверка статуса устройства
    checkDeviceStatus: function(deviceName) {
        const statusElement = document.getElementById('deviceStatus');
        if (!statusElement) return;
        
        // Имитация проверки статуса
        statusElement.innerHTML = '<i class="fas fa-sync fa-spin"></i> Проверка статуса...';
        
        setTimeout(() => {
            // Случайный статус для демонстрации
            const isOnline = Math.random() > 0.3;
            if (isOnline) {
                statusElement.innerHTML = '<i class="fas fa-check-circle" style="color: #4CAF50"></i> Статус: ONLINE';
                statusElement.className = 'device-status online';
            } else {
                statusElement.innerHTML = '<i class="fas fa-times-circle" style="color: #f44336"></i> Статус: OFFLINE';
                statusElement.className = 'device-status offline';
            }
        }, 1500);
    },

    // Команда PING
    pingDevice: function() {
        if (!this.selectedDevice) return;

        this.addToLog(`🔄 Отправка PING на ${this.selectedDevice}...`);
        
        // Имитация PING запроса
        setTimeout(() => {
            const success = Math.random() > 0.2;
            if (success) {
                this.addToLog(`✅ PING успешен! ${this.selectedDevice} отвечает`, 'success');
            } else {
                this.addToLog(`❌ PING неудачен! ${this.selectedDevice} не отвечает`, 'error');
            }
        }, 2000);
    },

    // Команда RESTART
    restartDevice: function() {
        if (!this.selectedDevice) return;

        const deviceTypeText = this.currentDeviceType === this.deviceTypes.MANAGER_PC ? 
            'ПК менеджера' : 'музыкальный моноблок';

        // Подтверждение перезагрузки
        if (confirm(`Вы уверены, что хотите перезагрузить ${deviceTypeText} ${this.selectedDevice}?`)) {
            this.addToLog(`🔄 Запуск перезагрузки ${this.selectedDevice}...`);
            
            // Имитация перезагрузки
            setTimeout(() => {
                this.addToLog(`✅ Команда перезагрузки отправлена на ${this.selectedDevice}`, 'success');
                
                // Обновляем статус после "перезагрузки"
                setTimeout(() => {
                    this.checkDeviceStatus(this.selectedDevice);
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

// Инициализация PCManager при загрузке
document.addEventListener('DOMContentLoaded', function() {
    if (typeof PCManager !== 'undefined' && PCManager.init) {
        PCManager.init();
    }
});

