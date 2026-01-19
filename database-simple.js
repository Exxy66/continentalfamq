// ============================================
// ПРОСТАЯ БАЗА ДАННЫХ ДЛЯ CONTINENTAL FAMQ
// РАБОТАЕТ ИЗ РОССИИ БЕЗ GOOGLE CLOUD!
// ============================================

class SimpleFamilyDatabase {
    constructor() {
        // ⚠️ ВАЖНО: ЗАМЕНИТЕ ЭТО НА ВАШ ID ТАБЛИЦЫ!
        this.SPREADSHEET_ID = '1vqms_IesQDMRxFo1X4byq2f7fFKHtGDd5Q4pUPFD5gI';
        
        this.sheets = {
            users: 'Пользователи',
            applications: 'Заявки',
            blacklist: 'ЧерныйСписок',
            news: 'Новости',
            chat: 'Чат',
            roles: 'Роли',
            roleCodes: 'КодыРолей'
        };
        
        this.cache = {};
        this.pendingChanges = [];
        this.isInitialized = false;
        
        console.log('🚀 База данных инициализирована. ID таблицы:', this.SPREADSHEET_ID);
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    // СТАЛО:
async loadSheet(sheetName) {
    console.log(`Загрузка ${sheetName}...`);
    
    try {
        const response = await fetch`https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tq=select%20*&sheet=${sheetName}&tqx=responseHandler:handleResponse`;
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        
        const data = await response.text();
        console.log(`✅ ${sheetName} загружены успешно`);
        return this.parseCSV(data); // Важно! Преобразовать CSV в массив
        
    } catch (error) {
        console.error(`❌ Не удалось загрузить ${sheetName}:`, error.message);
        
        // Пробуем загрузить из кеша (если эта логика нужна)
        const cached = this.getFromCache ? this.getFromCache(sheetName) : [];
        if (cached && cached.length > 0) {
            console.log(`📂 Использую кеш для ${sheetName}: ${cached.length} записей`);
            return cached;
        }
        
        return []; // Возвращаем пустой массив
    }
}
    
    // Парсит CSV в массив объектов
    parseCSV(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) return [];
        
        // Получаем заголовки (первая строка)
        const headers = this.parseCSVLine(lines[0]);
        
        // Парсим данные
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const item = {};
            
            headers.forEach((header, index) => {
                if (values[index] !== undefined) {
                    let value = values[index];
                    
                    // Убираем кавычки
                    value = value.replace(/^"|"$/g, '');
                    
                    // Пытаемся распарсить JSON
                    if ((value.startsWith('[') && value.endsWith(']')) || 
                        (value.startsWith('{') && value.endsWith('}'))) {
                        try {
                            item[header] = JSON.parse(value);
                        } catch {
                            item[header] = value;
                        }
                    } else {
                        item[header] = value;
                    }
                }
            });
            
            // Добавляем только если есть данные
            if (Object.keys(item).length > 0) {
                data.push(item);
            }
        }
        
        return data;
    }
    
    // Парсит одну строку CSV
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // Пропускаем следующую кавычку
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }
    
    // ========== КЕШИРОВАНИЕ ==========
    
    // Сохраняет данные в локальное хранилище
    saveToCache(sheetName, data) {
        const key = `famq_cache_${sheetName}`;
        localStorage.setItem(key, JSON.stringify({
            data: data,
            timestamp: Date.now()
        }));
    }
    
    // Получает данные из кеша
    getFromCache(sheetName) {
        const key = `famq_cache_${sheetName}`;
        const cached = localStorage.getItem(key);
        
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const age = Date.now() - parsed.timestamp;
                
                // Используем кеш если ему меньше 10 минут
                if (age < 10 * 60 * 1000) {
                    return parsed.data;
                }
            } catch (error) {
                console.warn('Ошибка парсинга кеша:', error);
            }
        }
        
        return [];
    }
    
    // ========== СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ ==========
    
    async syncAll() {
        console.log('🔄 Начинаю синхронизацию всех данных...');
        
        try {
            const promises = Object.entries(this.sheets).map(async ([key, sheetName]) => {
                try {
                    const data = await this.loadSheet(sheetName);
                    this.cache[key] = data;
                    this.saveToCache(sheetName, data);
                    return true;
                } catch (error) {
                    console.error(`Ошибка синхронизации ${sheetName}:`, error);
                    return false;
                }
            });
            
            await Promise.all(promises);
            // Проверяем, были ли ошибки в предыдущих сообщениях
const logEntries = performance.getEntriesByType('resource');
const hasErrors = logEntries.some(entry => 
    entry.name.includes('docs.google.com') && 
    (entry.responseStatus || 0) >= 400
);

if (hasErrors) {
    console.log("⚠️ Синхронизация завершена с ошибками");
} else {
    console.log("✅ Все данные синхронизированы");
}
            this.isInitialized = true;
            
            // Сохраняем время последней синхронизации
            localStorage.setItem('famq_last_sync', Date.now().toString());
            
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка синхронизации:', error);
            return false;
        }
    }
    
    async syncTable(tableName) {
        const sheetName = this.sheets[tableName];
        if (!sheetName) return false;
        
        try {
            const data = await this.loadSheet(sheetName);
            this.cache[tableName] = data;
            this.saveToCache(sheetName, data);
            return true;
        } catch (error) {
            console.error(`Ошибка синхронизации ${tableName}:`, error);
            return false;
        }
    }
    
    // ========== МЕТОДЫ ДЛЯ РАБОТЫ С ДАННЫМИ ==========
    
    // Получить все заявки
    async getApplications() {
        if (!this.cache.applications) {
            await this.syncTable('applications');
        }
        return this.cache.applications || [];
    }
    
    // Получить черный список
    async getBlacklist() {
        if (!this.cache.blacklist) {
            await this.syncTable('blacklist');
        }
        return this.cache.blacklist || [];
    }
    
    // Получить новости
    async getNews() {
        if (!this.cache.news) {
            await this.syncTable('news');
        }
        return this.cache.news || [];
    }
    
    // Получить сообщения чата
    async getChat() {
        if (!this.cache.chat) {
            await this.syncTable('chat');
        }
        return this.cache.chat || [];
    }
    
    // Получить пользователей
    async getUsers() {
        if (!this.cache.users) {
            await this.syncTable('users');
        }
        return this.cache.users || [];
    }
    
    // Получить роли
    async getRoles() {
        if (!this.cache.roles) {
            await this.syncTable('roles');
        }
        return this.cache.roles || [];
    }
    
    // Получить коды ролей
    async getRoleCodes() {
        if (!this.cache.roleCodes) {
            await this.syncTable('roleCodes');
        }
        return this.cache.roleCodes || [];
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    
    async initialize() {
        console.log('🚀 Инициализация базы данных...');
        
        // Проверяем подключение к интернету
        if (!navigator.onLine) {
            console.log('📴 Офлайн режим. Загружаю данные из кеша...');
            
            // Загружаем все из кеша
            Object.keys(this.sheets).forEach(key => {
                this.cache[key] = this.getFromCache(this.sheets[key]);
            });
            
            this.isInitialized = true;
            return this.cache;
        }
        
        // Загружаем данные из Google Sheets
        await this.syncAll();
        
        // Настраиваем автосинхронизацию
        this.setupAutoSync();
        
        return this.cache;
    }
    
    // Настройка автосинхронизации
    setupAutoSync() {
        // Синхронизация каждые 2 минуты
        setInterval(async () => {
            if (navigator.onLine) {
                await this.syncAll();
            }
        }, 2 * 60 * 1000);
        
        // Синхронизация при возвращении онлайн
        window.addEventListener('online', async () => {
            console.log('🌐 Восстановлено соединение. Синхронизирую...');
            await this.syncAll();
        });
    }
    
    // ========== УТИЛИТЫ ==========
    
    // Проверяет доступность Google Sheets
    async testConnection() {
        try {
            const testUrl = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Роли`;
            const response = await fetch(testUrl, { method: 'HEAD' });
            return response.ok;
        } catch (error) {
            return false;
        }
    }
    
    // Получает информацию о последней синхронизации
    getSyncInfo() {
        const lastSync = localStorage.getItem('famq_last_sync');
        return {
            isOnline: navigator.onLine,
            lastSync: lastSync ? new Date(parseInt(lastSync)).toLocaleTimeString() : 'Никогда',
            cacheSize: Object.keys(this.cache).reduce((total, key) => 
                total + (this.cache[key] ? this.cache[key].length : 0), 0)
        };
    }
}

// Создаем глобальный экземпляр базы данных
window.FamilyDatabase = new SimpleFamilyDatabase();
