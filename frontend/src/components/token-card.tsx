"use client";

import { Token } from '@/src/types';
import { Card, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Image from 'next/image';
import { useWallet } from '@/src/hooks/useWallet';
import { approveTokenForSwap, isTokenApprovedForSwap } from '@/src/lib/contracts';

interface TokenCardProps {
  token: Token;
  isOwner?: boolean;
  onApproveClick?: (tokenId: number) => void;
}

/*
 * The TokenCard component is the display of a Pokemon card in the collection
 * Shows: card image, token ID, and approval status
 */
export function TokenCard({ token, isOwner = true, onApproveClick }: TokenCardProps) {
  const [loading, setLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { signer, provider, connected } = useWallet();

  // Extract and set card image URL from the token's metadata
  // If no image is found, we use a placeholder image
  useEffect(() => {
    const getImageUrl = async () => {
      try {
        console.log('Processing token:', token);
        
        // Parse base64 metadata
        const base64Data = token.uri.replace('data:application/json;base64,', '');
        const jsonString = atob(base64Data);
        const metadata = JSON.parse(jsonString);
        
        if (metadata && metadata.image) {
          setImageUrl(metadata.image);
        } else {
          console.error('No image found in metadata:', metadata);
          setImageUrl('/placeholder-card.png');
        }
      } catch (error) {
        console.error('Error processing token URI:', error);
        setImageUrl('/placeholder-card.png');
      }
    };

    getImageUrl();
  }, [token.uri]);

  // Check if token is approved for swap on mounts or wallet connection
  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (!provider || !connected) return;
      
      try {
        const approved = await isTokenApprovedForSwap(provider, token.tokenId);
        setIsApproved(approved);
      } catch (error) {
        console.error("Error checking token approval status:", error);
      }
    };

    checkApprovalStatus();
  }, [provider, token.tokenId, connected]);

  // Handle token approval for swap
  const handleApproveClick = async () => {
    setLoading(true);
    
    try {
      if (!signer) {
        throw new Error("Wallet not connected");
      }
      
      // Approve token for swap using contract
      const tx = await approveTokenForSwap(signer, token.tokenId);
      toast.info("Approval transaction submitted. Please wait for confirmation...");
      
      await tx.wait();
      
      setIsApproved(true);
      toast.success(`Card #${token.tokenId} approved for swap`);
    } catch (error) {
      console.error("Error approving token:", error);
      toast.error("Failed to approve token for swap");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg group">
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
        {/* Token ID display */}
        <div className="absolute top-2 left-2 right-2 z-10 space-y-1">
          <p className="text-xs text-black bg-white/80 p-1 rounded">Token ID: {token.tokenId}</p>
        </div>

        {/* Card image with fallback to placeholder */}
        <div className="relative w-full h-64">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={`Token #${token.tokenId}`}
              width={500}
              height={500}
              layout="responsive"
              objectFit="contain"
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={token.tokenId <= 4}
              onError={(e) => {
                console.error('Error loading image:', imageUrl);
                const target = e.target as HTMLImageElement;
                target.src = '/placeholder-card.png';
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-gray-500">Loading card...</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Approve button */}
      <CardFooter className="p-4">
        <Button 
          onClick={handleApproveClick} 
          disabled={loading || isApproved}
          variant={isApproved ? "outline" : "secondary"}
          className="w-full"
        >
          {loading ? 'Approving...' : isApproved ? 'Approved for Swap' : 'Approve for Swap'}
        </Button>
      </CardFooter>
    </Card>
  );
}