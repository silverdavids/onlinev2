import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'https://smart-bet/v1',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
});

// Automatically inject token before any request goes out
apiClient.interceptors.request.use(
    (config) => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('auth_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Optional: Global catch for expired tokens (401 Unauthorized)
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('auth_token');
                window.location.href = '/login'; // Force clear and boot back to login
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;