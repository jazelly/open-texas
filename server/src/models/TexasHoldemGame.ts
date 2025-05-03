import { Player } from "./Player";
import { Deck } from "../utils/Deck";
import { HandEvaluator } from "../utils/HandEvaluator";
import {
  BIG_BLIND_STATE,
  EMPTY_STATE,
  Seat,
  SMALL_BLIND_STATE,
  TO_REMOVE_STATE,
} from "./Seat";
import { Round } from "./Round";
import { Socket } from "socket.io";

// Game phases
export type GamePhase = 1 | 2 | 4 | 8 | 16 | 32;

export const WAITING_PHASE = 0b01;
export const PRE_FLOP_PHASE = 0b10;
export const FLOP_PHASE = 0b100;
export const TURN_PHASE = 0b1000;
export const RIVER_PHASE = 0b10000;
export const SHOWDOWN_PHASE = 0b100000;

export interface Card {
  suit: string;
  value: string;
}

export interface Winner {
  playerId: string;
  name: string;
  handDescription: string;
}

export interface SeatCoordinates {
  top: number;
  left: number;
}

export class TexasHoldemGame {
  public id: string;
  public name: string;
  public maxPlayers: number;
  public communityCards: Card[];
  public deck: Deck;
  public pot: number;
  public currentBet: number;
  public phase: GamePhase;
  public currentRound: Round | null;
  public activePlayerIndex: number;
  public dealerIndex: number;
  public smallBlindIndex: number;
  public bigBlindIndex: number;
  public winners: Winner[];
  public seats: Seat[];
  public smallBlindSeat: Seat | undefined;
  public bigBlindSeat: Seat | undefined;
  public minimumBet: number;
  public socketMap: Map<string, Socket>; // token -> socket

  constructor(
    id: string,
    name: string,
    seatCoordinates: SeatCoordinates[],
    maxPlayers: number = 6,
    minimumBet: number = 10
  ) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.communityCards = [];
    this.deck = new Deck();
    this.pot = 0;
    this.currentBet = 0;
    this.phase = WAITING_PHASE;
    this.activePlayerIndex = -1;
    this.dealerIndex = -1;
    this.smallBlindIndex = -1;
    this.bigBlindIndex = -1;
    this.winners = [];
    this.minimumBet = minimumBet;
    this.currentRound = null;
    this.socketMap = new Map();

    const seats = seatCoordinates.map(
      ({ top, left }, index) =>
        new Seat({
          state: EMPTY_STATE,
          positionIndex: index,
          topOffset: top,
          leftOffset: left,
        })
    );
    for (let i = 1; i < seats.length - 1; i++) {
      seats[i].prev = seats[i - 1];
      seats[i].next = seats[i + 1];
    }
    seats[0].next = seats[1];
    seats[seats.length - 1].prev = seats[seats.length - 2];
    seats[0].prev = seats[seats.length - 1];
    seats[seats.length - 1].next = seats[0];
    this.seats = seats;
  }

  // Add a player to the game
  addPlayer(id: string, name: string, chips: number, seatIndex?: number): void {
    if (this.isFull()) {
      throw new Error("Game is full");
    }
    if (seatIndex !== undefined) {
      if (seatIndex < 0 || seatIndex >= this.seats.length) {
        throw new Error("Invalid seat index");
      }
      if (this.seats[seatIndex].player !== undefined) {
        throw new Error("Seat already occupied");
      }
      this.seats[seatIndex].player = new Player(id, name, chips);
      return;
    }
    const seat = this.seats.find((s) => s.player === undefined);
    if (!seat) {
      throw new Error("No seat available");
    }
    seat.player = new Player(id, name, chips);
  }

  // Add a player at a specific position
  addPlayerAtPosition(id: string, name: string, chips: number, position: number): void {
    if (position < 0 || position >= this.seats.length) {
      throw new Error("Invalid position");
    }
    if (this.seats[position].player !== undefined) {
      throw new Error("Seat already occupied");
    }
    this.seats[position].player = new Player(id, name, chips);
  }

  /**
   * Remove a player from the game depending on the game phase
   * If we are in waiting phase, we can remove the player from the game
   * If we are in a betting phase, we need let this player fold for next round
   * @param playerId
   */
  removePlayer(playerId: string): void {
    const playerSeat = this.seats.find((p) => p.player?.id === playerId);
    if (!playerSeat) return;

    if (this.phase === WAITING_PHASE) {
      playerSeat.player = undefined;
      playerSeat.state = EMPTY_STATE;
    } else {
      playerSeat.state = TO_REMOVE_STATE;
    }
  }

  // Update a player's ID (for reconnection)
  updatePlayerId(oldId: string, newId: string): void {
    const seat = this.seats.find((s) => s.player?.id === oldId);
    if (seat) {
      seat.player!.id = newId;
      seat.player!.isActive = true;
    }
  }

  // Mark a player as inactive (when they disconnect)
  markPlayerInactive(id: string): void {
    const seat = this.seats.find((s) => s.player?.id === id);
    if (seat) {
      seat.player!.isActive = false;
    }
  }

  // Check if the game is full
  isFull(): boolean {
    for (const seat of this.seats) {
      if (seat.player === undefined) {
        return false;
      }
    }
    return true;
  }

  // Check if the game is empty
  isEmpty(): boolean {
    for (const seat of this.seats) {
      if (seat.player !== undefined) {
        return false;
      }
    }
    return true;
  }

  getPlayerCount(): number {
    return this.seats.filter((seat) => seat.player !== undefined).length;
  }

  // Check if the game can start
  canStart(): boolean {
    return this.getPlayerCount() >= 2 && this.phase === WAITING_PHASE;
  }

  getPlayerSeatByPlayerIndex(playerIndex: number): Seat | undefined {
    let k = 0;
    let curSeat = this.seats[0];
    while (curSeat) {
      if (k === playerIndex) {
        return curSeat;
      }
      k++;
      curSeat = curSeat.next;
    }
  }

  // Start a new game
  start(): void {
    if (!this.canStart()) {
      throw new Error("Cannot start game");
    }

    // Reset game state
    this.pot = 0;
    this.currentBet = 0;
    this.communityCards = [];
    this.winners = [];
    this.deck.shuffle();

    // Set all players to active
    for (const seat of this.seats) {
      if (seat.player) {
        seat.player.reset();
        seat.player.isActive = true;
      }
    }

    // Set blinds positions
    const smallBlindIndex = Math.floor(Math.random() * this.getPlayerCount());
    const bigBlindIndex = smallBlindIndex + 1;
    this.smallBlindSeat = this.getPlayerSeatByPlayerIndex(smallBlindIndex);
    this.bigBlindSeat = this.getPlayerSeatByPlayerIndex(bigBlindIndex);
    if (!this.smallBlindSeat || !this.bigBlindSeat) {
      throw new Error("Small or big blind seat not set!");
    }

    // First player to act is after the big blind
    const utgSeat = this.getPlayerSeatByPlayerIndex(this.bigBlindIndex + 1);
    if (!utgSeat) {
      throw new Error("UTG seat not set!");
    }
    utgSeat.player!.isTurn = true;
    this.currentRound = new Round(this, utgSeat);
    
    this.smallBlindSeat.state = SMALL_BLIND_STATE;
    this.bigBlindSeat.state = BIG_BLIND_STATE;

    // Post blinds
    const smallBlindBet = Math.floor(this.minimumBet * 0.5);
    const bigBlindBet = this.minimumBet;
    this.smallBlindSeat.player!.bet(smallBlindBet);
    this.bigBlindSeat.player!.bet(bigBlindBet);

    this.pot += smallBlindBet + bigBlindBet;
    this.currentRound.currentBet = this.minimumBet;

    // Deal two cards to each player
    for (const seat of this.seats) {
      if (seat.player) {
        seat.player.cards = [this.deck.drawCard(), this.deck.drawCard()];
      }
    }

    // Start with pre-flop phase
    this.phase = PRE_FLOP_PHASE;
    this.dealPreFlopCards();
  }

  dealPreFlopCards(): void {
    if (this.phase !== PRE_FLOP_PHASE) {
      throw new Error("Cannot deal pre-flop cards in this phase");
    }
    for (const seat of this.seats) {
      if (seat.player) {
        seat.player.cards = [this.deck.drawCard(), this.deck.drawCard()];
      }
    }

  }

  // Handle player actions
  handlePlayerAction(socketId: string, action: string, amount?: number): void {
    const playerSeat = this.seats.find((p) => p.player?.id === socketId);
    if (!playerSeat) return;

    // Check if it's the correct player's turn
    if (playerSeat.positionIndex !== this.activePlayerIndex) {
      throw new Error("Not your turn");
    }

    this.currentRound!.handlePlayerAction(playerSeat, action, amount);

    for (const clientSocketId of this.socketMap.keys()) {
      const clientSocket = this.socketMap.get(clientSocketId);

      clientSocket?.emit("playerActionFinished", {
        gameStatus: this.getState(),
      });
    }
  }

  // Move to the next phase of the game
  nextPhase(): void {
    const round = this.currentRound;
    const nextRound = new Round(this, this.smallBlindSeat!);

    switch (this.phase) {
      case PRE_FLOP_PHASE:
        // Deal the flop (3 community cards)
        this.communityCards = [
          this.deck.drawCard(),
          this.deck.drawCard(),
          this.deck.drawCard(),
        ];
        break;
      case FLOP_PHASE:
        // Deal the turn (4th community card)
        this.communityCards.push(this.deck.drawCard());
        break;
      case TURN_PHASE:
        // Deal the river (5th community card)
        this.communityCards.push(this.deck.drawCard());
        break;
      case RIVER_PHASE:
        this.determineWinners();
        return;
      case SHOWDOWN_PHASE:
        // Start a new hand
        return;
      default:
        throw new Error("Invalid game phase");
    }

    this.phase = (this.phase << 1) as GamePhase;

    this.currentRound = nextRound;
  }

  // Determine the winners of the hand
  determineWinners(): void {
    const activePlayerSeats = this.seats.filter(
      (s) => s.player && !s.player.isFolded
    );

    // If only one player remains, they win by default
    if (activePlayerSeats.length === 1) {
      const winner = activePlayerSeats[0];
      this.winners = [
        {
          playerId: winner.player!.id,
          name: winner.player!.name,
          handDescription: "Winner by default",
        },
      ];
      winner.player!.chips += this.pot;
      return;
    }

    // Evaluate each player's hand
    const handEvaluator = new HandEvaluator();
    const playerHands = activePlayerSeats.map((playerSeat) => {
      const cards = [...playerSeat.player!.cards, ...this.communityCards];
      const { value, description } = handEvaluator.evaluateHand(cards);
      return {
        player: playerSeat.player!,
        handValue: value,
        handDescription: description,
      };
    });

    // Sort by hand value (highest first)
    playerHands.sort((a, b) => b.handValue - a.handValue);

    // Find the winning hand value
    const winningHandValue = playerHands[0].handValue;

    // All players with the winning hand value are winners
    const winners = playerHands.filter((h) => h.handValue === winningHandValue);

    // Split the pot evenly among winners
    const winAmount = Math.floor(this.pot / winners.length);

    // Update game winners and player chips
    this.winners = winners.map((w) => {
      w.player.chips += winAmount;
      return {
        playerId: w.player.id,
        name: w.player.name,
        handDescription: w.handDescription,
      };
    });
  }

  // Check if the current hand is complete
  isHandComplete(): boolean {
    return this.phase === SHOWDOWN_PHASE;
  }

  // Check if the game is over (when only one player has chips)
  isGameOver(): boolean {
    let playablePlayerCount = 0;
    for (const seat of this.seats) {
      if (!seat.player) continue;
      if (seat.player.chips <= 0) continue;
      if (seat.state === TO_REMOVE_STATE) continue;
      playablePlayerCount++;
    }
    return playablePlayerCount <= 1;
  }

  // Get the current game state to send to clients
  getState() {
    // Map players to the format expected by the client
    const players = this.seats
      .filter((s) => s.player !== undefined)
      .map((seat) => {
        const player = seat.player!;
        return {
          id: player.id,
          name: player.name,
          chips: player.chips,
          cards: player.cards,
          isActive: player.isActive,
          isTurn: player.isTurn,
          isDealer: seat === this.smallBlindSeat?.prev, // The dealer is before the small blind
          isFolded: player.isFolded,
          isAllIn: player.chips === 0, // Player is all-in if they have no chips left
          currentBet: player.currentGameBet, // Use the currentGameBet property
          position: seat.positionIndex, // This is the seat position index
        };
      });

    let phase: string;
    switch (this.phase) {
      case WAITING_PHASE:
        phase = "waiting";
        break;
      case PRE_FLOP_PHASE:
        phase = "pre-flop";
        break;
      case FLOP_PHASE:
        phase = "flop";
        break;
      case TURN_PHASE:
        phase = "turn";
        break;
      case RIVER_PHASE:
        phase = "river";
        break;
      case SHOWDOWN_PHASE:
        phase = "showdown";
        break;
      default:
        phase = "unknown";
    }

    return {
      id: this.id,
      players,
      communityCards: this.communityCards,
      pot: this.pot,
      currentBet: this.currentBet,
      phase,
      winners: this.winners,
      maxPlayers: this.maxPlayers,
      // waitingPlayers will be added by the socket handler
    };
  }
}
