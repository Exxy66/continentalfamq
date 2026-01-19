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
            
            // Преобразуем CSV в массив объектов
            return this.parseCSV(csvText);
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки ${sheetName}:`, error.message);
            return []; // Возвращаем пустой массив при ошибке
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
    
    // ========== ПРЯМАЯ СИНХРОНИЗАЦИЯ ==========
    
    async syncAllData() {
        console.log('🔄 Начинаю синхронизацию всех данных...');
        
        let successCount = 0;
        let errorCount = 0;
        
        // Загружаем каждую таблицу и сохраняем в свойства
        try {
            // 1. Пользователи
            try {
                this.users = await this.loadSheet(this.sheets.users);
                console.log(`✅ Пользователи: ${this.users.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки пользователей:', error);
                errorCount++;
            }
            
            // 2. Заявки
            try {
                this.applications = await this.loadSheet(this.sheets.applications);
                console.log(`✅ Заявки: ${this.applications.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки заявок:', error);
                errorCount++;
            }
            
            // 3. Черный список
            try {
                this.blacklist = await this.loadSheet(this.sheets.blacklist);
                console.log(`✅ Черный список: ${this.blacklist.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки черного списка:', error);
                errorCount++;
            }
            
            // 4. Новости
            try {
                this.news = await this.loadSheet(this.sheets.news);
                console.log(`✅ Новости: ${this.news.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки новостей:', error);
                errorCount++;
            }
            
            // 5. Чат
            try {
                this.chat = await this.loadSheet(this.sheets.chat);
                console.log(`✅ Чат: ${this.chat.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки чата:', error);
                errorCount++;
            }
            
            // 6. Роли
            try {
                this.roles = await this.loadSheet(this.sheets.roles);
                console.log(`✅ Роли: ${this.roles.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки ролей:', error);
                errorCount++;
            }
            
            // 7. КодыРолей
            try {
                this.codes = await this.loadSheet(this.sheets.roleCodes);
                console.log(`✅ КодыРолей: ${this.codes.length} записей`);
                successCount++;
            } catch (error) {
                console.error('❌ Ошибка загрузки кодов ролей:', error);
                errorCount++;
            }
            
            // ИТОГ
            console.log(`📊 Результат: ${successCount} успешно, ${errorCount} с ошибками`);
            
            if (errorCount === 0) {
                console.log('✅ Все данные синхронизированы!');
            } else {
                console.log(`⚠️ Синхронизация завершена с ${errorCount} ошибками`);
            }
            
            // Автоматически обновляем роль текущего пользователя
            this.updateCurrentUserRole();
            
            return {
                success: successCount,
                errors: errorCount,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Критическая ошибка синхронизации:', error);
            return { success: 0, errors: 7, error: error.message };
        }
    }
    
    // ========== МЕТОДЫ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ==========
    // Теперь просто возвращают данные из свойств
    
    async getUsers() {
        if (this.users.length === 0) {
            await this.syncAllData();
        }
        return this.users;
    }
    
    async getApplications() {
        if (this.applications.length === 0) {
            await this.syncAllData();
        }
        return this.applications;
    }
    
    async getBlacklist() {
        if (this.blacklist.length === 0) {
            await this.syncAllData();
        }
        return this.blacklist;
    }
    
    async getNews() {
        if (this.news.length === 0) {
            await this.syncAllData();
        }
        return this.news;
    }
    
    async getChat() {
        if (this.chat.length === 0) {
            await this.syncAllData();
        }
        return this.chat;
    }
    
    async getRoles() {
        if (this.roles.length === 0) {
            await this.syncAllData();
        }
        return this.roles;
    }
    
    async getRoleCodes() {
        if (this.codes.length === 0) {
            await this.syncAllData();
        }
        return this.codes;
    }
    
    // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ==========
    
    // Обновляет роль текущего пользователя из таблицы
    async updateCurrentUserRole() {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
            
            if (currentUser.discordid) {
                const userInDB = this.users.find(u => u.discordid === currentUser.discordid);
                
                if (userInDB && userInDB.role !== currentUser.role) {
                    console.log(`🔄 Обновляю роль пользователя ${userInDB.username}: ${currentUser.role} → ${userInDB.role}`);
                    
                    // Обновляем в localStorage
                    localStorage.setItem('userRole', userInDB.role);
                    localStorage.setItem('currentUser', JSON.stringify(userInDB));
                    
                    // Отправляем событие об обновлении
                    this.triggerEvent('userRoleUpdated', userInDB);
                }
            }
        } catch (error) {
            console.warn('Не удалось обновить роль пользователя:', error);
        }
    }
    
    // Ищет пользователя по discordid
    async findUserByDiscordId(discordid) {
        if (this.users.length === 0) {
            await this.syncAllData();
        }
        return this.users.find(user => user.discordid === discordid.toString());
    }
    
    // Ищет пользователя по username
    async findUserByUsername(username) {
        if (this.users.length === 0) {
            await this.syncAllData();
        }
        return this.users.find(user => user.username.toLowerCase() === username.toLowerCase());
    }
    
    // Проверяет код роли
    async validateRoleCode(code) {
        if (this.codes.length === 0) {
            await this.syncAllData();
        }
        
        return this.codes.find(c => 
            c.role === code || 
            c.code === code || 
            c.roleKey === code
        );
    }
    
    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    
    // Отправляет событие
    triggerEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }
    
    // Получает информацию о состоянии
    getStatus() {
        return {
            users: this.users.length,
            applications: this.applications.length,
            blacklist: this.blacklist.length,
            news: this.news.length,
            chat: this.chat.length,
            roles: this.roles.length,
            codes: this.codes.length,
            timestamp: new Date().toISOString()
        };
    }
    
    // ========== ИНИЦИАЛИЗАЦИЯ ==========
    
    async initialize() {
        console.log('🚀 Инициализация базы данных...');
        
        try {
            const result = await this.syncAllData();
            console.log('✅ База данных инициализирована');
            console.log('📊 Статус:', this.getStatus());
            return result;
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            return { success: false, error: error.message };
        }
    }
}

// Создаем глобальный экземпляр базы данных
window.FamilyDatabase = new SimpleFamilyDatabase();

// Автоматическая инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Страница загружена, инициализирую базу данных...');
    
    // Даем странице немного загрузиться
    setTimeout(async () => {
        await window.FamilyDatabase.initialize();
        
        // Проверяем и обновляем роль текущего пользователя
        await window.FamilyDatabase.updateCurrentUserRole();
        
        console.log('✅ Готово! Данные загружены из таблицы.');
    }, 1000);
});
