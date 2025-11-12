// Service Worker для фоновой отправки сообщений
const CACHE_NAME = 'message-scheduler-v1';
const CHECK_INTERVAL = 30000; // 30 секунд

self.addEventListener('install', (event) => {
    console.log('🔄 Service Worker: установка');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🔄 Service Worker: активация');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', async (event) => {
    const { type, messages, messageId, error } = event.data;
    
    switch (type) {
        case 'SYNC_MESSAGES':
            console.log('📡 Service Worker: получены сообщения для синхронизации', messages.length);
            await storeMessages(messages);
            startBackgroundChecks();
            break;
            
        case 'MESSAGE_CANCELLED':
            console.log('🗑️ Service Worker: отмена сообщения', messageId);
            await removeMessage(messageId);
            break;
    }
});

// Фоновая проверка сообщений
function startBackgroundChecks() {
    setInterval(async () => {
        const messages = await getStoredMessages();
        const now = Date.now();
        const messagesToSend = messages.filter(msg => msg.timestamp <= now);
        
        if (messagesToSend.length > 0) {
            console.log(`📤 Service Worker: найдено ${messagesToSend.length} сообщений для отправки`);
            
            for (const message of messagesToSend) {
                await sendMessageFromWorker(message);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }, CHECK_INTERVAL);
}

// Отправка сообщения из Service Worker
async function sendMessageFromWorker(message) {
    try {
        console.log(`📤 Service Worker: отправка сообщения ${message.id}`);
        
        // Используем fetch для отправки через API
        const response = await fetch('https://api.telegram.org/bot' + message.botToken + '/sendMessage', {
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
            console.log('✅ Service Worker: сообщение отправлено', message.id);
            
            // Уведомляем клиент
            sendToClient({
                type: 'MESSAGE_SENT',
                messageId: message.id
            });
            
            // Удаляем отправленное сообщение
            await removeMessage(message.id);
            
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Service Worker: ошибка отправки', message.id, error);
        
        // Уведомляем клиент об ошибке
        sendToClient({
            type: 'MESSAGE_ERROR',
            messageId: message.id,
            error: error.message
        });
    }
}

// Хранение сообщений в IndexedDB
async function storeMessages(messages) {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    
    // Очищаем старые сообщения
    await store.clear();
    
    // Сохраняем новые
    for (const message of messages) {
        await store.add(message);
    }
    
    console.log(`💾 Service Worker: сохранено ${messages.length} сообщений`);
}

async function getStoredMessages() {
    const db = await openDB();
    const tx = db.transaction('messages', 'readonly');
    const store = tx.objectStore('messages');
    return await store.getAll();
}

async function removeMessage(messageId) {
    const db = await openDB();
    const tx = db.transaction('messages', 'readwrite');
    const store = tx.objectStore('messages');
    await store.delete(messageId);
}

async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MessageSchedulerDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('messages')) {
                const store = db.createObjectStore('messages', { keyPath: 'id' });
                store.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

// Отправка сообщения клиенту
function sendToClient(message) {
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage(message);
        });
    });
}