// Export contract addresses from .env.local
export const CONTRACT_ADDRESSES = {
  POKEMON_CARD: process.env.NEXT_PUBLIC_POKEMON_CARD_ADDRESS as string,
  POKEMON_SWAP: process.env.NEXT_PUBLIC_POKEMON_SWAP_ADDRESS as string
};