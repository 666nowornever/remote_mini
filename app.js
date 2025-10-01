// Базовая логика - будем расширять
const tg = window.Telegram.WebApp;

// Инициализация
tg.ready();
tg.expand();

function sendCommand(action) {
    const statusEl = document.getElementById('status');
    statusEl.textContent = `Отправка команды: ${action}...`;
    
    // TODO: Здесь будет запрос к вашему C# серверу
    console.log(`Command: ${action}`);
    
    // Временное сообщение
    setTimeout(() => {
        statusEl.textContent = `Команда "${action}" отправлена (реализуем позже)`;
    }, 1000);
}
// Расширенная конфигурация
const APP_CONFIG = {
    // Разрешенные пользователи
    ALLOWED_USERS: [
        {
            id: 123456789,
            name: "Администратор",
            role: "admin"
        },
        {
            id: 987654321, 
            name: "Менеджер",
            role: "manager"
        },
        {
            id: 555666777,
            name: "Тестер",
            role: "user"
        }
    ],
    
    // Дополнительные настройки
    ALLOW_UNKNOWN_USERS: false, // Разрешить пользователей не из списка?
    LOG_ACCESS_ATTEMPTS: true   // Логировать попытки доступа?
};

// Улучшенная функция проверки
function checkUserAccess(user) {
    // Проверяем, что пользователь есть в Telegram
    if (!user || !user.id) {
        return { allowed: false, reason: 'No user data' };
    }
    
    // Ищем пользователя в списке разрешенных
    const allowedUser = APP_CONFIG.ALLOWED_USERS.find(u => u.id === user.id);
    
    if (allowedUser) {
        return { 
            allowed: true, 
            user: allowedUser,
            role: allowedUser.role
        };
    }
    
    // Если пользователь не найден, но разрешены неизвестные пользователи
    if (APP_CONFIG.ALLOW_UNKNOWN_USERS) {
        return { 
            allowed: true, 
            user: {
                id: user.id,
                name: user.first_name || 'Unknown',
                role: 'guest'
            }
        };
    }
    
    return { 
        allowed: false, 
        reason: 'User not in allowed list',
        user: user 
    };
}

// Логирование попыток доступа
function logAccessAttempt(user, allowed, reason = '') {
    if (!APP_CONFIG.LOG_ACCESS_ATTEMPTS) return;
    
    const logEntry = {
        timestamp: new Date().toISOString(),
        userId: user?.id,
        username: user?.username,
        firstName: user?.first_name,
        allowed: allowed,
        reason: reason
    };
    
    console.log('ACCESS LOG:', logEntry);
    
    // Можно отправить на сервер для анализа
    // sendToServer('/log/access', logEntry);
}

// Обновленная инициализация
function initializeApp() {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

    const user = tg.initDataUnsafe.user;
    const accessCheck = checkUserAccess(user);
    
    logAccessAttempt(user, accessCheck.allowed, accessCheck.reason);
    
    if (accessCheck.allowed) {
        showApp(user, accessCheck.role);
    } else {
        showAccessDenied(accessCheck.reason, user);
    }
}
