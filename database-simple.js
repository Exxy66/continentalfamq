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
        
        // Храним данные напрямую в свойствах объекта
        this.users = [];
        this.applications = [];
        this.blacklist = [];
        this.news = [];
        this.chat = [];
        this.roles = [];
        this.codes = [];
        
        console.log('🚀 База данных инициализирована. ID таблицы:', this.SPREADSHEET_ID);
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    async loadSheet(sheetName) {
        console.log(`📥 Загружаю ${sheetName}...`);
        
        try {
            // ПРАВИЛЬНЫЙ URL для загрузки CSV
            const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            
            console.log('🔗 URL:', url);
            
            // Загружаем данные
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const csvText = await response.text();
            
            // Проверяем, что данные не пустые
            if (!csvText || csvText.trim().length === 0) {
                console.warn(`⚠️ Таблица "${sheetName}" пустая`);
                return [];
            }
            
            console.log(`✅ ${sheetName} загружены: ${csvText.length} символов`);
            
            // ДЛЯ ОТЛАДКИ: смотрим что пришло
            console.log(`🔍 Первые 200 символов ${sheetName}:`, csvText.substring(0, 200));
            
            // Преобразуем CSV в массив объектов
            const data = this.parseCSVSimple(csvText);
            console.log(`📊 ${sheetName} распарсено: ${data.length} записей`);
            
            return data;
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки ${sheetName}:`, error.message);
            return []; // Возвращаем пустой массив при ошибке
        }
    }
    
    // СУПЕР-ПРОСТОЙ парсер CSV (работает с любыми данными)
    parseCSVSimple(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        
        if (lines.length < 2) {
            console.log('❌ CSV пустой или только заголовки');
            return [];
        }
        
        const result = [];
        
        // Пытаемся разные способы парсинга
        try {
            // СПОСОБ 1: Простое разделение по запятой
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line.trim()) continue;
                
                const values = line.split(',');
                const item = {};
                
                for (let j = 0; j < Math.min(headers.length, values.length); j++) {
                    let value = values[j].trim();
                    // Убираем кавычки если есть
                    value = value.replace(/^"|"$/g, '');
                    
                    if (value !== '') {
                        item[headers[j]] = value;
                    }
                }
                
                if (Object.keys(item).length > 0) {
                    result.push(item);
                }
            }
            
            if (result.length > 0) {
                console.log(`✅ Парсинг способом 1: ${result.length} записей`);
                return result;
            }
        } catch (e) {
            console.log('Способ 1 не сработал:', e.message);
        }
        
        // Если первый способ не сработал, пробуем второй
        try {
            const lines2 = csvText.split('\r\n').filter(line => line.trim() !== '');
            if (lines2.length < 2) return [];
            
            const headers2 = lines2[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''));
            const result2 = [];
            
            for (let i = 1; i < lines2.length; i++) {
                const values2 = lines2[i].split('\t');
                const item2 = {};
                
                for (let j = 0; j < Math.min(headers2.length, values2.length); j++) {
                    let value = values2[j].trim().replace(/^"|"$/g, '');
                    if (value !== '') {
                        item2[headers2[j]] = value;
                    }
                }
                
                if (Object.keys(item2).length > 0) {
                    result2.push(item2);
                }
            }
            
            if (result2.length > 0) {
                console.log(`✅ Парсинг способом 2: ${result2.length} записей`);
                return result2;
            }
        } catch (e) {
            console.log('Способ 2 не сработал:', e.message);
        }
        
        console.log('❌ Не удалось распарсить CSV');
        return [];
    }
    
    // ========== СИНХРОНИЗАЦИЯ ==========
    
    async syncAllData() {
        console.log('🔄 Начинаю синхронизацию всех данных...');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Загружаем таблицы ПО ОЧЕРЕДИ для лучшей отладки
        const tables = [
            { key: 'users', name: 'Пользователи' },
            { key: 'applications', name: 'Заявки' },
            { key: 'blacklist', name: 'ЧерныйСписок' },
            { key: 'news', name: 'Новости' },
            { key: 'chat', name: 'Чат' },
            { key: 'roles', name: 'Роли' },
            { key: 'codes', name: 'КодыРолей' }
        ];
        
        for (const table of tables) {
            try {
                const data = await this.loadSheet(table.name);
                this[table.key] = data;
                console.log(`✅ ${table.name}: ${data.length} записей`);
                
                // Показываем пример данных для отладки
                if (data.length > 0 && table.key === 'users') {
                    console.log('👤 Пример пользователя:', data[0]);
                }
                if (data.length > 0 && table.key === 'codes') {
                    console.log('🔑 Пример кода роли:', data[0]);
                }
                
                successCount++;
            } catch (error) {
                console.error(`❌ Ошибка загрузки ${table.name}:`, error);
                errorCount++;
            }
        }
        
        // ИТОГ
        console.log(`📊 Результат: ${successCount} успешно, ${errorCount} с ошибками`);
        
        if (errorCount === 0) {
            console.log('✅ Все данные синхронизированы!');
        } else {
            console.log(`⚠️ Синхронизация завершена с ${errorCount} ошибками`);
        }
        
        // Обновляем роль пользователя
        this.updateCurrentUserRole();
        
        return {
            success: successCount,
            errors: errorCount,
            timestamp: new Date().toISOString()
        };
    }
    
    // ========== МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ==========
    
    // Этот метод ВАЖЕН - его вызывает другой файл!
    async testConnection() {
        console.log('🔍 testConnection() вызван из другого файла...');
        try {
            // Простая проверка - загружаем маленькую таблицу
            const testData = await this.loadSheet('Роли');
            const isConnected = testData.length > 0;
            
            console.log(`✅ testConnection: ${isConnected ? 'РАБОТАЕТ' : 'НЕ РАБОТАЕТ'}`);
            return isConnected;
        } catch (error) {
            console.error('❌ testConnection ошибка:', error);
            return false;
        }
    }
    
    // Старые методы для совместимости
    async syncAll() {
        return await this.syncAllData();
    }
    
    async initialize() {
        console.log('🚀 Инициализация базы данных...');
        const result = await this.syncAllData();
        console.log('✅ База данных инициализирована');
        console.log('📊 Статус:', this.getStatus());
        return result;
    }
    
    // ========== МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ==========
    
    async getUsers() {
        if (this.users.length === 0) await this.syncAllData();
        return this.users;
    }
    
    async getApplications() {
        if (this.applications.length === 0) await this.syncAllData();
        return this.applications;
    }
    
    async getBlacklist() {
        if (this.blacklist.length === 0) await this.syncAllData();
        return this.blacklist;
    }
    
    async getNews() {
        if (this.news.length === 0) await this.syncAllData();
        return this.news;
    }
    
    async getChat() {
        if (this.chat.length === 0) await this.syncAllData();
        return this.chat;
    }
    
    async getRoles() {
        if (this.roles.length === 0) await this.syncAllData();
        return this.roles;
    }
    
    async getRoleCodes() {
        if (this.codes.length === 0) await this.syncAllData();
        return this.codes;
    }
    
    // ========== ПОЛЬЗОВАТЕЛЬСКИЕ МЕТОДЫ ==========
    
    async updateCurrentUserRole() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            if (currentUser.discordid) {
                // Если users ещё не загружены, загружаем
                if (this.users.length === 0) {
                    await this.syncAllData();
                }
                
                const userInDB = this.users.find(u => u.discordid === currentUser.discordid);
                
                if (userInDB) {
                    console.log(`👤 Найден в БД: ${userInDB.username}, роль: ${userInDB.role}`);
                    
                    // Всегда обновляем из БД, даже если роль совпадает
                    localStorage.setItem('userRole', userInDB.role);
                    localStorage.setItem('currentUser', JSON.stringify(userInDB));
                    
                    console.log(`🎭 Роль обновлена: ${userInDB.role}`);
                    
                    // Событие для интерфейса
                    const event = new CustomEvent('userRoleUpdated', { detail: userInDB });
                    window.dispatchEvent(event);
                }
            }
        } catch (error) {
            console.warn('Не удалось обновить роль:', error);
        }
    }
    
    async findUserByDiscordId(discordid) {
        if (this.users.length === 0) await this.syncAllData();
        return this.users.find(u => u.discordid === discordid.toString());
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    getStatus() {
        return {
            users: this.users.length,
            applications: this.applications.length,
            blacklist: this.blacklist.length,
            news: this.news.length,
            chat: this.chat.length,
            roles: this.roles.length,
            codes: this.codes.length,
            timestamp: new Date().toLocaleTimeString()
        };
    }
    
    // ========== ДЕБАГ МЕТОДЫ ==========
    
    async debugAllTables() {
        console.log('🐛 ДЕБАГ: Проверяю все таблицы...');
        
        for (const [key, sheetName] of Object.entries(this.sheets)) {
            console.log(`\n=== ${sheetName} ===`);
            
            try {
                const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
                const response = await fetch(url);
                const text = await response.text();
                
                console.log(`Длина: ${text.length} символов`);
                console.log('Первые 300 символов:');
                console.log(text.substring(0, 300));
                
                // Пробуем разные способы парсинга
                const lines = text.split('\n');
                console.log(`Строк: ${lines.length}`);
                console.log('Первая строка (заголовки):', lines[0]);
                console.log('Вторая строка (данные):', lines[1] || 'нет данных');
                
            } catch (error) {
                console.error(`Ошибка: ${error.message}`);
            }
        }
    }
}

// Создаем глобальный экземпляр
window.FamilyDatabase = new SimpleFamilyDatabase();
window.database = window.FamilyDatabase; // Дублируем для совместимости

// Автоматическая инициализация
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Страница загружена...');
    
    setTimeout(async () => {
        try {
            // 1. Инициализируем
            await window.FamilyDatabase.initialize();
            
            // 2. Находим себя
            const me = await window.FamilyDatabase.findUserByDiscordId("9134649962671");
            if (me) {
                console.log('🎉 Я в базе:', me);
                
                // 3. Обязательно ставим роль из БД
                localStorage.setItem('userRole', me.role);
                localStorage.setItem('currentUser', JSON.stringify(me));
                
                // 4. Говорим интерфейсу обновиться
                const event = new Event('userDataLoaded');
                window.dispatchEvent(event);
                
                console.log(`👑 Роль установлена: ${me.role}`);
            }
            
            // 5. Для отладки можно посмотреть все данные
            console.log('📋 Все пользователи:', window.FamilyDatabase.users);
            console.log('🔑 Все коды:', window.FamilyDatabase.codes);
            
        } catch (error) {
            console.error('❌ Ошибка запуска:', error);
        }
    }, 1500);
});

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleFamilyDatabase;
}
