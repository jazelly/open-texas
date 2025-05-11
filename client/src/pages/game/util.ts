import { GamePhase, WAITING_PHASE, PRE_FLOP_PHASE, FLOP_PHASE, TURN_PHASE, RIVER_PHASE, SHOWDOWN_PHASE } from "./const";

export const parseGamePhase = (gamePhase: GamePhase) => {
  if (gamePhase === WAITING_PHASE) {
    return "Waiting";
  } else if (gamePhase === PRE_FLOP_PHASE) {
    return "Preflop";
  } else if (gamePhase === FLOP_PHASE) {
    return "Flop";
  } else if (gamePhase === TURN_PHASE) {
    return "Turn";
  } else if (gamePhase === RIVER_PHASE) {
    return "River";
  } else if (gamePhase === SHOWDOWN_PHASE) {
    return "Showdown";
  }
}