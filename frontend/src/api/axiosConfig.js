// src/api/axiosConfig.js
import axios from 'axios';

const api = axios.create({
    // Oyalage .env file eke thiyena backend URL eka
    baseURL: import.meta.env.VITE_BACKEND_URL, 
    
    // Me nisa hama request ekakatama cookies (token) automatically yanawa
    withCredentials: true 
});

export default api; 