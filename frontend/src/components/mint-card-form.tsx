"use client";

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getPokemonCardContract } from '@/src/lib/contracts';
import { useWallet } from '@/src/hooks/useWallet';
import { CONTRACT_ADDRESSES } from '@/src/config/contracts';
import { ethers } from 'ethers';
import { motion, AnimatePresence } from 'framer-motion';
import PokemonCardABI from '@/src/config/abi/PokemonCard.json';

/*
 * Collection of Pokémon card image URLs from PokeAPI
 * Each URL points to the official artwork of a Pokémon
 */
const CARD_IMAGES = [
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png", // Pikachu
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png",  // Bulbasaur
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png",  // Charmander
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png",  // Squirtle
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/9.png",  // Blastoise
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",  // Charizard
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png", // Mewtwo
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/143.png", // Snorlax
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/94.png",  // Gengar
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/149.png", // Dragonite
];

/*
 * MintCardForm component allows users to mint new Pokemon card NFTs
 * Features:
 * - Random card selection from predefined collection
 * - Contract verification before minting
 * - Card preview after successful mint
 * - Fallback mechanisms for contract interaction
 */
export function MintCardForm() {
  const { signer, address, connected, provider } = useWallet();
  const [loading, setLoading] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [mintedCard, setMintedCard] = useState<{ image: string; name: string } | null>(null);

  // Track contract connection status and errors
  const [contractDetails, setContractDetails] = useState({
    contractAddress: '',
    error: '',
    contractCheckComplete: false
  });

  // Verify contract exists and is accessible
  useEffect(() => {
    const checkContract = async () => {
      if (!connected || !provider) return;
      
      try {
        setContractDetails(prev => ({ 
          ...prev, 
          contractAddress: CONTRACT_ADDRESSES.POKEMON_CARD,
          error: ''
        }));
        
        // Try with wallet provider first
        try {
          const code = await provider?.getCode(CONTRACT_ADDRESSES.POKEMON_CARD);
          if (!code || code === '0x') {
            throw new Error("No contract deployed at the specified address");
          }
          
          const contract = getPokemonCardContract(provider);
          await contract.name();
          
          setContractDetails(prev => ({ 
            ...prev, 
            contractCheckComplete: true,
            error: ''
          }));
          return;
        } catch (error) {
          console.error("Error with wallet provider:", error);
        }
        
        // Fallback to direct JsonRpcProvider
        const directProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const code = await directProvider.getCode(CONTRACT_ADDRESSES.POKEMON_CARD);
        
        if (!code || code === '0x') {
          throw new Error("No contract deployed at the specified address");
        }
        
        const contract = new ethers.Contract(
          CONTRACT_ADDRESSES.POKEMON_CARD,
          PokemonCardABI.abi,
          directProvider
        );
        
        await contract.name();
        
        setContractDetails(prev => ({ 
          ...prev, 
          contractCheckComplete: true,
          error: ''
        }));
      } catch (error) {
        console.error("Contract check failed:", error);
        setContractDetails(prev => ({ 
          ...prev, 
          error: 'Failed to connect to contract',
          contractCheckComplete: true
        }));
      }
    };
    
    checkContract();
  }, [connected, provider]);

  // Mint a new token
  const mintCard = async () => {
    if (!connected) {
      toast.error("Please connect your wallet first");
      return;
    }

    setLoading(true);

    try {
      // Determine mint recipient address
      let mintToAddress = address;
      let cardContract;
      let signerOrProvider;
      
      // Try with wallet signer first
      if (signer) {
        try {
          cardContract = getPokemonCardContract(signer);
          signerOrProvider = signer;
        } catch (error) {
          console.error("Wallet signer failed:", error);
        }
      }
      
      // Fallback to direct provider if needed
      if (!signerOrProvider) {
        const directProvider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const accounts = await directProvider.listAccounts();
        
        if (accounts.length === 0) {
          throw new Error("No accounts available on the network");
        }
        
        const account = accounts[0];
        const directAddress = typeof account === 'string' ? account : account.address;
        const directSigner = await directProvider.getSigner(directAddress);
        
        cardContract = getPokemonCardContract(directSigner);
        signerOrProvider = directSigner;
        mintToAddress = mintToAddress || directAddress;
      }
      
      if (!cardContract || !signerOrProvider || !mintToAddress) {
        throw new Error("Failed to set up contract connection");
      }
      
      // Select random card and prepare metadata
      const randomIndex = Math.floor(Math.random() * CARD_IMAGES.length);
      const nextTokenId = await cardContract.nextTokenId();
      const metadata = {
        name: `Pokemon Card #${nextTokenId}`,
        description: "A unique Pokemon card NFT",
        image: CARD_IMAGES[randomIndex],
        attributes: []
      };
      
      // Convert metadata to base64 URI
      const tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
      
      // Mint the card
      const tx = await cardContract.mint(mintToAddress, tokenURI);
      toast.info("Opening your Pokémon card pack... Please wait for confirmation");
      
      await tx.wait();
      toast.success("Congratulations! You got a new Pokémon card!");
      
      // Show the minted card
      setMintedCard({image: metadata.image, name: metadata.name});
      setShowCard(true);
    } catch (error: any) {
      console.error("Minting failed:", error);
      toast.error(error.message || "Failed to mint card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Open a Pokémon Card Pack</CardTitle>
          <CardDescription>
            Get a random Pokémon card NFT for your collection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Contract error display */}
          {contractDetails.error && (
            <div className="p-3 mb-3 bg-red-50 text-red-700 border border-red-200 rounded-md">
              <p className="text-sm font-medium">Contract Error:</p>
              <p className="text-sm">{contractDetails.error}</p>
              <p className="text-sm mt-1">Contract address: {contractDetails.contractAddress || 'Not available'}</p>
            </div>
          )}

          {/* Card pack description */}
          <div className="text-center py-8">
            <p className="text-lg font-medium mb-4">Ready to open a new card pack?</p>
            <p className="text-sm text-muted-foreground mb-6">
              Each pack contains a random Pokémon card, so be lucky and catch them all!
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {/* Mint button */}
          <Button 
            className="w-full" 
            onClick={mintCard} 
            disabled={loading || (!!contractDetails.error && contractDetails.contractCheckComplete)}
          >
            {loading ? "Opening Card Pack..." : "Open Card Pack"}
          </Button>

          {/* Status messages */}
          <div className="text-xs text-center w-full text-muted-foreground">
            {!connected && <span>Connect your wallet using the Wallet Status card above to open card packs</span>}
            {connected && !contractDetails.contractCheckComplete && <span>Checking contract connection...</span>}
            {connected && contractDetails.contractCheckComplete && !contractDetails.error && (
              <span className="text-green-600">Contract connected successfully</span>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Card preview dialog */}
      <Dialog open={showCard} onOpenChange={setShowCard}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">You got a new card!</DialogTitle>
          </DialogHeader>
          <AnimatePresence>
            {mintedCard && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-lg border bg-gradient-to-br from-yellow-100 to-yellow-200 p-4 shadow-lg">
                  <img
                    src={mintedCard.image}
                    alt={mintedCard.name}
                    className="object-contain w-full h-full"
                  />
                </div>
                <p className="text-lg font-medium text-center">{mintedCard.name}</p>
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