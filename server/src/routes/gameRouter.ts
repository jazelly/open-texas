import express from 'express';
import * as gameController from '../controllers/gameController';

const router = express.Router();

// Game routes
router.get('/', gameController.getAllGames);
router.get('/active', gameController.getActiveGames);
router.get('/:id', gameController.getGameById);
router.post('/', gameController.createGame);
router.put('/:id/status', gameController.updateGameStatus);
router.put('/:id/history', gameController.updateGameHistory);
router.delete('/:id', gameController.deleteGame);

// Game-player relationship routes
router.post('/waiting-room', gameController.addPlayerToWaitingRoom);
router.post('/add-player', gameController.addPlayerToGame);
router.post('/remove-player', gameController.removePlayerFromGame);

export const gameRouter = router;