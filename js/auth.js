// Конфигурация аутентификации
const Auth = {
    // Конфигурация API
    API_CONFIG: {
        // Используем CORS proxy для обхода ограничений
        URL: 'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook/CheckingAccessRights'),
        TOKEN: '6b852788-cc29-430f-94c8-bf45852b08c4'
    },

    // Инициализация приложения
    initialize: async function() {
        try {
            const tg = window.Telegram.WebApp;
            
            // Инициализируем Telegram Web App
            tg.ready();
            tg.expand();

            console.log('=== ДАННЫЕ TELECRAM WEB APP ===');
            console.log('Версия Telegram Web App:', tg.version);
            console.log('Платформа:', tg.platform);
            console.log('Init Data:', tg.initData);
            console.log('Init Data Unsafe:', tg.initDataUnsafe);
            console.log('========================');

            // 🔧 ТЕСТОВЫЙ РЕЖИМ - используем фиксированный ID для тестирования
            const TEST_USER_ID = 838646989; // Замените на ваш ID
            console.log('🔧 Используем User ID для теста:', TEST_USER_ID);

            // Проверяем доступ через API
            const accessResult = await this.checkAccess(TEST_USER_ID);
            
            if (accessResult.success && accessResult.canUse) {
                this.showApp();
                return true;
            } else {
                this.showAccessDenied(accessResult.message || 'Доступ запрещен системой', TEST_USER_ID);
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
            console.log('User ID для проверки:', userId);
            
            const requestBody = {
                id: parseInt(userId)
            };

            console.log('📦 Тело запроса:', JSON.stringify(requestBody));
            console.log('🌐 URL запроса:', this.API_CONFIG.URL);

            const response = await fetch(this.API_CONFIG.URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': this.API_CONFIG.TOKEN
                },
                body: JSON.stringify(requestBody)
            });

            console.log('📡 Статус ответа:', response.status);

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
    showAccessDenied: function(reason, userId = null) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
        
        const deniedUserInfo = document.getElementById('deniedUserInfo');
        
        let infoHTML = `<strong>Причина:</strong> ${reason}`;
        
        if (userId) {
            infoHTML += `<br><strong>Ваш ID:</strong> ${userId}`;
        }
        
        deniedUserInfo.innerHTML = infoHTML;
        
        console.warn('🚫 Доступ запрещен:', reason, 'User ID:', userId);
    }
};
