// ============================================
// ПРОСТАЯ БАЗА ДАННЫХ ДЛЯ CONTINENTAL FAMQ
// ГАРАНТИРОВАННОЕ СОХРАНЕНИЕ ДАННЫХ
// ============================================

class SimpleFamilyDatabase {
    constructor() {
        this.SPREADSHEET_ID = '1vqms_IesQDMRxFo1X4byq2f7fFKHtGDd5Q4pUPFD5gI';
        
        // ДУБЛИРУЕМ данные везде для надёжности
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
        
        console.log('🚀 База данных инициализирована');
    }
    
    // ========== ЗАГРУЗКА ==========
    
    async loadSheet(sheetName) {
        try {
            const url = `https://docs.google.com/spreadsheets/d/${this.SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            
            console.log(`📥 Загружаю ${sheetName}:`, url);
            
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const csvText = await response.text();
            console.log(`✅ ${sheetName}: ${csvText.length} символов`);
            
            // СУПЕР-ПРОСТОЙ парсер
            const lines = csvText.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return [];
            
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
                const item = {};
                
                headers.forEach((header, index) => {
                    if (values[index] && values[index] !== '') {
                        item[header] = values[index];
                    }
                });
                
                if (Object.keys(item).length > 0) {
                    data.push(item);
                }
            }
            
            return data;
        } catch (error) {
            console.error(`❌ Ошибка ${sheetName}:`, error.message);
            return [];
        }
    }
    
    // ========== СИНХРОНИЗАЦИЯ ==========
    
    async syncAllData() {
        console.log('🔄 СИНХРОНИЗАЦИЯ ВСЕХ ДАННЫХ...');
        
        // Загружаем ВСЕ таблицы
        const results = await Promise.allSettled([
            this.loadSheet('Пользователи'),
            this.loadSheet('Заявки'),
            this.loadSheet('ЧерныйСписок'),
            this.loadSheet('Новости'),
            this.loadSheet('Чат'),
            this.loadSheet('Роли'),
            this.loadSheet('КодыРолей')
        ]);
        
        // Сохраняем ВО ВСЕ места
        const [users, applications, blacklist, news, chat, roles, codes] = results.map(r => 
            r.status === 'fulfilled' ? r.value : []
        );
        
        // 1. В основной объект
        this.data.users = users;
        this.data.applications = applications;
        this.data.blacklist = blacklist;
        this.data.news = news;
        this.data.chat = chat;
        this.data.roles = roles;
        this.data.codes = codes;
        
        // 2. В свойства для совместимости
        this.users = users;
        this.applications = applications;
        this.blacklist = blacklist;
        this.news = news;
        this.chat = chat;
        this.roles = roles;
        this.codes = codes;
        
        // 3. В localStorage для надёжности
        localStorage.setItem('db_users', JSON.stringify(users));
        localStorage.setItem('db_codes', JSON.stringify(codes));
        localStorage.setItem('db_roles', JSON.stringify(roles));
        localStorage.setItem('db_last_sync', Date.now().toString());
        
        // 4. В глобальную переменную
        window.famqData = this.data;
        
        console.log('📊 РЕЗУЛЬТАТЫ:');
        console.log('👥 Пользователи:', users.length);
        console.log('🎭 Роли:', roles.length);
        console.log('🔑 Коды:', codes.length);
        
        // НАХОДИМ ТЕБЯ И СОХРАНЯЕМ
        this.findAndSaveUser();
        
        return this.data;
    }
    
    // ========== НАЙТИ И СОХРАНИТЬ ПОЛЬЗОВАТЕЛЯ ==========
    
    findAndSaveUser() {
        const users = this.data.users;
        
        // Ищем тебя по разным вариантам ID
        const me = users.find(u => 
            u.discordId === "913464996267180092" ||
            u.discordid === "913464996267180092" ||
            u.username === "exxy66"
        );
        
        if (me) {
            console.log('🎉 НАЙДЕН ПОЛЬЗОВАТЕЛЬ:', me);
            
            // ГАРАНТИРОВАННОЕ СОХРАНЕНИЕ
            localStorage.setItem('userRole', me.role || 'admin');
            localStorage.setItem('currentUser', JSON.stringify(me));
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('famq_current_user_id', me.id || '1');
            
            // Если админ в таблице - сохраняем это
            if (me.role === 'admin') {
                localStorage.setItem('isAdmin', 'true');
                console.log('👑 СОХРАНЕНО: ТЫ АДМИН!');
            }
            
            // Событие для интерфейса
            window.dispatchEvent(new CustomEvent('userDataLoaded', { detail: me }));
        } else {
            console.log('⚠️ ПОЛЬЗОВАТЕЛЬ НЕ НАЙДЕН В БАЗЕ');
        }
    }
    
    // ========== ГЕТТЕРЫ ==========
    
    async getUsers() {
        if (this.data.users.length === 0) await this.syncAllData();
        return this.data.users;
    }
    
    async getRoleCodes() {
        if (this.data.codes.length === 0) await this.syncAllData();
        return this.data.codes;
    }
    
    async getRoles() {
        if (this.data.roles.length === 0) await this.syncAllData();
        return this.data.roles;
    }
    
    // ========== СОВМЕСТИМОСТЬ ==========
    
    async testConnection() {
        console.log('🔍 Проверка подключения...');
        try {
            await this.syncAllData();
            return this.data.users.length > 0;
        } catch (e) {
            return false;
        }
    }
    
    async syncAll() {
        return await this.syncAllData();
    }
    
    async initialize() {
        console.log('🚀 ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ...');
        const data = await this.syncAllData();
        console.log('✅ БАЗА ДАННЫХ ГОТОВА');
        return data;
    }
    
    // ========== УТИЛИТЫ ==========
    
    getStatus() {
        return {
            users: this.data.users.length,
            roles: this.data.roles.length,
            codes: this.data.codes.length,
            timestamp: new Date().toLocaleTimeString()
        };
    }
}

// ========== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ==========

// Создаём и сразу сохраняем в несколько мест
window.FamilyDatabase = new SimpleFamilyDatabase();
window.database = window.FamilyDatabase;
window.db = window.FamilyDatabase.data;

// Автоматическая загрузка при старте
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 СТРАНИЦА ЗАГРУЖЕНА');
    
    setTimeout(async () => {
        try {
            // 1. Загружаем данные
            await window.FamilyDatabase.initialize();
            
            // 2. Проверяем что сохранилось
            console.log('🔍 ПРОВЕРКА СОХРАНЕНИЯ:');
            console.log('localStorage userRole:', localStorage.getItem('userRole'));
            console.log('database.users:', window.FamilyDatabase.data.users.length);
            
            // 3. Если роль не сохранилась - принудительно
            if (!localStorage.getItem('userRole')) {
                const me = window.FamilyDatabase.data.users.find(u => 
                    u.discordId === "913464996267180092"
                );
                if (me) {
                    localStorage.setItem('userRole', me.role || 'admin');
                    console.log('🔄 РОЛЬ ПРИНУДИТЕЛЬНО СОХРАНЕНА:', me.role);
                }
            }
            
            // 4. Событие завершения
            window.dispatchEvent(new Event('databaseReady'));
            
        } catch (error) {
            console.error('❌ ОШИБКА:', error);
        }
    }, 1000);
});
