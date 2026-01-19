// ============================================
// SIMPLE FAMILY DATABASE v3.0
// РАБОТАЕТ ТОЛЬКО ЧЕРЕЗ GOOGLE APPS SCRIPT
// БЕЗ LOCALSTORAGE - ТОЛЬКО GOOGLE ТАБЛИЦЫ
// ============================================

class SimpleFamilyDatabase {
    constructor() {
        // ЗАМЕНИ НА СВОЙ URL GOOGLE APPS SCRIPT!
        this.API_URL = 'https://script.google.com/macros/s/AKfycbz8wErAM81wt4n5V_lgCgwmCXrF4Z6u7cMuLip35z-MVegHkWuRKaN84urGg2vwReWx/exec';
        
        // Данные в памяти (кеш)
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
        this.currentUser = null;
        
        console.log('🚀 SimpleFamilyDatabase v3.0 инициализирован');
        console.log('📡 API URL:', this.API_URL);
    }
    
    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    /**
     * Загружает все данные через Google Apps Script API
     */
    async load() {
        console.log('🔄 Загрузка данных из Google Таблиц...');
        
        try {
            // Отправляем запрос к Google Apps Script
            const response = await fetch(`${this.API_URL}?action=getAllData&timestamp=${Date.now()}`, {
                method: 'GET',
                cache: 'no-cache'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // Обновляем данные
                Object.keys(this.data).forEach(key => {
                    this.data[key] = result.data[key] || [];
                });
                
                // Обновляем ссылки
                this.users = this.data.users;
                this.applications = this.data.applications;
                this.blacklist = this.data.blacklist;
                this.news = this.data.news;
                this.chat = this.data.chat;
                this.roles = this.data.roles;
                this.codes = this.data.codes;
                
                this.loaded = true;
                
                console.log('✅ Данные загружены успешно!');
                console.log(`👥 Пользователи: ${this.data.users.length}`);
                console.log(`📝 Заявки: ${this.data.applications.length}`);
                console.log(`📰 Новости: ${this.data.news.length}`);
                
                // Находим текущего пользователя
                this.findCurrentUser();
                
                // Отправляем событие
                this.triggerEvent('databaseLoaded', this.data);
                
                return this.data;
            } else {
                throw new Error(result.error || 'Неизвестная ошибка API');
            }
            
        } catch (error) {
            console.error('❌ Ошибка загрузки данных:', error);
            
            // Если данные уже были загружены ранее, используем их
            if (this.loaded) {
                console.log('⚠️ Использую ранее загруженные данные');
                return this.data;
            }
            
            throw error;
        }
    }
    
    /**
     * Регистрирует нового пользователя
     */
    async registerUser(userData) {
        console.log('👤 Регистрация нового пользователя:', userData);
        
        try {
            // Проверяем обязательные поля
            if (!userData.discordId && !userData.discordid) {
                throw new Error('Требуется Discord ID');
            }
            
            if (!userData.username) {
                throw new Error('Требуется имя пользователя');
            }
            
            // Проверяем, нет ли уже такого пользователя
            const discordId = userData.discordId || userData.discordid;
            const existingUser = await this.findUserByDiscordId(discordId);
            
            if (existingUser) {
                return {
                    success: false,
                    error: 'Пользователь с таким Discord ID уже существует'
                };
            }
            
            // Формируем полные данные
            const fullUserData = {
                discordId: discordId,
                discordid: discordId, // дублируем для совместимости
                username: userData.username,
                avatar: userData.avatar || '',
                role: userData.role || 'user',
                balance: userData.balance || 0,
                joinDate: new Date().toISOString().split('T')[0],
                lastLogin: new Date().toISOString(),
                status: 'active',
                email: userData.email || '',
                phone: userData.phone || '',
                bio: userData.bio || '',
                country: userData.country || '',
                createdAt: new Date().toISOString()
            };
            
            // Отправляем в Google Apps Script
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
                console.log('✅ Пользователь успешно зарегистрирован!');
                
                // Обновляем локальные данные
                await this.load();
                
                // Устанавливаем как текущего пользователя
                const newUser = await this.findUserByDiscordId(discordId);
                if (newUser) {
                    this.currentUser = newUser;
                    this.triggerEvent('userRegistered', newUser);
                }
                
                return {
                    success: true,
                    message: 'Регистрация успешна!',
                    userId: result.userId,
                    user: newUser
                };
            } else {
                throw new Error(result.error || 'Ошибка регистрации');
            }
            
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            return {
                success: false,
                error: error.message,
                message: 'Не удалось зарегистрировать пользователя'
            };
        }
    }
    
    /**
     * Авторизация пользователя
     */
    async login(discordId) {
        console.log('🔐 Авторизация пользователя:', discordId);
        
        try {
            await this.load(); // Обновляем данные
            
            const user = await this.findUserByDiscordId(discordId);
            
            if (user) {
                // Обновляем lastLogin
                await this.updateUser(user.id || discordId, {
                    lastLogin: new Date().toISOString()
                });
                
                this.currentUser = user;
                this.triggerEvent('userLoggedIn', user);
                
                return {
                    success: true,
                    user: user
                };
            } else {
                return {
                    success: false,
                    error: 'Пользователь не найден'
                };
            }
        } catch (error) {
            console.error('❌ Ошибка авторизации:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ========== ПОИСК И ПОЛУЧЕНИЕ ДАННЫХ ==========
    
    /**
     * Находит пользователя по Discord ID
     */
    async findUserByDiscordId(discordId) {
        if (!this.loaded) {
            await this.load();
        }
        
        return this.data.users.find(user => 
            user.discordId === discordId || 
            user.discordid === discordId ||
            user.id === discordId
        ) || null;
    }
    
    /**
     * Находит пользователя по имени
     */
    async findUserByUsername(username) {
        if (!this.loaded) {
            await this.load();
        }
        
        return this.data.users.find(user => 
            user.username && user.username.toLowerCase() === username.toLowerCase()
        ) || null;
    }
    
    /**
     * Получает всех пользователей
     */
    async getUsers() {
        if (!this.loaded) {
            await this.load();
        }
        return this.data.users;
    }
    
    /**
     * Получает все заявки
     */
    async getApplications() {
        if (!this.loaded) {
            await this.load();
        }
        return this.data.applications;
    }
    
    /**
     * Получает все новости
     */
    async getNews() {
        if (!this.loaded) {
            await this.load();
        }
        return this.data.news;
    }
    
    /**
     * Получает все сообщения чата
     */
    async getChat() {
        if (!this.loaded) {
            await this.load();
        }
        return this.data.chat;
    }
    
    // ========== ОПЕРАЦИИ С ДАННЫМИ ==========
    
    /**
     * Добавляет заявку
     */
    async addApplication(applicationData) {
        return await this.addData('applications', applicationData);
    }
    
    /**
     * Добавляет новость
     */
    async addNews(newsData) {
        return await this.addData('news', newsData);
    }
    
    /**
     * Добавляет сообщение в чат
     */
    async addChatMessage(messageData) {
        return await this.addData('chat', messageData);
    }
    
    /**
     * Общий метод для добавления данных
     */
    async addData(dataType, itemData) {
        try {
            console.log(`📤 Добавление в ${dataType}:`, itemData);
            
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'addData',
                    dataType: dataType,
                    data: itemData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Обновляем локальные данные
                await this.load();
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error(`❌ Ошибка добавления в ${dataType}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Обновляет данные пользователя
     */
    async updateUser(userId, updateData) {
        try {
            console.log(`🔄 Обновление пользователя ${userId}:`, updateData);
            
            const response = await fetch(this.API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateUser',
                    userId: userId,
                    updateData: updateData
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Обновляем локальные данные
                await this.load();
                return result;
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('❌ Ошибка обновления пользователя:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    // ========== УТИЛИТЫ ==========
    
    /**
     * Находит текущего пользователя (тебя)
     */
    async findCurrentUser() {
        // Твои данные для поиска
        const myDiscordId = "913464996267180092";
        const myUsername = "exxy66";
        
        if (!this.loaded) {
            await this.load();
        }
        
        // Ищем тебя в базе
        const user = this.data.users.find(u => 
            (u.discordId && u.discordId === myDiscordId) ||
            (u.discordid && u.discordid === myDiscordId) ||
            (u.username && u.username.toLowerCase() === myUsername.toLowerCase())
        );
        
        if (user) {
            this.currentUser = user;
            console.log('🎉 Найден пользователь:', user.username);
            this.triggerEvent('currentUserFound', user);
            return user;
        } else {
            console.log('⚠️ Пользователь не найден в базе');
            return null;
        }
    }
    
    /**
     * Проверяет права пользователя
     */
    async checkPermission(userId, permission) {
        const user = await this.findUserByDiscordId(userId);
        
        if (!user) return false;
        
        const permissions = {
            admin: ['manage_users', 'manage_applications', 'create_news', 'manage_chat', 'view_admin_panel'],
            moderator: ['manage_applications', 'manage_chat'],
            user: ['view_chat', 'create_application']
        };
        
        const userPermissions = permissions[user.role] || permissions.user;
        return userPermissions.includes(permission);
    }
    
    /**
     * Обновляет данные (перезагрузка)
     */
    async refresh() {
        console.log('🔄 Принудительное обновление данных...');
        return await this.load();
    }
    
    /**
     * Отправляет событие
     */
    triggerEvent(eventName, data) {
        window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }
    
    /**
     * Получает статус базы
     */
    getStatus() {
        return {
            loaded: this.loaded,
            users: this.data.users.length,
            applications: this.data.applications.length,
            news: this.data.news.length,
            currentUser: this.currentUser ? this.currentUser.username : 'Не авторизован',
            timestamp: new Date().toLocaleTimeString()
        };
    }
}

// ========== ГЛОБАЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ==========

// Создаем глобальный экземпляр
window.FamilyDatabase = new SimpleFamilyDatabase();
window.database = window.FamilyDatabase;

// Автоматическая загрузка при старте
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 Страница загружена, инициализирую базу данных...');
    
    // Задержка для полной загрузки страницы
    setTimeout(async () => {
        try {
            await window.FamilyDatabase.load();
            console.log('✅ База данных готова к работе!');
            console.log('📊 Статус:', window.FamilyDatabase.getStatus());
        } catch (error) {
            console.error('❌ Не удалось загрузить базу данных:', error);
            console.log('⚠️ Приложение будет работать в автономном режиме');
        }
    }, 1000);
});

// Экспорт для модулей
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SimpleFamilyDatabase;
}
