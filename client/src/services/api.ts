import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Game API
export const gameApi = {
  getAllGames: () => api.get('/games'),
  getActiveGames: () => api.get('/games/active'),
  getGameById: (id: string) => api.get(`/games/${id}`),
  createGame: (name: string, maxPlayers: number, creatorId: string) => 
    api.post('/games', { name, maxPlayers, creatorId }),
  addPlayerToGame: (gameId: string, userId: string) => 
    api.post('/games/add-player', { gameId, userId }),
  removePlayerFromGame: (gameId: string, userId: string) => 
    api.post('/games/remove-player', { gameId, userId }),
};

export default api; 