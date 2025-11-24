// Service Worker для фоновой отправки сообщений
const CACHE_NAME = 'message-scheduler-v2';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 минут

// Установка
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker: установка');
    self.skipWaiting();
});

// Активация
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: активация');
    event.waitUntil(self.clients.claim());
    // Запускаем фоновые проверки
    startBackgroundChecks();
});

// Фоновая проверка сообщений
function startBackgroundChecks() {
    // Проверяем сразу при запуске
    checkAndSendMessages();
    
    // Затем каждые 5 минут
    setInterval(() => {
        checkAndSendMessages();
    }, CHECK_INTERVAL);
}

// Проверка и отправка сообщений
async function checkAndSendMessages() {
    try {
        console.log('🔍 Service Worker: проверка сообщений...');
        const messages = await getStoredMessages();
        const now = Date.now();
        const messagesToSend = messages.filter(msg => 
            msg.status === 'scheduled' && msg.timestamp <= now
        );
        
        console.log(`📤 Service Worker: найдено ${messagesToSend.length} сообщений для отправки`);
        
        for (const message of messagesToSend) {
            await sendMessageFromWorker(message);
            // Задержка между отправками
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error('❌ Service Worker: ошибка проверки сообщений:', error);
    }
}

// Отправка сообщения
async function sendMessageFromWorker(message) {
    try {
        console.log(`📤 Service Worker: отправка сообщения ${message.id}`);
        
        // Получаем конфигурацию из хранилища
        const config = await getConfig();
        if (!config?.botToken) {
            throw new Error('Токен бота не настроен');
        }

        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: message.chatId || config.defaultChatId,
                text: message.message,
                parse_mode: 'HTML'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Service Worker: сообщение отправлено', message.id);
            
            // Обновляем статус
            await updateMessageStatus(message.id, 'sent');
            
            // Уведомляем клиент
            sendToClient({
                type: 'MESSAGE_SENT',
                messageId: message.id
            });
            
        } else {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
    } catch (error) {
        console.error('❌ Service Worker: ошибка отправки', message.id, error);
        
        // Обновляем статус ошибки
        await updateMessageStatus(message.id, 'error', error.message);
        
        // Уведомляем клиент
        sendToClient({
            type: 'MESSAGE_ERROR',
            messageId: message.id,
            error: error.message
        });
    }
}

// Работа с хранилищем
async function getStoredMessages() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match('/messages');
        if (response) {
            return await response.json();
        }
        return [];
    } catch (error) {
        console.error('❌ Ошибка получения сообщений:', error);
        return [];
    }
}

async function updateMessageStatus(messageId, status, error = null) {
    try {
        const messages = await getStoredMessages();
        const messageIndex = messages.findIndex(msg => msg.id === messageId);
        
        if (messageIndex !== -1) {
            messages[messageIndex].status = status;
            messages[messageIndex].sentAt = status === 'sent' ? Date.now() : undefined;
            messages[messageIndex].error = error || undefined;
            messages[messageIndex].updatedAt = Date.now();
            
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/messages', new Response(JSON.stringify(messages)));
        }
    } catch (error) {
        console.error('❌ Ошибка обновления статуса:', error);
    }
}

async function getConfig() {
    try {
        const cache = await caches.open(CACHE_NAME);
        const response = await cache.match('/config');
        if (response) {
            return await response.json();
        }
        return null;
    } catch (error) {
        console.error('❌ Ошибка получения конфигурации:', error);
        return null;
    }
}

// Сообщения от основного приложения
self.addEventListener('message', async (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SYNC_MESSAGES':
            console.log('📡 Service Worker: синхронизация сообщений', data.messages.length);
            await storeMessages(data.messages);
            break;
            
        case 'SYNC_CONFIG':
            console.log('⚙️ Service Worker: синхронизация конфигурации');
            await storeConfig(data.config);
            break;
            
        case 'CHECK_NOW':
            console.log('🔍 Service Worker: немедленная проверка');
            await checkAndSendMessages();
            break;
    }
});

async function storeMessages(messages) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/messages', new Response(JSON.stringify(messages)));
        console.log(`💾 Service Worker: сохранено ${messages.length} сообщений`);
    } catch (error) {
        console.error('❌ Ошибка сохранения сообщений:', error);
    }
}

async function storeConfig(config) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put('/config', new Response(JSON.stringify(config)));
        console.log('⚙️ Service Worker: конфигурация сохранена');
    } catch (error) {
        console.error('❌ Ошибка сохранения конфигурации:', error);
    }
}

// Отправка сообщения клиенту
function sendToClient(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}

// Периодическая синхронизация
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'message-check') {
        event.waitUntil(checkAndSendMessages());
    }
});

// Запуск при получении push-уведомления
self.addEventListener('push', (event) => {
    event.waitUntil(checkAndSendMessages());
});