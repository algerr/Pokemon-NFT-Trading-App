"use client";

import { useWallet } from '@/src/hooks/useWallet';
import { useTokens } from '@/src/hooks/useTokens';
import { WalletCard } from '@/src/components/wallet-card';
import { TokenCard } from '@/src/components/token-card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

/*
 * CardsPage component displays the user's collection of Pokémon cards:
 * - Collection display with loading states
 * - Navigation to minting and swap features
 */
export default function CardsPage() {
  // Get wallet state and user's tokens
  const { address, connected, loading, connect, disconnect } = useWallet();
  const { tokens, loading: tokensLoading } = useTokens(address);

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page header with title and navigation buttons */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Your Cards</h1>
          <p className="text-muted-foreground">
            View and manage your collection of Pokémon cards
          </p>
        </div>
        
        {/* Navigation buttons for minting and swapping */}
        <div className="mt-4 md:mt-0 space-x-2">
          <Button variant="outline" asChild>
            <Link href="/mint" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Mint Cards
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/swaps">
              Go to Swap Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Wallet connection card */}
      <WalletCard
        address={address || ''}
        connected={connected}
        loading={loading}
        onConnect={connect}
        onDisconnect={disconnect}
      />

      {/* Conditional rendering based on wallet and collection state */}
      {!connected ? (
        // Not connected state
        <div className="text-center py-8 bg-muted rounded-lg">
          <p>Connect your wallet to view your cards</p>
        </div>
      ) : tokensLoading ? (
        // Loading state
        <div className="flex justify-center py-12">
          <p>Loading your collection...</p>
        </div>
      ) : tokens.length === 0 ? (
        // Empty collection state
        <div className="text-center py-8 bg-muted rounded-lg">
          <p>You don't own any cards yet</p>
          <Button variant="link" asChild className="mt-2">
            <Link href="/mint">Open your first card pack</Link>
          </Button>
        </div>
      ) : (
        // Collection grid display
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {tokens.map((token) => (
            <TokenCard 
              key={token.tokenId} 
              token={token} 
              isOwner={true}
              onApproveClick={(tokenId) => console.log(`Approved token ${tokenId} for swap`)}
            />
          ))}
        </div>
      )}
    </main>
  );
}