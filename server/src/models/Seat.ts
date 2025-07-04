import { Player, PlayerState } from "./Player.js";

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

export class Seat {
  public state: SeatPhase;
  public positionIndex: number;
  public player: Player | undefined;
  public topOffset: number;
  public leftOffset: number;

  constructor({
    state,
    positionIndex,
    topOffset,
    leftOffset,
    player,
  }: {
    state: 0 | 1 | 2 | 3 | 4;
    positionIndex: number;
    topOffset: number;
    leftOffset: number;
    player?: Player;
  }) {
    this.state = state;
    this.positionIndex = positionIndex;
    this.topOffset = topOffset;
    this.leftOffset = leftOffset;
    if (player) {
      this.player = player;
    }
  }

  getState() {
    return {
      state: this.state,
      player: this.player?.getState(),
      positionIndex: this.positionIndex,
      topOffset: this.topOffset,
      leftOffset: this.leftOffset,
    };
  }
}

