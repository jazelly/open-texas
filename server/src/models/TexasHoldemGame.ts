import { Player, PlayerState } from "./Player.js";
import { Deck } from "../utils/Deck.js";
import { HandEvaluator } from "../utils/HandEvaluator.js";
import {
  BIG_BLIND_STATE,
  EMPTY_STATE,
  Seat,
  SeatState,
  SMALL_BLIND_STATE,
  TO_REMOVE_STATE,
} from "./Seat.js";
import { Action, Round, RoundState } from "./Round.js";
import { calculateSeatPosition } from "../utils/shared.js";
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

export interface GameState {
  id: string;
  players: PlayerState[];
  waitingPlayers: PlayerState[];
  currentRound: RoundState | null;
  hostId: string;
  communityCards: Card[];
  pot: number;
  minimumBet: number;
  phase: GamePhase;
  winners: Winner[];
  maxPlayers: number;
  seats: SeatState[];
}

export class TexasHoldemGame {
  public id: string;
  public name: string;
  public maxPlayers: number;
  public waitingPlayers: Map<string, Player>;
  public communityCards: Card[];
  public deck: Deck;
  public pot: number;
  public minimumBet: number;
  public hostId: string;
  public phase: GamePhase;
  public currentRound: Round | null;
  public smallBlindIndex: number;
  public bigBlindIndex: number;
  public winners: Winner[];
  public seats: Seat[];
  public smallBlindSeat!: Seat;
  public bigBlindSeat!: Seat;

  constructor(
    id: string,
    name: string,
    hostId: string,
    minimumBet: number,
    maxPlayers: number = 6,
  ) {
    this.id = id;
    this.name = name;
    this.maxPlayers = maxPlayers;
    this.communityCards = [];
    this.deck = new Deck();
    this.pot = 0;
    this.phase = WAITING_PHASE;
    this.smallBlindIndex = -1;
    this.bigBlindIndex = -1;
    this.winners = [];
    this.waitingPlayers = new Map();
    this.minimumBet = minimumBet;
    this.currentRound = null;
    this.hostId = hostId;

    const seatCoordinates: { top: number, left: number }[] = [];
    for (let i = 0; i < maxPlayers; i++) {
      seatCoordinates.push(calculateSeatPosition(i, maxPlayers));
    }

    const seats = seatCoordinates.map(
      ({ top, left }, index) =>
        new Seat({
          state: EMPTY_STATE,
          positionIndex: index,
          topOffset: top,
          leftOffset: left,
        })
    );
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

  addPlayerToWaitingList(player: Player): void {
    this.waitingPlayers.set(player.id, player);
  }

  getInGamePlayerSeats() {
    return this.seats.filter((s) => s.player !== undefined);
  }

  getInGamePlayers(): Player[] {
    return this.getInGamePlayerSeats().map((s) => s.player!);
  }

  tryMarkingPlayingPlayerToBeRemoved(id: string): void {
    const playerSeat = this.getInGamePlayerSeats().find((s) => s.player?.id === id);
    const player = playerSeat?.player;
    if (!player || !playerSeat) return;
    playerSeat.state = TO_REMOVE_STATE;
    player.isActive = false;
  }

  movePlayerFromWaitingListToSeat(id: string, seatIndex: number): void {
    const player = this.waitingPlayers.get(id);
    if (!player) {
      throw new Error("Player not found in waiting list");
    }
    if (this.isFull()) {
      throw new Error("Game is full");
    }
    if (seatIndex < 0 || seatIndex >= this.seats.length) {
      throw new Error("Invalid seat index");
    }
    if (this.seats[seatIndex].player !== undefined) {
      throw new Error("Seat already occupied");
    }
    this.waitingPlayers.delete(id);
    this.seats[seatIndex].player = player;
    return;
  }

  // Add a player at a specific position
  addPlayerAtPosition(
    id: string,
    name: string,
    chips: number,
    position: number
  ): void {
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
    return this.seats.filter((seat) => !!seat.player).length;
  }
  getPlayablePlayerCount(): number {
    return this.seats.filter((seat) => !!seat.player && !seat.player!.isFolded)
      .length;
  }

  // Check if the game can start
  canStart(): boolean {
    console.log(
      "Checking if game can start",
      this.getPlayerCount(),
      this.phase
    );
    return this.getPlayerCount() >= 2 && this.phase === WAITING_PHASE;
  }

  getPlayerSeatByPlayerIndex(playerIndex: number): Seat {
    const index = playerIndex % this.getPlayerCount();

    let i = 0;
    let curSeatIndex = 0;
    while (i <= index) {
      if (this.seats[curSeatIndex].player) {
        i++;
        if (i === index) {
          return this.seats[curSeatIndex];
        }
      }
      curSeatIndex++;
      curSeatIndex = curSeatIndex % this.seats.length;
    }
    return this.seats[curSeatIndex];
  }

  getPlayerSeatByPlayerId(playerId: string): Seat | undefined {
    for (const seat of this.seats) {
      if (seat.player?.id === playerId) {
        return seat;
      }
    }
    return undefined;
  }

  // Start a new game
  start(): void {
    if (!this.canStart()) {
      throw new Error("Cannot start game");
    }

    // Reset game state
    this.pot = 0;
    this.communityCards = [];
    this.winners = [];
    this.deck.shuffle();

    // Set all players to active
    for (const seat of this.seats) {
      if (seat.player) {
        seat.player.reset();
      }
    }

    // Set blinds positions
    const smallBlindIndex = Math.floor(Math.random() * this.getPlayerCount());
    const bigBlindIndex = smallBlindIndex + 1;
    this.smallBlindSeat = this.getPlayerSeatByPlayerIndex(smallBlindIndex);
    this.bigBlindSeat = this.getPlayerSeatByPlayerIndex(bigBlindIndex);
    if (!this.smallBlindSeat.player || !this.bigBlindSeat.player) {
      throw new Error("Small or big blind seat not set!");
    }

    // First player to act is after the big blind
    const utgSeat = this.getPlayerSeatByPlayerIndex(this.bigBlindIndex + 1);
    if (!utgSeat) {
      throw new Error("UTG seat not set!");
    }

    // First round has 2 passed players, BIG BLIND and SMALL BLIND
    this.currentRound = new Round(this, utgSeat, this.minimumBet, 2);

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

    // Start with pre-flop p
    console.log("Starting game with pre-flop phase");
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

  calculatePlayerIndexChainForThisRoundAction(
    startingSeatIndex: number
  ): number[] {
    const endSeatIndex = startingSeatIndex + this.getPlayerCount() - 1;
    const playerIndexChain: number[] = [];
    for (let i = startingSeatIndex; i <= endSeatIndex; i++) {
      playerIndexChain.push(i % this.getPlayerCount());
    }
    return playerIndexChain;
  }

  // Handle player actions
  handlePlayerAction(
    playerId: string,
    action: Action,
    amount?: number
  ): Seat | null {
    const playerSeat = this.seats.find((p) => p.player?.id === playerId);
    if (!playerSeat) throw new Error("Player not found");

    // Check if it's the correct player's turn
    if (playerSeat !== this.currentRound?.currentActingPlayerSeat) {
      throw new Error(
        `Not the turn for ${playerId} at seat ${playerSeat.positionIndex}`
      );
    }

    const nextSeat = this.currentRound!.handlePlayerAction(action, amount);
    if (!nextSeat) {
      return this.moveGameToNextPhase();
    }
    return nextSeat;
  }

  // Move to the next phase of the game
  moveGameToNextPhase(): Seat | null {
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
        return null;
      case SHOWDOWN_PHASE:
        // Start a new hand
        return null;
      default:
        throw new Error("Invalid game phase");
    }

    this.phase = (this.phase << 1) as GamePhase;
    this.currentRound = new Round(this, this.smallBlindSeat, 0);
    return this.smallBlindSeat;
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
  getState(): GameState {
    return {
      id: this.id,
      players: this.getInGamePlayers().map((player) => player.getState()),
      waitingPlayers: Array.from(this.waitingPlayers.values()).map((player) =>
        player.getState()
      ),
      seats: this.seats.map((seat) => seat.getState()),
      currentRound: this.currentRound?.getState() ?? null,
      hostId: this.hostId,
      communityCards: this.communityCards,
      pot: this.pot,
      minimumBet: this.minimumBet,
      phase: this.phase,
      winners: this.winners,
      maxPlayers: this.maxPlayers,
    };
  }
}
