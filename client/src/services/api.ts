import axios from 'axios';

// Create an axios instance
const api = axios.create({
  baseURL:'/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
