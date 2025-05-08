"use client";

import Link from 'next/link';
import { useWallet } from '@/src/hooks/useWallet';
import { WalletCard } from '@/src/components/wallet-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Wallet, Repeat, PlusCircle } from 'lucide-react';

/*
 * Home component:
 * - Main landing page
 * - Navigation to key features:
 *  - Collection
 *  - Minting
 *  - Swapping
 */
export default function Home() {
  // Get wallet state and functions
  const { address, connected, loading, connect, disconnect } = useWallet();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page header with title */}
      <div className="flex flex-col md:flex-row justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Pokémon Card Trading</h1>
          <p className="text-muted-foreground">
            Trade your Pokémon cards with other collectors.
          </p>
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

      {/* Feature cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Collection */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              View Your Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Browse your collection of Pokémon cards</p>
            <Button asChild className="w-full">
              <Link href="/cards" className="flex items-center justify-center gap-2">
                Go to Collection <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Minting */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5" />
              Mint New Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Get new Pokémon cards for your collection</p>
            <Button asChild className="w-full">
              <Link href="/mint" className="flex items-center justify-center gap-2">
                Mint Cards <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Swapping */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5" />
              Swap Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">Trade cards with other collectors</p>
            <Button asChild className="w-full">
              <Link href="/swaps" className="flex items-center justify-center gap-2">
                Go to Swaps <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}