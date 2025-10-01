// Конфигурация аутентификации
const Auth = {
    // Конфигурация API
    API_CONFIG: {
        URL: 'https://wh.tomato-pizza.ru:443/webhook/hs/tomatohook/CheckingAccessRights',
        TOKEN: '6b852788-cc29-430f-94c8-bf45852b08c4'
    },

    // Инициализация приложения
    initialize: async function() {
        try {
            // Скрываем индикатор загрузки
            this.hideLoading();

            const tg = window.Telegram.WebApp;
            tg.ready();
            tg.expand();

            const user = tg.initDataUnsafe.user;
            
            if (!user) {
                this.showAccessDenied('Не удалось получить данные пользователя');
                return false;
            }

            // Отладочная информация
            console.log('=== ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ ===');
            console.log('User ID:', user.id);
            console.log('Username:', user.username);
            console.log('First name:', user.first_name);
            console.log('========================');

            // Проверяем доступ через API
            const hasAccess = await this.checkAccess(user.id);
            
            if (hasAccess) {
                this.showApp();
                return true;
            } else {
                this.showAccessDenied('Доступ запрещен системой', user);
                return false;
            }

        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showAccessDenied('Ошибка проверки доступа');
            return false;
        }
    },

    // Проверка доступа через API
    checkAccess: async function(userId) {
        try {
            console.log('🔐 Проверка доступа для пользователя:', userId);
            
            const response = await fetch(this.API_CONFIG.URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': this.API_CONFIG.TOKEN
                },
                body: JSON.stringify({
                    id: parseInt(userId) // Убеждаемся что передаем число
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('📡 Ответ от сервера:', result);

            return result.canUse === true;

        } catch (error) {
            console.error('❌ Ошибка при проверке доступа:', error);
            return false;
        }
    },

    // Показать приложение
    showApp: function() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('accessDenied').classList.add('hidden');
        console.log('✅ Доступ разрешен');
    },

    // Показать экран "Доступ запрещен"
    showAccessDenied: function(reason, user = null) {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('app').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
        
        const deniedUserInfo = document.getElementById('deniedUserInfo');
        
        if (user) {
            deniedUserInfo.innerHTML = `
                <strong>Ваш ID:</strong> ${user.id}<br>
                <strong>Имя:</strong> ${user.first_name || 'Не указано'}<br>
                <strong>Username:</strong> @${user.username || 'Не указан'}<br>
                <strong>Статус:</strong> ❌ ${reason}
            `;
        } else {
            deniedUserInfo.innerHTML = `<strong>Причина:</strong> ${reason}`;
        }
        
        console.warn('🚫 Доступ запрещен:', reason, user);
    },

    // Скрыть индикатор загрузки
    hideLoading: function() {
        document.getElementById('loading').classList.add('hidden');
    }
};
