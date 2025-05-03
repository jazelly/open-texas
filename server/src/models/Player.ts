import { Card } from './TexasHoldemGame';

export class Player {
  public id: string;
  public name: string;
  // don't change chips until ONE game finished
  public chips: number;
  public cards: Card[];
  public isActive: boolean;
  public isTurn: boolean;
  public isFolded: boolean;
  // changing during ONE game
  public currentGameBet: number;
  public currentRoundBet: number;

  constructor(id: string, name: string, initialChips: number) {
    this.id = id;
    this.name = name;
    this.chips = initialChips;
    this.cards = [];
    this.isActive = true;
    this.isTurn = false;
    this.isFolded = false;
    this.currentRoundBet = 0;
    this.currentGameBet = 0;
  }

  // Place a bet
  bet(amount: number): void {
    let betAmount = amount;
    const bettableAmount = this.chips - this.currentGameBet;
    if (betAmount > bettableAmount) {
      betAmount = bettableAmount;
    }
    this.currentGameBet += betAmount;
  }

  // Fold hand
  fold(): void {
    this.isFolded = true;
  }

  reset(): void {
    this.cards = [];
    this.isActive = false;
    this.isTurn = false;
    this.isFolded = false;
    this.currentGameBet = 0;
  }

  getState() {
    return {
      id: this.id,
      name: this.name,
      chips: this.chips,
      cards: this.cards,
      isActive: this.isActive,
      isTurn: this.isTurn,
      isFolded: this.isFolded,
    };
  }
} 