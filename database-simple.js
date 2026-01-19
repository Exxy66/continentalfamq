// ============================================
// ПРОСТАЯ БАЗА ДАННЫХ ДЛЯ CONTINENTAL FAMQ
// РАБОТАЕТ ТОЛЬКО С GOOGLE ТАБЛИЦАМИ
// ============================================

class SimpleFamilyDatabase {
    constructor() {
        this.SPREADSHEET_ID = '1vqms_IesQDMRxFo1X4byq2f7fFKHtGDd5Q4pUPFD5gI';
        this.sheets = {
            users: 'Пользователи',
            applications: 'Заявки',
            blacklist: 'ЧерныйСписок',
            news: 'Новости',
            chat: 'Чат',
            roles: 'Роли',
            codes: 'КодыРолей'
        };
        
        // URL Google Apps Script для добавления данных
        // ЗАМЕНИ НА СВОЙ URL ПОСЛЕ СОЗДАНИЯ СКРИПТА!
        this.API_URL = 'https://script.google.com/macros/s/AKfycbymSmKAgmGIjGL6zwdTpzhfnAFmH3tpcFJFERVuMTiw7So45yyWxZY0jLjcea6zkoMUhQ/exec';
        
        // Основной источник данных - Google Sheets
        this.data = {
            users: [],
            applications: [],
            blacklist: [],
            news: [],
            chat: [],
            roles: [],
            codes: []
        };
        
        // Для обратной совместимости
        this.users = this.data.users;
        this.applications = this.data.applications;
        this.blacklist = this.data.blacklist;
        this.news = this.data.news;
        this.chat = this.data.chat;
        this.roles = this.data.roles;
        this.codes = this.data.codes;
        
        this.loaded = false;
        console.log('🚀 База данных инициализирована');
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    /**
     * Загружает данные из Google Таблиц
     * @param {boolean} force - Принудительная перезагрузка
     * @returns {Promise<Object>} Все данные
     */
    async load(force = false) {
        if (this.loaded && !force) {
            console.log('📦 Данные уже загружены, используем кэш');
            return this.data;
        }
        
        console.log('🔄 Загрузка данных из Google Таблиц...');
        
        try {
            // Загружаем все таблицы параллельно
            const promises = Object.entries(this.sheets).map(async ([key, sheetName]) => {
                try {
                    const data = await this.loadSheet(sheetName);
                    this.data[key] = data;
                    return { key, success: true, count: data.length };
                } catch (error) {
                    console.error(`❌ Ошибка загрузки ${sheetName}:`, error.message);
                    return { key, success: false, error: error.message };
                }
            });
            
            const results = await Promise.allSettled(promises);
            
            // Обновляем свойства для совместимости
            this.users = this.data.users;
            this.applications = this.data.applications;
            this.blacklist = this.data.blacklist;
            this.news = this.data.news;
            this.chat = this.data.chat;
            this.roles = this.data.roles;
            this.codes = this.data.codes;
            
            this.loaded = true;
            
            console.log('✅ Данные загружены:');
            console.log('👥 Пользователи:', this.data.users.length);
            console.log('📝 Заявки:', this.data.applications.length);
            console.log('🚫 Черный список:', this.data.blacklist.length);
            console.log('📰 Новости:', this.data.news.length);
            console.log('💬 Чат:', this.data.chat.length);
            console.log('🎭 Роли:', this.data.roles.length);
            console.log('🔑 Коды:', this.data.codes.length);
            
            // Кэшируем в localStorage для быстрого доступа (ТОЛЬКО КЭШ!)
            this.cacheToLocalStorage();
            
            // Находим текущего пользователя
            this.findCurrentUser();
            
            return this.data;
            
        } catch (error) {
            console.error('❌ Критическая ошибка загрузки:', error);
            // Пробуем загрузить из кэша как запасной вариант
            return this.loadFromCache();
        }
    }
    
    /**
     * Загружает одну таблицу из Google Sheets
     * @param {string} sheetName - Название листа
     * @returns {Promise<Array>} Данные таблицы
     */
    async loadSheet(sheetName) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            
            console.log(`📥 Загружаю "${sheetName}"...`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            
            // Если таблица пустая или содержит только заголовки
            if (!csvText.trim() || csvText.trim().split('\n').length <= 1) {
                console.log(`📭 Таблица "${sheetName}" пуста`);
                return [];
            }
            
            // Парсим CSV
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            const headers = this.parseCSVLine(lines[0]);
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                const item = {};
                
                headers.forEach((header, index) => {
                    if (values[index] !== undefined && values[index] !== '') {
                        // Преобразуем значения
                        let value = values[index];
                        
                        // Пытаемся парсить числа и булевы значения
                        if (!isNaN(value) && value.trim() !== '') {
                            value = Number(value);
                        } else if (value.toLowerCase() === 'true') {
                            value = true;
                        } else if (value.toLowerCase() === 'false') {
                            value = false;
                        }
                        
                        item[header] = value;
                    }
                });
                
                // Добавляем только если есть данные
                if (Object.keys(item).length > 0) {
                    data.push(item);
                }
            }
            
            console.log(`✅ "${sheetName}": ${data.length} записей`);
            return data;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки "${sheetName}":`, error.message);
            throw error;
        }
    }
    
    /**
     * Парсит строку CSV с учетом кавычек
     * @param {string} line - Строка CSV
     * @returns {Array} Массив значений
     */
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Двойная кавычка внутри кавычек
                    current += '"';
                    i++; // Пропускаем следующую кавычку
                } else {
                    // Начало/конец кавычек
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                // Конец поля
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        // Добавляем последнее поле
        result.push(current);
        
        // Убираем пробелы и кавычки
        return result.map(field => field.trim().replace(/^"|"$/g, ''));
    }
    
    // ========== ДОБАВЛЕНИЕ ДАННЫХ В GOOGLE SHEETS ==========
    
    /**
     * Добавляет пользователя в Google Таблицу
     * @param {Object} userData - Данные пользователя
     * @returns {Promise<Object>} Результат операции
     */
    async addUser(userData) {
        try {
            console.log('📤 Добавляю пользователя в Google Таблицу:', userData);
            
            // Проверяем, нет ли уже такого пользователя
            const existingUser = await this.getUserById(userData.discordId || userData.discordid);
            if (existingUser) {
                return {
                    success: false,
                    error: 'Пользователь с таким Discord ID уже существует'
                };
            }
            
            // Формируем полные данные пользователя
            const fullUserData = {
                id: this.generateUserId(),
                discordId: userData.discordId,
                discordid: userData.discordId, // дублируем для совместимости
                username: userData.username || userData.discordUsername,
                avatar: userData.avatar || userData.discordAvatar || '',
                role: userData.role || 'user',
                balance: userData.balance || 0,
                joinDate: new Date().toISOString().split('T')[0],
                lastLogin: new Date().toISOString(),
                status: 'active',
                notifications: 'enabled',
                accessToken: this.generateToken(),
                createdAt: new Date().toISOString(),
                // Дополнительные поля из формы
                email: userData.email || '',
                phone: userData.phone || '',
                bio: userData.bio || '',
                country: userData.country || '',
                discordTag: userData.discordTag || ''
            };
            
            // Отправляем данные в Google Apps Script
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addUser',
                    user: fullUserData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Пользователь добавлен в Google Таблицу:', result);
                
                // Обновляем локальные данные
                await this.refresh();
                
                return {
                    success: true,
                    userId: result.userId || fullUserData.id,
                    userData: fullUserData,
                    message: 'Пользователь успешно зарегистрирован'
                };
            } else {
                throw new Error(result.error || 'Неизвестная ошибка при добавлении');
            }
            
        } catch (error) {
            console.error('❌ Ошибка добавления пользователя:', error);
            
            // Сохраняем во временный кэш для последующей синхронизации
            this.savePendingUser(userData);
            
            return {
                success: false,
                error: error.message,
                message: 'Ошибка при добавлении пользователя. Данные сохранены локально.'
            };
        }
    }
    
    /**
     * Добавляет заявку в Google Таблицу
     * @param {Object} applicationData - Данные заявки
     * @returns {Promise<Object>} Результат операции
     */
    async addApplication(applicationData) {
        return await this.addToSheet('applications', applicationData);
    }
    
    /**
     * Добавляет новость в Google Таблицу
     * @param {Object} newsData - Данные новости
     * @returns {Promise<Object>} Результат операции
     */
    async addNews(newsData) {
        return await this.addToSheet('news', newsData);
    }
    
    /**
     * Добавляет сообщение в чат
     * @param {Object} messageData - Данные сообщения
     * @returns {Promise<Object>} Результат операции
     */
    async addChatMessage(messageData) {
        return await this.addToSheet('chat', messageData);
    }
    
    /**
     * Общий метод для добавления данных в любую таблицу
     * @param {string} sheetKey - Ключ таблицы (users, applications и т.д.)
     * @param {Object} itemData - Данные для добавления
     * @returns {Promise<Object>} Результат операции
     */
    async addToSheet(sheetKey, itemData) {
        try {
            console.log(`📤 Добавляю данные в таблицу "${sheetKey}":`, itemData);
            
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addToSheet',
                    sheet: this.sheets[sheetKey],
                    data: itemData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log(`✅ Данные добавлены в "${sheetKey}":`, result);
                
                // Обновляем локальные данные
                await this.refresh();
                
                return {
                    success: true,
                    message: 'Данные успешно добавлены',
                    result: result
                };
            } else {
                throw new Error(result.error || 'Неизвестная ошибка');
            }
            
        } catch (error) {
            console.error(`❌ Ошибка добавления в "${sheetKey}":`, error);
            
            // Сохраняем во временный кэш
            this.savePendingItem(sheetKey, itemData);
            
            return {
                success: false,
                error: error.message,
                message: 'Ошибка при добавлении данных'
            };
        }
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ДЛЯ РЕГИСТРАЦИИ ==========
    
    /**
     * Генерирует уникальный ID пользователя
     * @returns {string} Уникальный ID
     */
    generateUserId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    /**
     * Генерирует токен доступа
     * @returns {string} Токен
     */
    generateToken() {
        return 'famq_token_' + Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15);
    }
    
    /**
     * Сохраняет пользователя в локальный кэш при ошибке
     * @param {Object} userData - Данные пользователя
     */
    savePendingUser(userData) {
        try {
            const pendingUsers = JSON.parse(localStorage.getItem('famq_pending_users') || '[]');
            pendingUsers.push({
                ...userData,
                timestamp: Date.now(),
                synced: false
            });
            localStorage.setItem('famq_pending_users', JSON.stringify(pendingUsers));
            console.log('💾 Пользователь сохранен в локальный кэш');
        } catch (error) {
            console.error('Ошибка сохранения в кэш:', error);
        }
    }
    
    /**
     * Сохраняет элемент в локальный кэш
     * @param {string} sheetKey - Тип данных
     * @param {Object} itemData - Данные
     */
    savePendingItem(sheetKey, itemData) {
        try {
            const pendingItems = JSON.parse(localStorage.getItem('famq_pending_items') || '{}');
            if (!pendingItems[sheetKey]) {
                pendingItems[sheetKey] = [];
            }
            pendingItems[sheetKey].push({
                ...itemData,
                timestamp: Date.now(),
                synced: false
            });
            localStorage.setItem('famq_pending_items', JSON.stringify(pendingItems));
            console.log(`💾 Данные сохранены в локальный кэш: ${sheetKey}`);
        } catch (error) {
            console.error('Ошибка сохранения в кэш:', error);
        }
    }
    
    /**
     * Пытается синхронизировать отложенные данные
     */
    async syncPendingData() {
        console.log('🔄 Синхронизация отложенных данных...');
        
        // Синхронизируем пользователей
        try {
            const pendingUsers = JSON.parse(localStorage.getItem('famq_pending_users') || '[]');
            for (const user of pendingUsers) {
                if (!user.synced) {
                    const result = await this.addUser(user);
                    if (result.success) {
                        user.synced = true;
                        console.log('✅ Пользователь синхронизирован:', user.username);
                    }
                }
            }
            // Удаляем синхронизированных пользователей
            const unsyncedUsers = pendingUsers.filter(u => !u.synced);
            localStorage.setItem('famq_pending_users', JSON.stringify(unsyncedUsers));
        } catch (error) {
            console.error('Ошибка синхронизации пользователей:', error);
        }
    }
    
    /**
     * Проверяет существование пользователя
     * @param {string} discordId - Discord ID
     * @param {string} username - Имя пользователя
     * @returns {Promise<boolean>} Существует ли пользователь
     */
    async isUserExists(discordId, username = null) {
        await this.getUsers();
        
        return this.data.users.some(user => 
            user.discordId === discordId || 
            user.discordid === discordId ||
            (username && user.username === username)
        );
    }
    
    /**
     * Регистрирует нового пользователя
     * @param {Object} userData - Данные для регистрации
     * @returns {Promise<Object>} Результат регистрации
     */
    async registerUser(userData) {
        // Проверяем существование
        const exists = await this.isUserExists(userData.discordId, userData.username);
        if (exists) {
            return {
                success: false,
                error: 'Пользователь уже существует',
                message: 'Пользователь с таким Discord ID или именем уже зарегистрирован'
            };
        }
        
        // Добавляем пользователя
        return await this.addUser(userData);
    }
    
    // ========== ПОЛУЧЕНИЕ ДАННЫХ ==========
    
    /**
     * Получает всех пользователей
     * @returns {Promise<Array>} Массив пользователей
     */
    async getUsers() {
        if (!this.loaded || this.data.users.length === 0) {
            await this.load();
        }
        return this.data.users;
    }
    
    /**
     * Находит пользователя по ID или имени
     * @param {string} id - Discord ID или username
     * @returns {Promise<Object|null>} Пользователь или null
     */
    async getUserById(id) {
        await this.getUsers();
        
        // Ищем по разным полям
        return this.data.users.find(user => 
            user.discordId === id ||
            user.discordid === id ||
            user.username === id ||
            user.id === id
        ) || null;
    }
    
    /**
     * Получает все роли
     * @returns {Promise<Array>} Массив ролей
     */
    async getRoles() {
        if (!this.loaded || this.data.roles.length === 0) {
            await this.load();
        }
        return this.data.roles;
    }
    
    /**
     * Получает все коды ролей
     * @returns {Promise<Array>} Массив кодов
     */
    async getRoleCodes() {
        if (!this.loaded || this.data.codes.length === 0) {
            await this.load();
        }
        return this.data.codes;
    }
    
    /**
     * Получает все заявки
     * @returns {Promise<Array>} Массив заявок
     */
    async getApplications() {
        if (!this.loaded || this.data.applications.length === 0) {
            await this.load();
        }
        return this.data.applications;
    }
    
    /**
     * Получает все новости
     * @returns {Promise<Array>} Массив новостей
     */
    async getNews() {
        if (!this.loaded || this.data.news.length === 0) {
            await this.load();
        }
        return this.data.news;
    }
    
    /**
     * Получает все сообщения чата
     * @returns {Promise<Array>} Массив сообщений
     */
    async getChat() {
        if (!this.loaded || this.data.chat.length === 0) {
            await this.load();
        }
        return this.data.chat;
    }
    
    /**
     * Получает черный список
     * @returns {Promise<Array>} Массив записей
     */
    async getBlacklist() {
        if (!this.loaded || this.data.blacklist.length === 0) {
            await this.load();
        }
        return this.data.blacklist;
    }
    
    // ========== УПРАВЛЕНИЕ ДАННЫМИ ==========
    
    /**
     * Обновляет данные (перезагружает из Google Sheets)
     * @returns {Promise<Object>} Обновленные данные
     */
    async refresh() {
        console.log('🔄 Принудительное обновление данных...');
        return await this.load(true);
    }
    
    /**
     * Сохраняет данные в localStorage как кэш
     */
    cacheToLocalStorage() {
        try {
            const cache = {
                users: this.data.users,
                roles: this.data.roles,
                codes: this.data.codes,
                timestamp: Date.now()
            };
            
            localStorage.setItem('famq_cache', JSON.stringify(cache));
            localStorage.setItem('famq_last_update', Date.now().toString());
            
            console.log('💾 Данные закэшированы в localStorage');
        } catch (error) {
            console.error('❌ Ошибка кэширования:', error);
        }
    }
    
    /**
     * Загружает данные из кэша (fallback)
     * @returns {Object} Данные из кэша
     */
    loadFromCache() {
        try {
            const cache = JSON.parse(localStorage.getItem('famq_cache') || '{}');
            const timestamp = parseInt(localStorage.getItem('famq_last_update') || '0');
            
            if (cache.users && cache.roles && cache.codes) {
                // Используем кэшированные данные
                this.data.users = cache.users || [];
                this.data.roles = cache.roles || [];
                this.data.codes = cache.codes || [];
                
                // Обновляем свойства для совместимости
                this.users = this.data.users;
                this.roles = this.data.roles;
                this.codes = this.data.codes;
                
                console.log('📂 Использую кэшированные данные');
                console.log('🕐 Время кэша:', new Date(timestamp).toLocaleTimeString());
                
                this.findCurrentUser();
                
                return this.data;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки из кэша:', error);
        }
        
        return this.data;
    }
    
    /**
     * Находит текущего пользователя и сохраняет в localStorage
     */
    findCurrentUser() {
        const discordId = "913464996267180092"; // Твой Discord ID
        const username = "exxy66"; // Твой username
        
        const user = this.data.users.find(u => 
            (u.discordId && u.discordId === discordId) ||
            (u.discordid && u.discordid === discordId) ||
            (u.username && u.username.toLowerCase() === username.toLowerCase())
        );
        
        if (user) {
            console.log('🎉 Найден пользователь:', user.username || user.discordId);
            
            // Сохраняем информацию о пользователе
            const userData = {
                id: user.id || user.discordId,
                username: user.username,
                discordId: user.discordId || user.discordid,
                role: user.role || 'user',
                avatar: user.avatar,
                balance: user.balance || 0,
                joinDate: user.joinDate
            };
            
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('userRole', userData.role);
            
            if (userData.role === 'admin') {
                localStorage.setItem('isAdmin', 'true');
                console.log('👑 Ты админ!');
            }
            
            // Отправляем событие
            window.dispatchEvent(new CustomEvent('userLoaded', { detail: userData }));
            
            return userData;
        } else {
            console.log('⚠️ Пользователь не найден в базе');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('userRole');
            localStorage.removeItem('isAdmin');
            return null;
        }
    }
    
    // ========== СТАТУС И ДИАГНОСТИКА ==========
    
    /**
     * Проверяет подключение к Google Sheets
     * @returns {Promise<boolean>} Успешно ли подключение
     */
    async testConnection() {
        try {
            const testUrl = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent('Пользователи')}`;
            const response = await fetch(testUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            console.error('❌ Ошибка подключения:', error.message);
            return false;
        }
    }
    
    /**
     * Получает статус базы данных
     * @returns {Object} Статус
     */
    getStatus() {
        return {
            loaded: this.loaded,
            users: this.data.users.length,
            applications: this.data.applications.length,
            news: this.data.news.length,
            chat: this.data.chat.length,
            roles: this.data.roles.length,
            codes: this.data.codes.length,
            timestamp: this.loaded ? new Date().toLocaleTimeString() : 'Не загружено'
        };
    }
    
    /**
     * Синхронизирует все данные (алиас для load)
     * @returns {Promise<Object>} Все данные
     */
    async syncAll() {
        return await this.load();
    }
    
    /**
     * Инициализирует базу данных
     * @returns {Promise<Object>} Все данные
     */
    async initialize() {
        console.log('🚀 Инициализация базы данных...');
        const data = await this.load();
        console.log('✅ База данных готова');
        
        // Пытаемся синхронизировать отложенные данные
        setTimeout(() => this.syncPendingData(), 3000);
        
        // Отправляем событие
        window.dispatchEvent(new Event('databaseReady'));
        
        return data;
    }
}

// ========== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ==========

// Создаём и настраиваем глобальные ссылки
window.FamilyDatabase = new SimpleFamilyDatabase();
window.database = window.FamilyDatabase;
window.db = window.FamilyDatabase.data;

// Автоматическая загрузка при старте
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Страница загружена');
    
    // Даем время на рендеринг страницы
    setTimeout(async () => {
        try {
            console.log('🔄 Запускаю загрузку данных...');
            
            // Загружаем данные из Google Таблиц
            const data = await window.FamilyDatabase.initialize();
            
            console.log('✅ Все данные загружены');
            console.log('📊 Статус:', window.FamilyDatabase.getStatus());
            
        } catch (error) {
            console.error('❌ Критическая ошибка:', error);
            
            // Пробуем использовать кэш
            window.FamilyDatabase.loadFromCache();
        }
    }, 500);
});

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleFamilyDatabase;
}
