// Менеджер управления ПК менеджера и музыкальными моноблоками
const PCManager = {
    // Типы устройств
    deviceTypes: {
        MANAGER_PC: 'manager_pc',
        MUSIC_PC: 'music_pc'
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

    // Получаем устройства динамически
    getDevices: function(deviceType) {
        if (deviceType === this.deviceTypes.MANAGER_PC) {
            return this.generateDevices('TM', 'PC01', 48);
        } else if (deviceType === this.deviceTypes.MUSIC_PC) {
            return this.generateDevices('TM', 'PC02', 48);
        }
        return [];
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

        const devices = this.getDevices(deviceType);
        
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
                
                deviceItem.innerHTML = `
                    <div class="server-name">
                        <i class="${icon}"></i>
                        <span>${device}</span>
                    </div>
                `;
                deviceItem.addEventListener('click', () => {
                    console.log(`🎯 Выбрано устройство: ${device}`);
                    this.selectDevice(device, deviceType);
                });
                listContainer.appendChild(deviceItem);
            }
        });

        console.log(`✅ PCManager: загружено ${devices.filter(item => item !== '').length} устройств типа ${deviceType}`);
    },

    // Выбор устройства
    selectDevice: function(deviceName, deviceType) {
        console.log(`🎯 PCManager: выбор устройства ${deviceName} типа ${deviceType}`);
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
        
        console.log(`🔍 PCManager: загрузка деталей устройства ${deviceName} типа ${deviceType}`);
        
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
        
        document.getElementById('selectedDeviceName').textContent = `${deviceTitle} ${this.getDeviceNumber(deviceName)}`;
        document.getElementById('selectedDeviceId').textContent = deviceName;

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
        if (!this.selectedDevice) {
            console.error('❌ PCManager: устройство не выбрано');
            return;
        }

        console.log(`🔄 PCManager: PING для ${this.selectedDevice}`);
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
        if (!this.selectedDevice) {
            console.error('❌ PCManager: устройство не выбрано');
            return;
        }

        const deviceTypeText = this.currentDeviceType === this.deviceTypes.MANAGER_PC ? 
            'ПК менеджера' : 'музыкальный моноблок';

        // Подтверждение перезагрузки
        if (confirm(`Вы уверены, что хотите перезагрузить ${deviceTypeText} ${this.selectedDevice}?`)) {
            console.log(`🔄 PCManager: RESTART для ${this.selectedDevice}`);
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
        if (!logElement) {
            console.error('❌ PCManager: элемент лога не найден');
            return;
        }

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
        
        logElement.appendChild(logEntry);
        logElement.scrollTop = logElement.scrollHeight;
    }
};
