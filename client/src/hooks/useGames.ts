import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameApi } from '../services/api';

export const useGames = () => {
  return useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      const response = await gameApi.getAllGames();
      return response.data;
    },
  });
};

export const useActiveGames = (options = {}) => {
  return useQuery({
    queryKey: ['games', 'active'],
    queryFn: async () => {
      const response = await gameApi.getActiveGames();
      return response.data;
    },
    refetchInterval: 10000, // Poll every 10 seconds
    ...options,
  });
};

export const useGame = (id: string, options = {}) => {
  return useQuery({
    queryKey: ['games', id],
    queryFn: async () => {
      const response = await gameApi.getGameById(id);
      return response.data;
    },
    enabled: !!id,
    ...options,
  });
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, maxPlayers, creatorId }: { name: string, maxPlayers: number, creatorId: string }) => {
      const response = await gameApi.createGame(name, maxPlayers, creatorId);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch games queries
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
};

export const useAddPlayerToGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameId, userId }: { gameId: string, userId: string }) => {
      const response = await gameApi.addPlayerToGame(gameId, userId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific game and games list
      queryClient.invalidateQueries({ queryKey: ['games', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
};

export const useRemovePlayerFromGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ gameId, userId }: { gameId: string, userId: string }) => {
      const response = await gameApi.removePlayerFromGame(gameId, userId);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific game and games list
      queryClient.invalidateQueries({ queryKey: ['games', variables.gameId] });
      queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });
}; 