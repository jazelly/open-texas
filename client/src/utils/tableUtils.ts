/**
 * Calculate the position of a seat on the table
 * @param seatIndex - The index of the seat
 * @param maxSeats - The maximum number of seats
 * @returns The position of the seat in terms of top and left offset from the top-left corner of the canvas
 *          where the top is on y-axis from top-down and left is on x-axis left-right
 *          |------------------------|
 *          |            0           |
 *          |    7              1    |
 *          |                        |
 *          |   6                  2 |
 *          |                        |
 *          |    5               3   |
 *          |            4           |
 *          | ---------------------- |
 */
export const calculateSeatPosition = (seatIndex: number, maxSeats: number): { top: number, left: number } => {
  const angle = (2 * Math.PI * seatIndex) / maxSeats;
  const radius = 40; // % of the table
  const top = 50 - radius * Math.cos(angle);
  const left = 50 + radius * Math.sin(angle);
  return { top, left };
}; 