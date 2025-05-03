import { Card } from '../models/TexasHoldemGame';

export class Deck {
  private cards: Card[];

  constructor() {
    this.cards = [];
    this.initializeDeck();
    this.shuffle();
  }

  // Initialize a standard 52-card deck
  initializeDeck(): void {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    this.cards = [];
    
    for (const suit of suits) {
      for (const value of values) {
        this.cards.push({ suit, value });
      }
    }
  }

  // Shuffle the deck using Fisher-Yates algorithm
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  // Draw a card from the deck
  drawCard(): Card {
    if (this.cards.length === 0) {
      this.initializeDeck();
      this.shuffle();
    }
    
    return this.cards.pop()!;
  }

  // Get the number of cards remaining in the deck
  getRemainingCards(): number {
    return this.cards.length;
  }
} 