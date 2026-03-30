import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('jwt');
        const username = localStorage.getItem('username');
        const role = localStorage.getItem('role');
        if (token && username && role) {
            return { token, username, role };
        }
        return null;
    });

    const loginUser = useCallback((data) => {
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', data.role);
        setUser({ token: data.token, username: data.username, role: data.role });
    }, []);

    const logoutUser = useCallback(() => {
        localStorage.clear();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loginUser, logoutUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
