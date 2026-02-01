import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Configuration
// ============================================
// USANDO O IP DA SUA MÁQUINA para acesso via celular/emulador
const BASE_URL = 'http://192.168.15.24:3000/api/v1';

const TOKEN_KEY = '@petoo_token';
const USER_KEY = '@petoo_user';

// ============================================
// Token Management
// ============================================

export const getToken = async () => {
    try {
        return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
};

export const setToken = async (token) => {
    try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
        console.error('Error saving token:', error);
    }
};

export const clearToken = async () => {
    try {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
        console.error('Error clearing token:', error);
    }
};

export const getStoredUser = async () => {
    try {
        const userData = await AsyncStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting stored user:', error);
        return null;
    }
};

export const setStoredUser = async (user) => {
    try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
        console.error('Error saving user:', error);
    }
};

// ============================================
// Core API Request Function
// ============================================

/**
 * Makes an authenticated API request
 * @param {string} endpoint - API endpoint (e.g., '/auth/otp/request')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {object} body - Request body for POST/PUT
 * @param {object} options - Additional options (skipAuth, etc.)
 * @returns {Promise<object>} - Response data
 */
export const apiRequest = async (endpoint, method = 'GET', body = null, options = {}) => {
    const url = `${BASE_URL}${endpoint}`;

    const headers = {
        'Content-Type': 'application/json',
    };

    // Add auth token if available and not skipped
    if (!options.skipAuth) {
        const token = await getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
    }

    const config = {
        method,
        headers,
    };

    if (body && (method === 'POST' || method === 'PUT')) {
        // Garantir que o body é um objeto válido e serializar corretamente
        try {
            const serialized = JSON.stringify(body);
            config.body = serialized;
            console.log(`[API] ${method} ${endpoint}`, serialized.substring(0, 200));
        } catch (error) {
            console.error('[API] Error serializing body:', error);
            throw new Error('Invalid request body');
        }
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.message || data.error || 'Request failed');
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    } catch (error) {
        console.error(`[API Error] ${method} ${endpoint}:`, error.message);
        throw error;
    }
};

// ============================================
// Auth - OTP (Clients)
// ============================================

/**
 * Request OTP code for phone authentication
 * @param {string} phone - Phone number in E.164 format (e.g., +5511999998888)
 */
export const requestOtp = async (phone) => {
    return apiRequest('/auth/otp/request', 'POST', { phone }, { skipAuth: true });
};

/**
 * Verify OTP and get JWT token
 * @param {string} phone - Phone number
 * @param {string} code - 6-digit OTP code (can be token or code key)
 */
export const verifyOtp = async (phone, code) => {
    const response = await apiRequest('/auth/otp/verify', 'POST', { phone, token: code }, { skipAuth: true });

    // Store token and user data
    if (response.token) {
        await setToken(response.token);
    }
    if (response.client) {
        await setStoredUser(response.client);
    }

    return response;
};

/**
 * Get current client profile
 */
export const getClientProfile = async () => {
    return apiRequest('/auth/client/me', 'GET');
};

/**
 * Update current client profile
 * @param {object} profileData - { name, email, latitude, longitude }
 */
export const updateClientProfile = async (profileData) => {
    return apiRequest('/auth/client/me', 'PUT', profileData);
};

// ============================================
// Auth - Enterprise
// ============================================

/**
 * Enterprise user login
 * @param {string} email
 * @param {string} password
 */
export const enterpriseLogin = async (email, password) => {
    const response = await apiRequest('/auth/enterprise/login', 'POST', { email, password }, { skipAuth: true });

    if (response.token) {
        await setToken(response.token);
    }

    return response;
};

/**
 * Register new enterprise with master user
 * @param {object} data - { enterprise: {...}, user: {...}, inviteCode }
 */
export const registerEnterprise = async (data) => {
    return apiRequest('/auth/enterprise/register', 'POST', data);
};

/**
 * Get current enterprise user info
 */
export const getEnterpriseProfile = async () => {
    return apiRequest('/auth/enterprise/me', 'GET');
};

// ============================================
// Auth - Admin (Dev / Platform)
// ============================================

/**
 * Login as Platform Admin (Dev Only)
 */
export const devPlatformLogin = async () => {
    const response = await apiRequest('/auth/dev-platform-login', 'GET', null, { skipAuth: true });
    if (response.token) {
        await setToken(response.token);
    }
    return response;
};

/**
 * List pending invite requests (Master/Admin only)
 */
export const getPendingInvites = async () => {
    return apiRequest('/invites/pending', 'GET');
};

/**
 * Approve an invite request
 * @param {string} id - Invite Request ID
 */
export const approveInvite = async (id) => {
    return apiRequest(`/invites/${id}/approve`, 'POST');
};

/**
 * Reject an invite request
 * @param {string} id - Invite Request ID
 */
export const rejectInvite = async (id) => {
    return apiRequest(`/invites/${id}/reject`, 'POST');
};

// ============================================
// Client Pets
// ============================================

/**
 * Get all pets for the authenticated client
 */
export const getClientPets = async () => {
    return apiRequest('/client/pets', 'GET');
};

/**
 * Create a new pet
 * @param {object} petData - { name, species, breed, birth_date, weight, gender, notes }
 */
export const createPet = async (petData) => {
    return apiRequest('/client/pets', 'POST', petData);
};

/**
 * Get pet details by ID
 * @param {string} petId
 */
export const getPetById = async (petId) => {
    return apiRequest(`/client/pets/${petId}`, 'GET');
};

/**
 * Update an existing pet
 * @param {string} petId
 * @param {object} petData
 */
export const updatePet = async (petId, petData) => {
    return apiRequest(`/client/pets/${petId}`, 'PUT', petData);
};

/**
 * Delete a pet
 * @param {string} petId
 */
export const deletePet = async (petId) => {
    return apiRequest(`/client/pets/${petId}`, 'DELETE');
};

// ============================================
// Client Appointments
// ============================================

/**
 * Get all appointments for the authenticated client
 */
export const getClientAppointments = async () => {
    return apiRequest('/client/appointments', 'GET');
};

/**
 * Create a new appointment
 * @param {object} appointmentData - { service_id, professional_id, pet_id, scheduled_date, notes }
 */
export const createAppointment = async (appointmentData) => {
    return apiRequest('/client/appointments', 'POST', appointmentData);
};

/**
 * Cancel an appointment
 * @param {string} appointmentId
 */
export const cancelAppointment = async (appointmentId) => {
    return apiRequest(`/client/appointments/${appointmentId}/cancel`, 'POST');
};

// ============================================
// Discovery - Enterprises
// ============================================

/**
 * List all active enterprises (public)
 */
export const getEnterprises = async () => {
    return apiRequest('/enterprises', 'GET', null, { skipAuth: true });
};

/**
 * Get enterprise details by slug (public)
 * @param {string} slug
 */
export const getEnterpriseBySlug = async (slug) => {
    return apiRequest(`/enterprises/${slug}`, 'GET', null, { skipAuth: true });
};

/**
 * Get services of an enterprise
 * @param {string} enterpriseId
 */
export const getEnterpriseServices = async (enterpriseId) => {
    return apiRequest(`/client/enterprises/${enterpriseId}/services`, 'GET');
};

/**
 * Get professionals of an enterprise
 * @param {string} enterpriseId
 */
export const getEnterpriseProfessionals = async (enterpriseId) => {
    return apiRequest(`/client/enterprises/${enterpriseId}/professionals`, 'GET');
};

/**
 * Find nearby enterprises
 */
export const getNearbyEnterprises = async () => {
    return apiRequest('/client/discover/nearby', 'GET');
};

// ============================================
// Services (Public)
// ============================================

/**
 * List all services (public)
 */
export const getServices = async () => {
    return apiRequest('/services', 'GET', null, { skipAuth: true });
};

// ============================================
// Professionals (Public)
// ============================================

/**
 * List all professionals (public)
 */
export const getProfessionals = async () => {
    return apiRequest('/professionals', 'GET', null, { skipAuth: true });
};

// ============================================
// Wallet
// ============================================

/**
 * Get wallet balance
 */
export const getWalletBalance = async () => {
    return apiRequest('/wallet/balance', 'GET');
};

/**
 * Get transaction history
 */
export const getWalletTransactions = async () => {
    return apiRequest('/wallet/transactions', 'GET');
};

// ============================================
// Legacy API Object (backward compatibility)
// ============================================

export const api = {
    // Health Check
    healthCheck: async () => {
        try {
            const response = await fetch(`${BASE_URL.replace('/api/v1', '')}/health`);
            return await response.json();
        } catch (error) {
            console.error('Erro no Health Check:', error);
            return { status: 'error' };
        }
    },

    // Legacy methods (redirect to new functions)
    getServices,
    getAppointments: getClientAppointments,
    getProfessionals,
    createService: async (serviceData) => apiRequest('/services', 'POST', serviceData),
    createAppointment,
};
