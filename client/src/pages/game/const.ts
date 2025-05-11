export const MAX_SEATS = 9; // Maximum number of seats at the table

export interface Card {
  suit: string;
  value: string;
}

export type GamePhase = 1 | 2 | 4 | 8 | 16 | 32;
export const WAITING_PHASE = 0b01;
export const PRE_FLOP_PHASE = 0b10;
export const FLOP_PHASE = 0b100;
export const TURN_PHASE = 0b1000;
export const RIVER_PHASE = 0b10000;
export const SHOWDOWN_PHASE = 0b100000;
export type PlayerState = {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  isActive: boolean;
  isTurn: boolean;
  isFolded: boolean;
  currentGameBet: number;
};
export type SeatPhase = 0 | 1 | 2 | 3 | 4 | 5;
export const EMPTY_STATE = 0;
export const PLAYER_STATE = 1;
export const DEALER_STATE = 2;
export const SMALL_BLIND_STATE = 3;
export const BIG_BLIND_STATE = 4;
export const TO_REMOVE_STATE = 5;

export type SeatState = {
  state: SeatPhase;
  player: PlayerState | undefined;
  positionIndex: number;
  topOffset: number;
  leftOffset: number;
}

export type Action = 'bet' | 'check' | 'call' | 'raise' | 'fold';

export interface RoundState {
  currentBet: number;
  passedPlayersAmount: number;
  passPlayerAmountCap: number;
  currentActingPlayerSeat: SeatState;
  startingSeat: SeatState;
  availableActions: Action[];
}
export interface GameState {
  id: string;
  players: PlayerState[];
  waitingPlayers: PlayerState[];
  currentRound: RoundState | null;
  seats: SeatState[];
  hostId: string;
  communityCards: Card[];
  pot: number;
  minimumBet: number;
  phase: GamePhase;
  winners: { playerId: string; name: string; handDescription: string }[];
  maxPlayers: number;
}

export interface GameSession {
  gameId: string;
  playerName: string;
  token: string;
  tokenExpiry?: number;
}

export interface JwtGamePayload {
  playerId: string;
  playerName: string;
  gameId: string;
  exp: number;
}