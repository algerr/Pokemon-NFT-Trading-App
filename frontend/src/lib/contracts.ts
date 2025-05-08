/*
 * Main things done here:
 * 1. Create contract instances for both PokemonCard and PokemonSwap contracts
 * 2. Handle token approvals
 * 3. Check if tokens are approved before swaps
 */

import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '@/src/config/contracts';
import PokemonCardABI from '@/src/config/abi/PokemonCard.json';
import PokemonSwapABI from '@/src/config/abi/PokemonSwap.json';

/**
 * Creates a connection to our PokemonCard contract.
 * Error handling for fail of contract creation if the address is wrong.
 */
export const getPokemonCardContract = (provider: ethers.Provider | ethers.Signer): ethers.Contract => {
  try {
    if (!CONTRACT_ADDRESSES.POKEMON_CARD) {
      throw new Error("PokemonCard contract address not configured");
    }
    return new ethers.Contract(
      CONTRACT_ADDRESSES.POKEMON_CARD,
      PokemonCardABI.abi,
      provider
    );
  } catch (error) {
    console.error("Error creating PokemonCard contract:", error);
    throw error;
  }
};

/**
 * Similar to above, but for our PokemonSwap contract.
 * This is the contract that handles all the token swapping logic.
 */
export const getPokemonSwapContract = (provider: ethers.Provider | ethers.Signer): ethers.Contract => {
  try {
    if (!CONTRACT_ADDRESSES.POKEMON_SWAP) {
      throw new Error("PokemonSwap contract address not configured");
    }
    return new ethers.Contract(
      CONTRACT_ADDRESSES.POKEMON_SWAP,
      PokemonSwapABI.abi,
      provider
    );
  } catch (error) {
    console.error("Error creating PokemonSwap contract:", error);
    throw error;
  }
};

/**
 * Checking if a token is approved for swapping:
 * 1. Ensure token exists and is owned by the user
 * 2. Check if it's approved for our swap contract
 * 
 * The provider/signer handling is a bit complex because we need to get the user's address
 * differently depending on what type of provider we have.
 */
export const isTokenApprovedForSwap = async (provider: ethers.Provider | ethers.Signer, tokenId: number): Promise<boolean> => {
  try {
    const cardContract = getPokemonCardContract(provider);
    let ownerAddress: string;
    
    // Getting the user's address based on whether it's a provider or signer
    if ('getAddress' in provider) {
      ownerAddress = await provider.getAddress();
    } else {
      const signer = await (provider as ethers.BrowserProvider).getSigner();
      ownerAddress = await signer.getAddress();
    }
    
    // Check if the token exists and is owned by the user
    const tokenOwner = await cardContract.ownerOf(tokenId);
    if (tokenOwner.toLowerCase() !== ownerAddress.toLowerCase()) {
      return false;
    }
    
    // Check if this specific token is approved
    const approvedAddress = await cardContract.getApproved(tokenId);
    return approvedAddress.toLowerCase() === CONTRACT_ADDRESSES.POKEMON_SWAP.toLowerCase();
  } catch (error) {
    console.error("Error checking token approval:", error);
    return false;
  }
};

/**
 * This is the function that actually approves a token for swapping.
 * It just calls approve on the PokemonCard contract
 */
export const approveTokenForSwap = async (signer: ethers.Signer, tokenId: number): Promise<ethers.TransactionResponse> => {
  try {
    const cardContract = getPokemonCardContract(signer);
    return cardContract.approve(CONTRACT_ADDRESSES.POKEMON_SWAP, tokenId);
  } catch (error) {
    console.error("Error approving token for swap:", error);
    throw error;
  }
}; 