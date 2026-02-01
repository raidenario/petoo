import React, { createContext, useState, useContext, useEffect } from 'react';
import { getToken, setToken, clearToken, getStoredUser, setStoredUser } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setTokenState] = useState(null);
    const [profiles, setProfiles] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null); // 'CLIENT', 'ENTERPRISE', 'PROFESSIONAL'
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing token on app start
    useEffect(() => {
        const loadStoredAuth = async () => {
            try {
                const storedToken = await getToken();
                const storedUser = await getStoredUser();

                if (storedToken) {
                    setTokenState(storedToken);
                }
                if (storedUser) {
                    setUser(storedUser);
                }
            } catch (error) {
                console.error('Error loading stored auth:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadStoredAuth();
    }, []);

    const login = async (authData) => {
        // authData comes from verify-otp or enterprise login
        // { token, profiles, is_new_user, client/user }

        if (authData.token) {
            setTokenState(authData.token);
            await setToken(authData.token);
        }

        // Handle client auth response
        if (authData.client) {
            setUser(authData.client);
            await setStoredUser(authData.client);
        }

        // Handle enterprise auth response
        if (authData.user && !authData.client) {
            setUser(authData.user);
            await setStoredUser(authData.user);
        }

        setProfiles(authData.profiles || []);
    };

    const updateUser = async (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
        const updatedUser = { ...user, ...userData };
        await setStoredUser(updatedUser);
    };

    const selectRole = (roleProfile) => {
        setSelectedRole(roleProfile);
        // Here we might need to swap tokens if we implement distinct tokens per role
    };

    const logout = async () => {
        setUser(null);
        setTokenState(null);
        setProfiles([]);
        setSelectedRole(null);
        await clearToken();
    };

    const isAuthenticated = !!token;

    return (
        <AuthContext.Provider value={{
            user,
            token,
            profiles,
            selectedRole,
            isLoading,
            isAuthenticated,
            login,
            updateUser,
            selectRole,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
