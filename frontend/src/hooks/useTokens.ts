"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Token } from '@/src/types';
import { getPokemonCardContract } from '@/src/lib/contracts';
import { toast } from 'sonner';

/*
 * Hook for fetching and managing a user's Pokemon card tokens.
 * Uses event tracking to maintain an up-to-date list of tokens:
 * 1. Query past Transfer events to build initial token list
 * 2. Listen for new Transfer events to update the list in real-time
 */
export const useTokens = (ownerAddress: string | null) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTokens = async () => {
      if (!ownerAddress) {
        setTokens([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('Fetching tokens for address:', ownerAddress);
      
      try {
        if (!window.ethereum) {
          throw new Error("Ethereum provider not found");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const cardContract = getPokemonCardContract(provider);
        
        // Get the contract creation block for initial event query and ensure we don't go below block 0
        const currentBlock = await provider.getBlockNumber();
        const creationBlock = Math.max(0, currentBlock - 10000);
        
        console.log("Fetching tokens from block:", creationBlock);
        
        // Query Transfer events where the user is the recipient
        const receivedFilter = cardContract.filters.Transfer(null, ownerAddress);
        const receivedEvents = await cardContract.queryFilter(receivedFilter, creationBlock);
        console.log("Received events:", receivedEvents.length);
        
        // Query Transfer events where the user is the sender
        const sentFilter = cardContract.filters.Transfer(ownerAddress, null);
        const sentEvents = await cardContract.queryFilter(sentFilter, creationBlock);
        console.log("Sent events:", sentEvents.length);
        
        // Build a map of tokens owned by the user
        const tokenMap = new Map<number, Token>();
        
        // Process received events
        for (const event of receivedEvents) {
          const { tokenId } = (event as ethers.EventLog).args!;
          try {
            const tokenURI = await cardContract.tokenURI(tokenId);
            tokenMap.set(Number(tokenId), {
              tokenId: Number(tokenId),
              owner: ownerAddress,
              uri: tokenURI
            });
          } catch (err) {
            console.error(`Error fetching URI for token ${tokenId}:`, err);
          }
        }
        
        // Remove tokens that were sent away
        for (const event of sentEvents) {
          const { tokenId } = (event as ethers.EventLog).args!;
          tokenMap.delete(Number(tokenId));
        }
        
        console.log('Final tokens array:', Array.from(tokenMap.values()));
        setTokens(Array.from(tokenMap.values()));
        
        // Set up event listeners
        const handleTransfer = async (from: string, to: string, tokenId: bigint) => {
          console.log(`Transfer event: ${from} -> ${to} for token ${tokenId}`);
          
          if (to.toLowerCase() === ownerAddress.toLowerCase()) {
            // Token was received
            try {
              const tokenURI = await cardContract.tokenURI(tokenId);
              setTokens(prev => [...prev, {
                tokenId: Number(tokenId),
                owner: ownerAddress,
                uri: tokenURI
              }]);
            } catch (err) {
              console.error(`Error fetching URI for token ${tokenId}:`, err);
            }
          } else if (from.toLowerCase() === ownerAddress.toLowerCase()) {
            // Token was sent away
            setTokens(prev => prev.filter(t => t.tokenId !== Number(tokenId)));
          }
        };
        
        // Subscribe to Transfer events
        cardContract.on('Transfer', handleTransfer);
        
        // Cleanup
        return () => {
          cardContract.off('Transfer', handleTransfer);
        };
        
      } catch (error) {
        console.error("Error fetching tokens:", error);
        toast.error("Failed to fetch tokens");
        setTokens([]);
      } finally {
        setLoading(false);
      }
    };

    const cleanup = fetchTokens();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [ownerAddress]);

  return { tokens, loading };
};