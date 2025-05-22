import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL:'/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// User API
export const userApi = {
  getCurrentUser: () => api.get('/users/me'),
  // Username parameter can be either username or email
  login: (username: string, password: string) => 
    api.post('/users/signin', { username, password }),
  signup: (name: string, email: string | null, password: string) => 
    api.post('/users/signup', { name, email, password }),
};

// Game API
export const gameApi = {
  getAllGames: () => api.get('/games'),
  getActiveGames: () => api.get('/games/active'),
  getGameById: (id: string) => api.get(`/games/${id}`),
  getJoinableGameById: (id: string) => api.get(`/games/joinable/${id}`),
  createGame: (name: string, maxPlayers: number, creatorId: string) => 
    api.post('/games', { name, maxPlayers, creatorId }),
  removePlayerFromGame: (gameId: string, userId: string) => 
    api.post('/games/remove-player', { gameId, userId }),
};

export default api; 
