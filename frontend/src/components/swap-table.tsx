"use client";

import { Swap } from '@/src/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { getPokemonCardContract } from '@/src/lib/contracts';
import { ethers } from 'ethers';

/*
 * Props for the SwapTable component
 * swaps: List of active swap offers
 * userAddress: Current user's wallet address
 * onAccept: Callback when user accepts a swap
 * onCancel: Callback when user cancels a swap
 * loading: Whether the swaps are being loaded
 */
interface SwapTableProps {
  swaps: Swap[];
  userAddress: string;
  onAccept: (swapId: number) => Promise<void>;
  onCancel: (swapId: number) => Promise<void>;
  loading: boolean;
}

/*
 * SwapTable component displays a list of active swap offers
 * Shows: swap details, token IDs, and actions (accept/cancel)
 * Allows users to view card details and manage their swaps
 */
export function SwapTable({swaps, userAddress, onAccept, onCancel, loading}: SwapTableProps) {
  // Track which swap is currently being processed
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  // Control of card preview in the swap table
  const [showCard, setShowCard] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ image: string; name: string } | null>(null);

  // Handle swap acceptance with loading state
  const handleAccept = async (swapId: number) => {
    setActionLoading(swapId);
    await onAccept(swapId);
    setActionLoading(null);
  };

  // Handle swap cancellation with loading state
  const handleCancel = async (swapId: number) => {
    setActionLoading(swapId);
    await onCancel(swapId);
    setActionLoading(null);
  };

  // Format Ethereum address for display (only first 6 and last 4 characters again)
  const formatAddress = (address: string) => 
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  // Fetch and display card metadata in a dialog
  const showCardDetails = async (tokenId: number) => {
    try {
      if (!window.ethereum) throw new Error("Ethereum provider not found");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const cardContract = getPokemonCardContract(provider);
      
      // Get the token URI and parse base64 metadata
      const tokenURI = await cardContract.tokenURI(tokenId);
      const base64Data = tokenURI.split(',')[1];
      const metadata = JSON.parse(Buffer.from(base64Data, 'base64').toString());
      
      setSelectedCard({image: metadata.image, name: metadata.name});
      setShowCard(true);
    } catch (error) {
      console.error("Error fetching card details:", error);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading swaps...
      </div>
    );
  }

  // Empty state (no swaps found)
  if (swaps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No swaps found. Create your first swap!
      </div>
    );
  }

  return (
    <>
      {/* Swap offers table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {/* Column titles for swaps below */}
            <TableRow>
              <TableHead>Swap ID</TableHead>
              <TableHead>Offerer</TableHead>
              <TableHead>Counterparty</TableHead>
              <TableHead>Offered Token ID</TableHead>
              <TableHead>Desired Token ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {swaps.map((swap) => (
              <TableRow key={swap.swapId}>
                <TableCell className="font-medium">#{swap.swapId}</TableCell>
                <TableCell>{formatAddress(swap.offerer)}</TableCell>
                <TableCell>{formatAddress(swap.counterparty)}</TableCell>
                {/* Clickable token IDs that show card details */}
                <TableCell>
                  <button 
                    onClick={() => showCardDetails(swap.tokenAId)}
                    className="text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    #{swap.tokenAId}
                  </button>
                </TableCell>
                <TableCell>
                  <button 
                    onClick={() => showCardDetails(swap.tokenBId)}
                    className="text-blue-500 hover:text-blue-700 hover:underline"
                  >
                    #{swap.tokenBId}
                  </button>
                </TableCell>
                {/* Swap status badge */}
                <TableCell>
                  <Badge 
                    variant={swap.executed ? "success" : "outline"}
                    className={swap.executed ? "bg-green-500" : ""}
                  >
                    {swap.executed ? "Executed" : "Pending"}
                  </Badge>
                </TableCell>
                {/* Action buttons based on user role */}
                <TableCell>
                  {!swap.executed && (
                    <>
                      {swap.counterparty === userAddress && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAccept(swap.swapId)}
                          disabled={actionLoading === swap.swapId}
                          className="mr-2"
                        >
                          Accept
                        </Button>
                      )}
                      {swap.offerer === userAddress && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(swap.swapId)}
                          disabled={actionLoading === swap.swapId}
                        >
                          Cancel
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Card preview dialog */}
      <Dialog open={showCard} onOpenChange={setShowCard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Pokémon Card</DialogTitle>
          </DialogHeader>
          <AnimatePresence>
            {selectedCard && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 shadow-lg">
                  <img
                    src={selectedCard.image}
                    alt={selectedCard.name}
                    className="object-contain w-full h-full"
                  />
                </div>
                <p className="text-lg font-medium text-center">{selectedCard.name}</p>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCard(false)}
                  className="mt-2"
                >
                  Close
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
}