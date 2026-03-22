class AuthManager {
    constructor() {
        // Use the same keys everywhere so session data stays consistent
        this.USERS_KEY = 'registeredUsers';
        this.SESSION_KEY = 'currentSession';
        this.POINTS_KEY_PREFIX = 'userPoints_';
    }

    // Get all registered users
    getUsers() {
        try {
            const raw = localStorage.getItem(this.USERS_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.warn('Failed to parse users', e);
            return [];
        }
    }

    // Persist users
    saveUsers(users) {
        localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    }

    // Simple password hash (demo only — not for production)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            hash = (hash << 5) - hash + password.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString();
    }

    // Register a new user
    register(name, email, password) {
        const cleanName = (name || '').trim();
        const cleanEmail = (email || '').trim().toLowerCase();
        if (!cleanName || !cleanEmail || !password) {
            return { success: false, message: 'All fields are required.' };
        }

        const users = this.getUsers();
        if (users.some(u => (u.email || '').toLowerCase() === cleanEmail)) {
            return { success: false, message: 'Email already registered.' };
        }

        const newUser = {
            id: Date.now(),
            name: cleanName,
            email: cleanEmail,
            password: this.hashPassword(password),
            createdAt: new Date().toISOString(),
            loginCount: 0,
        };

        users.push(newUser);
        this.saveUsers(users);
        return { success: true, message: 'Registered!' };
    }

    // Login user
    login(email, password) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const users = this.getUsers();
        const user = users.find(u => (u.email || '').toLowerCase() === cleanEmail);

        if (!user) return { success: false, message: 'User not found.' };

        const hashed = this.hashPassword(password);
        const matchesHashed = user.password === hashed;
        const matchesPlain = user.password === password; // for legacy records
        if (!matchesHashed && !matchesPlain) {
            return { success: false, message: 'Incorrect password.' };
        }

        // migrate legacy plain-text password to hashed
        if (matchesPlain && !matchesHashed) {
            user.password = hashed;
        }

        user.loginCount = (user.loginCount || 0) + 1;
        user.lastLogin = new Date().toISOString();
        this.saveUsers(users);

        const session = {
            userId: user.id,
            email: user.email,
            name: user.name,
            loginTime: new Date().toISOString(),
        };
        sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
        return { success: true, message: 'Login successful!' };
    }

    // Session helpers
    isLoggedIn() {
        return !!sessionStorage.getItem(this.SESSION_KEY);
    }

    getSession() {
        try {
            const raw = sessionStorage.getItem(this.SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    getCurrentUser() {
        const session = this.getSession();
        if (!session) return null;
        const users = this.getUsers();
        return users.find(u => u.id === session.userId) || null;
    }

    logout() {
        sessionStorage.removeItem(this.SESSION_KEY);
    }

    // Basic quiz points tracking per user
    getPoints(userId) {
        if (!userId) return 0;
        const raw = localStorage.getItem(`${this.POINTS_KEY_PREFIX}${userId}`);
        const parsed = raw ? parseInt(raw, 10) : 0;
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    addPoints(userId, amount = 0) {
        if (!userId) {
            console.log('Points earned (no user session):', amount);
            return 0;
        }
        const current = this.getPoints(userId);
        const updated = current + amount;
        localStorage.setItem(`${this.POINTS_KEY_PREFIX}${userId}`, updated.toString());
        console.log(`Points for user ${userId}:`, updated);
        return updated;
    }

    // Optional: routine helpers used by routine page if available
    saveRoutine(data) {
        const session = this.getSession();
        if (!session) return;
        const key = `routine_${session.userId}`;
        localStorage.setItem(key, JSON.stringify(data || {}));
    }

    getRoutine() {
        const session = this.getSession();
        if (!session) return null;
        const key = `routine_${session.userId}`;
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    }
}