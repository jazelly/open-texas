import { Card } from './TexasHoldemGame.js';

export type PlayerState = {
  id: string;
  name: string;
  chips: number;
  cards: Card[];
  isActive: boolean;
  isFolded: boolean;
  currentGameBet: number;
};

export class Player {
  public id: string;
  public name: string;
  // don't change chips until ONE game finished
  public chips: number; // chips in the game
  public cards: Card[];
  public isActive: boolean;
  public isFolded: boolean;
  // changing during ONE game
  public currentGameBet: number;

  constructor(id: string, name: string, initialChips: number) {
    this.id = id;
    this.name = name;
    this.chips = initialChips;
    this.cards = [];
    this.isActive = true;
    this.isFolded = false;
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
    this.isFolded = false;
    this.currentGameBet = 0;
  }

  getState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      chips: this.chips,
      cards: this.cards,
      isActive: this.isActive,
      isFolded: this.isFolded,
      currentGameBet: this.currentGameBet,
    };
  }
} 