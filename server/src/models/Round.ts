import { Seat } from "./Seat";
import { GamePhase, TexasHoldemGame } from "./TexasHoldemGame";

export class WaitingListUnit {
  public seat: Seat;
  public next: WaitingListUnit | null;

  constructor(seat: Seat) {
    this.seat = seat;
    this.next = null;
  }
}

export class Round {
  public currentActingPlayerSeat: Seat;
  public minimumCall: number;
  public currentBet: number;
  // A single linked list of player seats that have not acted yet
  public currentActingPlayerUnit: WaitingListUnit;
  public game: TexasHoldemGame;


  // return the head of the waiting list
  estabilishWaitingList(currentActingPlayerSeat: Seat): WaitingListUnit {
    // establish WaitingList for this round, as every one must act
    let curUnit = new WaitingListUnit(currentActingPlayerSeat);
    const head = curUnit;
    let cur = currentActingPlayerSeat;
    const visitedSeats = new Set<Seat>();
    cur = cur.next;
    while (cur) {
      if (visitedSeats.has(cur)) break;
      if (!cur.player) continue;

      visitedSeats.add(cur);
      const nextUnit = new WaitingListUnit(cur);
      curUnit.next = nextUnit;
      curUnit = nextUnit;
      cur = cur.next;
    }
    return head;
  }

  clearPlayersRoundBet() {
    for (const seat of this.game.seats) {
      if (seat.player && !seat.player.isFolded) {
        seat.player.currentRoundBet = 0;
      }
    }
  }

  constructor(game: TexasHoldemGame, currentActingPlayerSeat: Seat) {
    this.game = game;
    this.currentActingPlayerSeat = currentActingPlayerSeat;
    this.minimumCall = 0;
    this.currentBet = 0;
    this.currentActingPlayerUnit = this.estabilishWaitingList(currentActingPlayerSeat);
    this.clearPlayersRoundBet();
  }

  foldCurrentUnactionedPlayer(playerSeat: Seat) {
    // remove playerSeat from the waiting list
    const cur = this.currentActingPlayerUnit;
    cur.seat.player!.fold();
    cur.next = null;
  }


  /**
   * Called by client side to handle player action
   * @param playerSeat 
   * @param action 
   * @param amount 
   */
  handlePlayerAction(playerSeat: Seat, action: string, amount?: number) {
    const player = playerSeat.player!;

    if (player.isFolded) {
      throw new Error('Player is folded');
    }

    const bettableAmount = player.chips - player.currentGameBet;
    switch (action) {
      case 'bet':
        if (!amount || amount < this.game.minimumBet) {
          throw new Error(`Bet must be at least ${this.game.minimumBet}`);
        }
        player.bet(amount);
        this.game.pot += amount;
        this.currentBet = amount;
        break;
      case 'check':
        if (player.currentRoundBet < this.minimumCall) {
          throw new Error('Cannot check when there are bets');
        }
        // No action needed, just pass to the next player
        break;
      case 'call':
        if (player.currentRoundBet >= this.currentBet) {
          throw new Error('Nothing to call');
        }
        const callAmount = bettableAmount < this.currentBet ? bettableAmount : this.currentBet;
        player.bet(callAmount);
        this.game.pot += callAmount;
        break;
      case 'raise':
        if (this.currentBet === 0) {
          throw new Error('Cannot raise, must bet');
        }
        if (!amount || amount <= this.currentBet) {
          throw new Error(`Raise must be greater than current bet of ${this.currentBet}`);
        }
        if (amount > bettableAmount) {
          throw new Error(`Cannot raise more than ${bettableAmount}`);
        }
        const raiseAmount = amount;
        player.bet(raiseAmount);
        this.game.pot += raiseAmount;
        this.currentBet = amount;
        break;
      case 'fold':
          player.fold();
          break;
      default:
        throw new Error('Invalid action');
    }
  }

  getState() {
    return {
      currentActingPlayerSeat: this.currentActingPlayerSeat.getState(),
      minimumCall: this.minimumCall,
      currentBet: this.currentBet,
    };
  }

  run() {

    // wait for play action
    // 
  }
}