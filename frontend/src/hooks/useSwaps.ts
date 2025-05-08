"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Swap } from '@/src/types';
import { toast } from 'sonner';
import { getPokemonSwapContract, approveTokenForSwap, isTokenApprovedForSwap } from '@/src/lib/contracts';

/*
 * Hook for managing Pokemon card swaps using contract events
 * Tracks 'SwapCreated', 'SwapExecuted', and 'SwapCancelled' to maintain n up-to-date list of swaps for current user
 */
export const useSwaps = (userAddress: string | null) => {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  /*
   * Fetches all swaps from the contract (using events):
   * 1. Query past SwapCreated events for swaps involving the user
   * 2. Query SwapExecuted and SwapCancelled events to update swap status
   * 3. Build a map of active swaps
   */
  const fetchSwaps = async () => {
    if (!userAddress) {
      setSwaps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    try {
      if (!window.ethereum) {
        toast.error("Ethereum provider not found");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const swapContract = getPokemonSwapContract(provider);
      
      // Get the contract creation block for initial event query and ensure we don't go below block 0
      const currentBlock = await provider.getBlockNumber();
      const creationBlock = Math.max(0, currentBlock - 10000);
      
      console.log("Fetching swaps from block:", creationBlock);
      
      // Query all SwapCreated events involving the user
      const createdFilter = swapContract.filters.SwapCreated(null, null, null, null);
      const createdEvents = await swapContract.queryFilter(createdFilter, creationBlock);
      console.log("Created events:", createdEvents.length);
      
      // Filter events where user is involved
      const userCreatedEvents = createdEvents.filter(event => {
        const { tokenAOwner, tokenBOwner } = (event as ethers.EventLog).args!;
        return tokenAOwner.toLowerCase() === userAddress.toLowerCase() || 
               tokenBOwner.toLowerCase() === userAddress.toLowerCase();
      });
      console.log("User created events:", userCreatedEvents.length);
      
      // Query executed and cancelled events
      const executedFilter = swapContract.filters.SwapExecuted(null, null);
      const executedEvents = await swapContract.queryFilter(executedFilter, creationBlock);
      console.log("Executed events:", executedEvents.length);
      
      const cancelledFilter = swapContract.filters.SwapCancelled(null, null);
      const cancelledEvents = await swapContract.queryFilter(cancelledFilter, creationBlock);
      console.log("Cancelled events:", cancelledEvents.length);
      
      // Build a map of active swaps
      const swapMap = new Map<number, Swap>();
      
      // Process created events
      userCreatedEvents.forEach(event => {
        const { swapId, tokenAOwner, tokenA, tokenBOwner, tokenB } = (event as ethers.EventLog).args!;
        swapMap.set(Number(swapId), {
          swapId: Number(swapId),
          offerer: tokenAOwner,
          counterparty: tokenBOwner,
          tokenAId: Number(tokenA),
          tokenBId: Number(tokenB),
          executed: false
        });
      });
      
      // Mark executed swaps
      executedEvents.forEach(event => {
        const { swapId } = (event as ethers.EventLog).args!;
        const swap = swapMap.get(Number(swapId));
        if (swap) {
          swap.executed = true;
        }
      });
      
      // Remove cancelled swaps
      cancelledEvents.forEach(event => {
        const { swapId } = (event as ethers.EventLog).args!;
        swapMap.delete(Number(swapId));
      });
      
      setSwaps(Array.from(swapMap.values()));
      
      // Set up event listeners
      const handleSwapCreated = (swapId: bigint, tokenAOwner: string, tokenA: bigint, tokenBOwner: string, tokenB: bigint) => {
        if (tokenAOwner.toLowerCase() === userAddress.toLowerCase() || 
            tokenBOwner.toLowerCase() === userAddress.toLowerCase()) {
          setSwaps(prev => {
            // Check if swap already exists
            if (prev.some(swap => swap.swapId === Number(swapId))) {
              return prev;
            }
            return [...prev, {
              swapId: Number(swapId),
              offerer: tokenAOwner,
              counterparty: tokenBOwner,
              tokenAId: Number(tokenA),
              tokenBId: Number(tokenB),
              executed: false
            }];
          });
        }
      };
      
      const handleSwapExecuted = (swapId: bigint) => {
        setSwaps(prev => prev.map(swap => 
          swap.swapId === Number(swapId) ? { ...swap, executed: true } : swap
        ));
      };
      
      const handleSwapCancelled = (swapId: bigint) => {
        setSwaps(prev => prev.filter(swap => swap.swapId !== Number(swapId)));
      };
      
      // Subscribe to events
      swapContract.on('SwapCreated', handleSwapCreated);
      swapContract.on('SwapExecuted', handleSwapExecuted);
      swapContract.on('SwapCancelled', handleSwapCancelled);
      
      // Cleanup
      return () => {
        swapContract.off('SwapCreated', handleSwapCreated);
        swapContract.off('SwapExecuted', handleSwapExecuted);
        swapContract.off('SwapCancelled', handleSwapCancelled);
      };
      
    } catch (error) {
      console.error("Error fetching swaps:", error);
      toast.error("Failed to fetch swaps");
      setSwaps([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and cleanup
  useEffect(() => {
    const cleanup = fetchSwaps();
    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [userAddress]);

  /*
   * Creates a new swap between two users:
   * 1. Check if user's token is approved for swapping
   * 2. Create the swap on the contract
   * 3. Wait for transaction confirmation
   * 4. Refresh the swaps list
   */
  const createSwap = async (tokenAId: number, counterparty: string, tokenBId: number) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    
    try {
        if (!window.ethereum) {
          toast.error("Ethereum provider not found");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Check if the token is approved for the swap contract
        const isApproved = await isTokenApprovedForSwap(provider, tokenAId);
        
        if (!isApproved) {
          toast.error("Please approve your token for trading first");
          setLoading(false);
          return;
        }
        
        // Create the swap
        const swapContract = getPokemonSwapContract(signer);
        const tx = await swapContract.createSwap(tokenAId, counterparty, tokenBId);
        
        toast.info("Creating swap. Please wait for confirmation...");
        await tx.wait();
        
        toast.success("Swap created successfully!");
        
        // Refresh the swaps list
        await fetchSwaps();
    } catch (error) {
      console.error("Error creating swap:", error);
      toast.error("Failed to create swap");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Accepting an existing swap:
   * 1. Check if counterparty's token is approved
   * 2. If not approved, approve it automatically (user doesn't need to manually approve specific token before accepting swap)
   * 3. Execute the swap on the contract
   * 4. Wait for transaction confirmation
   * 5. Refresh the swaps list
   */
  const acceptSwap = async (swapId: number) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    
    try {
        if (!window.ethereum) {
          toast.error("Ethereum provider not found");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Get the swap details
        const swapContract = getPokemonSwapContract(provider);
        const swap = await swapContract.swaps(swapId);
        
        // Check if tokenB is approved for the swap
        const isApproved = await isTokenApprovedForSwap(provider, Number(swap.tokenB));
        
        if (!isApproved) {
          toast.info("Approving token for swap...");
          const approveTx = await approveTokenForSwap(signer, Number(swap.tokenB));
          await approveTx.wait();
          toast.success("Token approved for swap");
        }
        
        // Execute the swap
        const swapWithSigner = getPokemonSwapContract(signer);
        const tx = await swapWithSigner.acceptSwap(swapId);
        
        toast.info("Accepting swap. Please wait for confirmation...");
        await tx.wait();
        
        toast.success("Swap accepted successfully!");
        
        // Refresh the swaps list
        await fetchSwaps();
    } catch (error) {
      console.error("Error accepting swap:", error);
      toast.error("Failed to accept swap");
    } finally {
      setLoading(false);
    }
  };

  /*
   * Cancelling an existing swap:
   * 1. Verify user is the swap creator
   * 2. Cancel the swap on the contract
   * 3. Wait for transaction confirmation
   * 4. Refresh the swaps list
   */
  const cancelSwap = async (swapId: number) => {
    if (!userAddress) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    setLoading(true);
    
    try {
        if (!window.ethereum) {
          toast.error("Ethereum provider not found");
          return;
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        // Cancel the swap
        const swapContract = getPokemonSwapContract(signer);
        const tx = await swapContract.cancelSwap(swapId);
        
        toast.info("Cancelling swap. Please wait for confirmation...");
        await tx.wait();
        
        toast.success("Swap cancelled successfully!");
        
        // Refresh the swaps list
        await fetchSwaps();
    } catch (error) {
      console.error("Error cancelling swap:", error);
      toast.error("Failed to cancel swap");
    } finally {
      setLoading(false);
    }
  };

  return { swaps, loading, createSwap, acceptSwap, cancelSwap };
};