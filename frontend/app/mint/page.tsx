"use client";

import Link from 'next/link';
import { useWallet } from '@/src/hooks/useWallet';
import { WalletCard } from '@/src/components/wallet-card';
import { MintCardForm } from '@/src/components/mint-card-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

/*
 * MintPage component:
 * - Mint new tokens
 * - Random card (image) selection
 * - Card preview after minting
 */
export default function MintPage() {
  // Get wallet state and functions
  const { address, connected, loading, connect, disconnect } = useWallet();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page header with title and navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Mint New Cards</h1>
          <p className="text-muted-foreground">
            Get new Pokémon card NFTs for your collection
          </p>
        </div>
        
        <div className="mt-4 md:mt-0">
          <Button variant="outline" asChild>
            <Link href="/cards" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Collection
            </Link>
          </Button>
        </div>
      </div>

      {/* Wallet connection component */}
      <WalletCard
        address={address || ''}
        connected={connected}
        loading={loading}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {/* Minting interface */}
      <div className="max-w-md mx-auto">
        <MintCardForm />
        
        {/* Help text */}
        <div className="mt-8 text-sm text-center space-y-2 text-muted-foreground">
          <p>
            Open a booster pack to get a random Pokémon card!
          </p>
        </div>
      </div>
    </main>
  );
} 