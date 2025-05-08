"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/src/hooks/useWallet';

interface WalletCardProps {
  address: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => Promise<string | null>;
  onDisconnect: () => void;
}

/*
 * WalletCard component displays wallet connection status and lets user connect/disconnect
 * Uses the useWallet hook
 */
export function WalletCard({ address, connected, loading, onConnect, onDisconnect }: WalletCardProps) {
  // Setting this to true avoids flash of UI when wallet is not detected
  const [hasWallet, setHasWallet] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);

  // Check for wallet availability on mount
  useEffect(() => {
    setHasWallet(typeof window !== 'undefined' && !!window.ethereum);
  }, []);

  // Formatting the address, not showing it entirely (only first 6 and last 4 characters)
  const formatAddress = (address: string) => {
    if (!address) return 'Not connected';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Copy address to clipboard with visual feedback ("Copied!" message for 1200ms)
  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Wallet Status</CardTitle>
        <CardDescription>
          {connected ? 'Your wallet is connected' : 'Connect your wallet to start minting tokens'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Warning banner for users without wallet extension */}
        {!hasWallet && !connected && (
          <div className="border border-yellow-300 bg-yellow-50 dark:bg-yellow-950 dark:border-yellow-800 p-4 rounded-md mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-300">No Wallet Detected</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                  Please install MetaMask to continue.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Connected wallet address display with copy functionality */}
        {connected && (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 rounded-full bg-green-500 animate-pulse ring-4 ring-green-200 shadow-lg"></div>
            <button
              type="button"
              onClick={handleCopy}
              className="font-mono text-lg focus:outline-none hover:underline active:scale-95 transition"
              title={copied ? 'Copied!' : 'Click to copy'}
            >
              {formatAddress(address || '')}
            </button>
            {copied && <span className="ml-2 text-green-600 text-xs">Copied!</span>}
          </div>
        )}
      </CardContent>

      {/* Connect/Disconnect button with loading state */}
      <CardFooter>
        {!connected ? (
          <Button 
            onClick={onConnect} 
            disabled={loading || !hasWallet}
            className="w-full"
          >
            {loading ? 'Connecting...' : 'Connect Wallet'}
          </Button>
        ) : (
          <Button 
            onClick={onDisconnect} 
            variant="outline"
            className="w-full"
          >
            Disconnect Wallet
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}