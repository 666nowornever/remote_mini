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

