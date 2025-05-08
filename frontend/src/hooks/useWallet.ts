"use client";

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

/*
 * Wallet state interface that tracks everything we need to know about the user's wallet:
 * - address: The user's Ethereum address
 * - isConnected: Whether they're currently connected
 * - provider: The ethers provider for making RPC calls
 * - signer: The signer for sending transactions
 * - chainId: The current network they're on
 * - balance: Their ETH balance
 * - isConnecting: Loading state during connection
 */
export type WalletState = {
  address: string | null;
  isConnected: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  chainId: number | null;
  balance: string;
  isConnecting: boolean;
};

/*
 * Main wallet hook that handles all wallet interactions.
 * Manages wallet connection state, account changes, provide methods for connecting/disconnecting.
 */
export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    provider: null,
    signer: null,
    chainId: null,
    balance: '0',
    isConnecting: false,
  });
  
  // To prevent auo-reconnect after the user has disconnected manually, we add a flag to track manual disconnections
  // (Initializes from localStorage if available)
  const [manuallyDisconnected, setManuallyDisconnected] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('manuallyDisconnected') === 'true';
    }
    return false;
  });


  // Checks if a Web3 wallet (like MetaMask) is available in the browser.
  const isWalletAvailable = () => {
    if (typeof window === 'undefined') return false;
    return !!window.ethereum;
  };

  // Creates and returns an ethers provider instance for interacting with Ethereum network.
  const getProvider = () => {
    try {
      if (!isWalletAvailable()) return null;
      return new ethers.BrowserProvider(window.ethereum);
    } catch (error) {
      console.error("Error creating provider:", error);
      return null;
    }
  };

  /*
   * Initializes the wallet connection on component mount.
   * Runs when the page loads to check if we should auto-connect.
   */
  const initializeWallet = useCallback(async () => {
    console.log('Initializing wallet...');
    
    // Skip initialization if user manually disconnected (checking both state and localStorage)
    const isManuallyDisconnected = 
      manuallyDisconnected || 
      (typeof window !== 'undefined' && localStorage.getItem('manuallyDisconnected') === 'true');
    
    if (isManuallyDisconnected) {
      console.log('Skipping wallet initialization due to manual disconnect');
      // Ensure wallet state is disconnected
      setWalletState({
        address: null,
        isConnected: false,
        provider: null,
        signer: null,
        chainId: null,
        balance: '0',
        isConnecting: false,
      });
      return;
    }
    
    if (!isWalletAvailable()) {
      console.log('No wallet provider found');
      return;
    }

    try {
      console.log('Creating BrowserProvider...');
      const provider = getProvider();
      if (!provider) {
        console.log('Could not create provider');
        return;
      }
      
      console.log('Listing accounts...');
      const accounts = await provider.listAccounts();
      console.log('Accounts found:', accounts.length > 0 ? accounts[0] : 'none');
      
      if (accounts.length > 0) {
        console.log('Getting signer...');
        const signer = await provider.getSigner();
        console.log('Getting address...');
        const address = await signer.getAddress();
        console.log('Getting network...');
        const network = await provider.getNetwork();
        console.log('Getting current block...');
        const currentBlock = await provider.getBlockNumber();
        console.log('Getting balance...');
        const balance = ethers.formatEther(await provider.getBalance(address, currentBlock));
        
        console.log('Setting wallet state with address:', address);
        setWalletState({
          address,
          isConnected: true,
          provider,
          signer,
          chainId: Number(network.chainId),
          balance,
          isConnecting: false,
        });
        console.log('Wallet initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
    }
  }, [manuallyDisconnected]);

  /*
   * Main connection function for connecting wallet:
   * 1. Forces MetaMask extension to show connection window
   * 2. Gets user's account
   * 3. Sets up provider and signer
   * 4. Updates wallet state
   */
  const connect = async () => {
    console.log('Connecting wallet...');
    
    // Reset the manual disconnect flag when user explicitly connects
    setManuallyDisconnected(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('manuallyDisconnected');
    }
    
    if (!isWalletAvailable()) {
      console.log('No wallet provider found');
      toast.error("No wallet detected. Please install MetaMask or another Ethereum wallet.");
      return null;
    }

    try {
      console.log('Setting connecting state...');
      setWalletState(prev => ({ ...prev, isConnecting: true }));
      
      // By clearing any cached connections, we force the MetaMask extension to show its connection window
      if (window.ethereum && window.ethereum._metamask) {
        try {
          await window.ethereum._metamask.isUnlocked();
          await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
        } catch (error) {
          console.log('Error requesting permissions:', error);
        }
      }
      
      console.log('Creating BrowserProvider...');
      const provider = getProvider();
      if (!provider) {
        throw new Error("Could not create provider");
      }
      
      console.log('Requesting accounts...');
      // Always request accounts to ensure MetaMask extension shows its window
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      console.log('Getting signer...');
      const signer = await provider.getSigner();
      console.log('Getting address...');
      const address = await signer.getAddress();
      console.log('Getting network...');
      const network = await provider.getNetwork();
      console.log('Getting current block...');
      const currentBlock = await provider.getBlockNumber();
      console.log('Getting balance...');
      const balance = ethers.formatEther(await provider.getBalance(address, currentBlock));
      
      console.log('Setting wallet state with address:', address);
      setWalletState({
        address,
        isConnected: true,
        provider,
        signer,
        chainId: Number(network.chainId),
        balance,
        isConnecting: false,
      });
      
      toast.success(`Wallet connected to ${address.slice(0, 6)}...${address.slice(-4)}`);
      
      console.log('Wallet connected successfully:', address);
      return address;
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      
      toast.error("Failed to connect wallet: " + (error instanceof Error ? error.message : "Unknown error"));
      
      return null;
    }
  };

  /*
   * Disconnects wallet and prevents auto-reconnect:
   * 1. Sets manual disconnect flag
   * 2. Clears wallet state
   * (Afterwards ensures to persist disconnected state)
   */
  const disconnect = () => {
    setManuallyDisconnected(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('manuallyDisconnected', 'true');
    }
    setWalletState({
      address: null,
      isConnected: false,
      provider: null,
      signer: null,
      chainId: null,
      balance: '0',
      isConnecting: false,
    });
    toast.success("Wallet disconnected");
  };

  /*
   * Sets up event listeners for wallet changes:
   * - Account switches in MetaMask
   * - Network changes
   * - Disconnects
   * (Handling cleanup to prevent memory leaks)
   */
  useEffect(() => {
    console.log('Setting up wallet event listeners...');
    
    // Check localStorage directly to ensure we have the latest state
    const isManuallyDisconnected = 
      manuallyDisconnected || 
      (typeof window !== 'undefined' && localStorage.getItem('manuallyDisconnected') === 'true');
    
    // Skip if manually disconnected
    if (isManuallyDisconnected) {
      console.log('Skipping event listeners due to manual disconnect');
      
      // Force disconnect state
      setWalletState({
        address: null,
        isConnected: false,
        provider: null,
        signer: null,
        chainId: null,
        balance: '0',
        isConnecting: false,
      });
      
      return;
    }
    
    if (!isWalletAvailable()) {
      console.log('No wallet provider found');
      return;
    }

    const handleAccountsChanged = async (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        // User disconnected their wallet
        console.log('No accounts found, disconnecting');
        disconnect();
      } else if (walletState.isConnected) {
        // Switching to a different account
        console.log('Switching to account:', accounts[0]);
        try {
          const provider = getProvider();
          if (!provider) {
            console.log('Could not create provider');
            return;
          }
          
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const currentBlock = await provider.getBlockNumber();
          const balance = ethers.formatEther(await provider.getBalance(address, currentBlock));
          
          setWalletState(prev => ({
            ...prev,
            address,
            signer,
            balance,
          }));
          
          toast.info(`Switched to ${address.slice(0, 6)}...${address.slice(-4)}`);
        } catch (error) {
          console.error('Error handling account change:', error);
        }
      }
    };

    const handleChainChanged = (chainId: string) => {
      console.log('Chain changed:', chainId);
      // Reload the page when the chain changes
      window.location.reload();
    };

    // Set up listeners only if ethereum is available
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    
      // Initialize wallet on mount
      console.log('Initializing wallet on mount');
      initializeWallet();
    
      return () => {
        console.log('Removing wallet event listeners');
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [initializeWallet, walletState.isConnected, manuallyDisconnected]);

  // Clears all wallet-related data from both state and localStorage, so after disconnecting nothing remains
  const clearAllWalletData = useCallback(() => {
    console.log('Clearing all wallet data...');
    
    // Reset state
    setWalletState({
      address: null,
      isConnected: false,
      provider: null,
      signer: null,
      chainId: null,
      balance: '0',
      isConnecting: false,
    });
    
    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        // Remove all wallet-related items
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        localStorage.removeItem('connectedWalletAddress');
        localStorage.removeItem('walletType');
        
        // Keep manually disconnected flag
        localStorage.setItem('manuallyDisconnected', 'true');
      } catch (e) {
        console.error('Error clearing localStorage:', e);
      }
    }
  }, []);

  /*
   * Checks on mount if user should be disconnected
   * This ensures to respect user's previous choice to disconnect even after a page refresh
   */
  useEffect(() => {
    const isManuallyDisconnected = 
      typeof window !== 'undefined' && localStorage.getItem('manuallyDisconnected') === 'true';
    
    if (isManuallyDisconnected) {
      console.log('Manual disconnect detected on mount, clearing wallet data');
      clearAllWalletData();
      setManuallyDisconnected(true);
    }
  }, [clearAllWalletData]);

  return {
    address: walletState.address,
    connected: walletState.isConnected,
    loading: walletState.isConnecting,
    provider: walletState.provider,
    signer: walletState.signer,
    chainId: walletState.chainId,
    balance: walletState.balance,
    connect,
    disconnect
  };
};

// Without this, TypeScript would not recognize the ethereum object on window
declare global {
  interface Window {
    ethereum: any;
  }
}