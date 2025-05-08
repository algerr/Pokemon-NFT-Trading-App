"use client";

import Link from 'next/link';
import { useWallet } from '@/src/hooks/useWallet';
import { useSwaps } from '@/src/hooks/useSwaps';
import { WalletCard } from '@/src/components/wallet-card';
import { SwapTable } from '@/src/components/swap-table';
import { CreateSwapForm } from '@/src/components/create-swap-form';
import { Button } from '@/components/ui/button';

/*
 * SwapDashboard component:
 * - Create swaps
 * - View and manage active swaps
 * - Accept or cancel swap offers
 */
export default function SwapDashboard() {
  // Get wallet state and swap management functions
  const { address, connected, loading: walletLoading, connect, disconnect } = useWallet();
  const { swaps, loading: swapsLoading, createSwap, acceptSwap, cancelSwap } = useSwaps(address);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page header with title and navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Swap Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage your token swaps
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/">
              Back to Home
            </Link>
          </Button>
        </div>
      </div>

      {/* Wallet connection component */}
      <WalletCard
        address={address || ''}
        connected={connected}
        loading={walletLoading}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {/* Swap interface (only shown when wallet is connected) */}
      {connected && address && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Create new swap form */}
          <div className="md:col-span-1">
            <CreateSwapForm onCreateSwap={createSwap} />
          </div>
          
          {/* Active swaps table */}
          <div className="md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">Active Swaps</h2>
            <SwapTable
              swaps={swaps}
              userAddress={address}
              onAccept={acceptSwap}
              onCancel={cancelSwap}
              loading={swapsLoading}
            />
          </div>
        </div>
      )}
    </main>
  );
}