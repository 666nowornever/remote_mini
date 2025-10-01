// 🔧 РЕЖИМ ТЕСТИРОВАНИЯ - установите true для теста
const TEST_MODE = true;
const TEST_USER_ID = 349807461; // Замените на ваш реальный ID


// Конфигурация аутентификации
const Auth = {
    // Конфигурация API
    API_CONFIG: {
        URL: 'https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook/CheckingAccessRights',
        TOKEN: '6b852788-cc29-430f-94c8-bf45852b08c4'
    },

    // Инициализация приложения
    initialize: async function() {

        if (TEST_MODE) {
            console.log('🔧 АКТИВИРОВАН ТЕСТОВЫЙ РЕЖИМ');
            console.log('🔧 Используем тестовый User ID:', TEST_USER_ID);
            
            const accessResult = await this.checkAccess(TEST_USER_ID);
            
            if (accessResult.success && accessResult.canUse) {
                this.showApp();
                return true;
            } else {
                this.showAccessDenied(accessResult.message || 'Доступ запрещен системой', TEST_USER_ID);
                return false;
            }
        }
        try {
            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            const user = tg.initDataUnsafe.user;
            
            if (!user) {
                this.showAccessDenied('Не удалось получить данные пользователя из Telegram');
                return false;
            }

            console.log('=== ДАННЫЕ ПОЛЬЗОВАТЕЛЯ TELECRAM ===');
            console.log('User ID:', user.id);
            console.log('User ID тип:', typeof user.id);
            console.log('Username:', user.username);
            console.log('First name:', user.first_name);
            console.log('========================');

            // Проверяем доступ через API
            const accessResult = await this.checkAccess(user.id);
            
            if (accessResult.success && accessResult.canUse) {
                this.showApp();
                return true;
            } else {
                this.showAccessDenied(accessResult.message || 'Доступ запрещен', user);
                return false;
            }

        } catch (error) {
            console.error('❌ Критическая ошибка инициализации:', error);
            this.showAccessDenied('Системная ошибка при проверке доступа');
            return false;
        }
    },

    // Проверка доступа через API
    checkAccess: async function(userId) {
        try {
            console.log('🔐 Отправка запроса проверки доступа...');
            console.log('URL:', this.API_CONFIG.URL);
            console.log('User ID для проверки:', userId);
            
            const requestBody = {
                id: parseInt(userId)
            };

            console.log('📦 Тело запроса:', JSON.stringify(requestBody));

            const response = await fetch(this.API_CONFIG.URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': this.API_CONFIG.TOKEN
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 Статус ответа:', response.status);
            console.log('📡 Заголовки ответа:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Ошибка HTTP:', response.status, errorText);
                return {
                    success: false,
                    canUse: false,
                    message: `Ошибка сервера: ${response.status}`
                };
            }

            const result = await response.json();
            console.log('✅ Ответ от сервера:', result);
            console.log('✅ canUse значение:', result.canUse);
            console.log('✅ canUse тип:', typeof result.canUse);

            return {
                success: true,
                canUse: result.canUse === true,
                message: result.canUse ? 'Доступ разрешен' : 'Доступ запрещен системой'
            };

        } catch (error) {
            console.error('❌ Ошибка сети при проверке доступа:', error);
            return {
                success: false,
                canUse: false,
                message: 'Ошибка подключения к серверу'
            };
        }
    },

    // Показать приложение
    showApp: function() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('accessDenied').classList.add('hidden');
        console.log('🎉 Доступ разрешен, приложение запускается...');
    },

    // Показать экран "Доступ запрещен"
    showAccessDenied: function(reason, user = null) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
        
        const deniedUserInfo = document.getElementById('deniedUserInfo');
        
        let infoHTML = `<strong>Причина:</strong> ${reason}`;
        
        if (user) {
            infoHTML += `<br><strong>Ваш ID:</strong> ${user.id}`;
            infoHTML += `<br><strong>Имя:</strong> ${user.first_name || 'Не указано'}`;
            infoHTML += `<br><strong>Username:</strong> @${user.username || 'Не указан'}`;
        }
        
        deniedUserInfo.innerHTML = infoHTML;
        
        console.warn('🚫 Доступ запрещен:', reason, user);
    },

    // Скрыть индикатор загрузки
    hideLoading: function() {
        document.getElementById('loading').classList.add('hidden');
    }
};
