// Конфигурация авторизации
const Auth = {
    // Разрешенные пользователи - настройте этот список
    ALLOWED_USER_IDS: [
        123456789,     // Замените на ваш Telegram ID
        987654321,     // Замените на ID другого пользователя
        // Добавьте сюда ID всех, кому разрешаете доступ
    ],

    // Инициализация приложения
    initialize: function() {
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

        // Проверка доступа
        if (this.ALLOWED_USER_IDS.includes(user.id)) {
            this.showApp();
            return true;
        } else {
            this.showAccessDenied(null, user);
            return false;
        }
    },

    // Показать приложение
    showApp: function() {
        document.getElementById('app').classList.remove('hidden');
        document.getElementById('accessDenied').classList.add('hidden');
    },

    // Показать экран "Доступ запрещен"
    showAccessDenied: function(reason, user = null) {
        document.getElementById('app').classList.add('hidden');
        document.getElementById('accessDenied').classList.remove('hidden');
        
        const deniedUserInfo = document.getElementById('deniedUserInfo');
        
        if (user) {
            deniedUserInfo.innerHTML = `
                <strong>Ваш ID:</strong> ${user.id}<br>
                <strong>Имя:</strong> ${user.first_name || 'Не указано'}<br>
                <strong>Username:</strong> @${user.username || 'Не указан'}<br>
                <strong>Статус:</strong> ❌ Не в списке разрешенных пользователей
            `;
        } else {
            deniedUserInfo.innerHTML = `<strong>Причина:</strong> ${reason}`;
        }
        
        console.warn('🚫 ПОПЫТКА НЕСАНКЦИОНИРОВАННОГО ДОСТУПА:', user);
    }
};