// Service Worker для фоновой отправки сообщений
const CACHE_NAME = 'telegram-scheduler-v1';
const API_URL = 'https://api.telegram.org/bot';

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker: установка');
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: активация');
    event.waitUntil(self.clients.claim());
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: синхронизация', event.tag);
    
    if (event.tag === 'message-sync') {
        event.waitUntil(sendScheduledMessages());
    }
});

// Периодическая фоновая синхронизация (каждые 5 минут)
self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'message-periodic-sync') {
        console.log('🔄 Service Worker: периодическая синхронизация');
        event.waitUntil(sendScheduledMessages());
    }
});

// Отправка запланированных сообщений
async function sendScheduledMessages() {
    try {
        console.log('📤 Service Worker: проверка сообщений для отправки');
        
        // Получаем данные из IndexedDB
        const messages = await getScheduledMessages();
        const now = Date.now();
        const messagesToSend = messages.filter(msg => 
            msg.status === 'scheduled' && msg.timestamp <= now
        );

        console.log(`📤 Service Worker: найдено ${messagesToSend.length} сообщений для отправки`);

        for (const message of messagesToSend) {
            await sendMessage(message);
            // Задержка между отправками
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.error('❌ Service Worker: ошибка отправки сообщений:', error);
    }
}

// Получение сообщений из IndexedDB
async function getScheduledMessages() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TelegramSchedulerDB', 1);
        
        request.onerror = () => reject(new Error('Ошибка открытия БД'));
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['messages'], 'readonly');
            const store = transaction.objectStore('messages');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject(new Error('Ошибка чтения данных'));
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('messages')) {
                db.createObjectStore('messages', { keyPath: 'id' });
            }
        };
    });
}

// Отправка сообщения через Telegram API
async function sendMessage(message) {
    try {
        console.log(`📤 Service Worker: отправка сообщения "${message.message.substring(0, 50)}..."`);
        
        const response = await fetch(`${API_URL}${message.botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: message.chatId,
                text: message.message,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Service Worker: сообщение отправлено успешно');
            await updateMessageStatus(message.id, 'sent');
            return { success: true, messageId: result.result.message_id };
        } else {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
    } catch (error) {
        console.error('❌ Service Worker: ошибка отправки:', error);
        await updateMessageStatus(message.id, 'error', error.message);
        return { success: false, error: error.message };
    }
}

// Обновление статуса сообщения в IndexedDB
async function updateMessageStatus(messageId, status, error = null) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('TelegramSchedulerDB', 1);
        
        request.onerror = () => reject(new Error('Ошибка открытия БД'));
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['messages'], 'readwrite');
            const store = transaction.objectStore('messages');
            
            const getRequest = store.get(messageId);
            getRequest.onsuccess = () => {
                const message = getRequest.result;
                if (message) {
                    message.status = status;
                    message.sentAt = status === 'sent' ? Date.now() : undefined;
                    message.error = error || undefined;
                    message.updatedAt = Date.now();
                    
                    const putRequest = store.put(message);
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(new Error('Ошибка обновления данных'));
                }
            };
        };
    });
}