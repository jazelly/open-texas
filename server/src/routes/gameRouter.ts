import express from 'express';
import * as gameController from '../controllers/gameController.js';

const router = express.Router();

// Game routes
router.get('/', gameController.getAllGames);
router.get('/active', gameController.getActiveGames);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
router.put('/:id/status', gameController.updateGameStatus);
router.put('/:id/history', gameController.updateGameHistory);
router.delete('/:id', gameController.deleteGame);
router.get('/joinable/:id', gameController.getJoinableGameById);
// Game-player relationship routes
router.post('/waiting-room', gameController.addPlayerToWaitingRoom);

export const gameRouter = router;