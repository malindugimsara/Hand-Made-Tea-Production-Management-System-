// src/api/axiosConfig.js
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    // withCredentials: true, <-- මෙතන කමෙන්ට් කරන්න හෝ ඉවත් කරන්න!
});

// Request Interceptor: සෑම API ඇමතුමක්ම Backend එකට යන්න කලින් මේක වැඩ කරනවා
api.interceptors.request.use(
    (config) => {
        // LocalStorage එකෙන් Token එක ගන්නවා
        const token = localStorage.getItem('token');
        if (token) {
            // Header එකට 'Bearer <token>' විදිහට සෙට් කරනවා
            config.headers['Authorization'] = `Bearer ${token}`; 
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;