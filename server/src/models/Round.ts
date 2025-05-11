import { Seat } from "./Seat.js";
import { TexasHoldemGame } from "./TexasHoldemGame.js";

export type Action = 'bet' | 'check' | 'call' | 'raise' | 'fold';

export interface RoundState {
  currentBet: number;
  passedPlayersAmount: number;
  passPlayerAmountCap: number;
  currentActingPlayerSeat: ReturnType<Seat['getState']>;
  startingSeat: ReturnType<Seat['getState']>;
  availableActions: Action[];
}

export class Round {
  public currentActingPlayerSeat!: Seat;
  public passedPlayersAmount!: number;
  public passPlayerAmountCap!: number;
  public startingSeat!: Seat;
  public currentBet!: number;
  public availableActions!: Set<Action>;
  public game: TexasHoldemGame;


  constructor(game: TexasHoldemGame, startingSeat: Seat, startingBet: number, passedPlayersAmount: number = 0) {
    this.game = game;
    this.startNewRound(startingSeat, startingBet, passedPlayersAmount);
  }

  /**
   * Called by client side to handle player action
   * @param playerSeat 
   * @param action 
   * @param amount 
   */
  handlePlayerAction(action: Action, amount?: number): Seat | null {
    const playerSeat = this.currentActingPlayerSeat;
    const player = playerSeat.player;
    if (!player) throw new Error('Player not found');

    if (player.isFolded) {
      throw new Error('Player is folded');
    }

    const bettableAmount = player.chips - player.currentGameBet;
    if (!this.availableActions.has(action)) throw new Error(`Cannot perform action ${action}`);
    switch (action) {
      case 'call':
        const callAmount = bettableAmount < this.currentBet ? bettableAmount : this.currentBet;
        player.bet(callAmount);
        this.game.pot += callAmount;
        break;
      case 'bet':
        if (!amount || amount < this.game.minimumBet) {
          throw new Error(`Bet must be at least ${this.game.minimumBet}`);
        }
        player.bet(amount);
        this.game.pot += amount;
        this.startNewRound(this.currentActingPlayerSeat, amount);
        break;
      case 'raise':
        if (!amount || amount <= this.currentBet) {
          throw new Error(`Raise must be greater than current bet of ${this.currentBet}`);
        }
        if (amount > bettableAmount) {
          throw new Error(`Cannot raise more than ${bettableAmount}`);
        }
        const raiseAmount = amount;
        player.bet(raiseAmount);
        this.game.pot += raiseAmount;
        this.startNewRound(this.currentActingPlayerSeat, amount);
        break;
      case 'fold':
        player.fold();
        break;
      case 'check':
      default:
        break;
    }
    // has passed all players
    if (this.passedPlayersAmount ===  this.passPlayerAmountCap) return null;

    const nextSeat = this.getNextActingPlayerSeat();
    this.currentActingPlayerSeat = nextSeat;
    this.passedPlayersAmount += 1;

    return nextSeat;
  }

  getNextActingPlayerSeat(): Seat {
    const seats = this.game.seats;
    let i = this.currentActingPlayerSeat.positionIndex;
    let nextSeat: Seat;
    while (1) {
      i++;
      const index = i % seats.length;
      if (seats[index].player && !seats[index].player.isFolded) {
        nextSeat = seats[index];
        break;
      }
    }
    return nextSeat!;
  }

  startNewRound(startingSeat: Seat, startingBet: number, passedPlayersAmount: number = 1) {
    this.passedPlayersAmount = passedPlayersAmount;
    this.passPlayerAmountCap = this.game.getPlayablePlayerCount();
    this.currentBet = startingBet;
    this.startingSeat = startingSeat;
    this.currentActingPlayerSeat = startingSeat;
    this.availableActions = new Set<Action>(['fold']);
    if (startingBet > 0) {
      this.availableActions.add('call');
      this.availableActions.add('raise');
    } else {
      this.availableActions.add('check');
      this.availableActions.add('bet');
    }
  }

  getState() {
    return {
      currentBet: this.currentBet,
      passedPlayersAmount: this.passedPlayersAmount,
      passPlayerAmountCap: this.passPlayerAmountCap,
      currentActingPlayerSeat: this.currentActingPlayerSeat.getState(),
      startingSeat: this.startingSeat.getState(),
      availableActions: Array.from(this.availableActions),
    };
  }


  run() {

    // wait for play action
    // 
  }
}