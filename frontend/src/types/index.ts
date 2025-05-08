/*
 * These are the core interfaces used throughout the app:
 * - Token: Pokemon card NFT with its ID, owner, and metadata URI
 * - Swap: Swap offer between two users, containing details about the tokens being exchanged and the status of the swap
 */

export interface Token {
  tokenId: number;
  owner: string;
  uri: string;
}

export interface Swap {
  swapId: number;
  offerer: string;
  counterparty: string;
  tokenAId: number;
  tokenBId: number;
  executed: boolean;
}