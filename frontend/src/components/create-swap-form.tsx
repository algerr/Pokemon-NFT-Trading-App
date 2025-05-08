"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/src/hooks/useWallet';
import { getPokemonCardContract, isTokenApprovedForSwap } from '@/src/lib/contracts';

// Form schema defining using Zod for type-safe form validation
const formSchema = z.object({
  tokenId: z.string().min(1, { message: 'Token ID is required' }).refine(val => !isNaN(Number(val)), {message: 'Token ID must be a number',}),
  counterparty: z.string().min(1, { message: 'Counterparty address is required' }).min(10, { message: 'Must be a valid address' }),
  desiredTokenId: z.string().min(1, { message: 'Desired Token ID is required' }).refine(val => !isNaN(Number(val)), {message: 'Desired Token ID must be a number',}),
});

// Props interface for the CreateSwapForm component
interface CreateSwapFormProps {
  onCreateSwap: (tokenId: number, counterparty: string, desiredTokenId: number) => Promise<void>;
}

export function CreateSwapForm({ onCreateSwap }: CreateSwapFormProps) {
  // State management for loading and various error conditions
  const [loading, setLoading] = useState(false);
  const [tokenIdError, setTokenIdError] = useState<string | null>(null);
  const [desiredTokenIdError, setDesiredTokenIdError] = useState<string | null>(null);
  const [sameTokenIdError, setSameTokenIdError] = useState<string | null>(null);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [counterpartyOwnershipError, setCounterpartyOwnershipError] = useState<string | null>(null);
  const [selfCounterpartyError, setSelfCounterpartyError] = useState<string | null>(null);
  const { provider, address } = useWallet();
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {tokenId: '', counterparty: '', desiredTokenId: ''},
  });

  // Validation function that checks all swap-related conditions
  // By all these extensive checks, the user is prevented from creating invalid swaps and wasting money on gas
  const validateTokenIds = async (tokenId: string, desiredTokenId: string, counterparty: string) => {
    // Reset all error states before validation
    setTokenIdError(null);
    setDesiredTokenIdError(null);
    setSameTokenIdError(null);
    setApprovalError(null);
    setCounterpartyOwnershipError(null);
    setSelfCounterpartyError(null);

    if (!provider || !address) return;

    // 1. Verify that the user owns the token they're trying to swap
    if (tokenId) {
      try {
        const cardContract = getPokemonCardContract(provider);
        const yourTokenOwner = await cardContract.ownerOf(Number(tokenId));
        if (yourTokenOwner.toLowerCase() !== address.toLowerCase()) {
          setTokenIdError('You do not own this token.');
        }
      } catch (err) {
        setTokenIdError('Token does not exist or is invalid.');
      }
    }

    // 2. Check if user has approved the token for swapping
    // (This is required by the ERC721 standard for token transfers)
    if (!tokenIdError && tokenId) {
      try {
        const approved = await isTokenApprovedForSwap(provider, Number(tokenId));
        if (!approved) {
          setApprovalError('Your token is not approved for swap.');
        }
      } catch (err) {
        setApprovalError('Could not check approval status.');
      }
    }

    // 3. Verify that the desired token exists and is owned by counterparty
    if (desiredTokenId && counterparty) {
      try {
        const cardContract = getPokemonCardContract(provider);
        const desiredTokenOwner = await cardContract.ownerOf(Number(desiredTokenId));
        if (desiredTokenOwner.toLowerCase() !== counterparty.toLowerCase()) {
          setCounterpartyOwnershipError('Counterparty does not own the desired token.');
        }
      } catch (err) {
        setDesiredTokenIdError('Desired token does not exist or is invalid.');
      }
    }

    // 4. Prevent same token ID swap
    if (tokenId && desiredTokenId && tokenId === desiredTokenId) {
      setSameTokenIdError('Cannot swap for the same token ID.');
    }

    // 5. Prevent same address swap
    if (counterparty && address && counterparty.toLowerCase() === address.toLowerCase()) {
      setSelfCounterpartyError('Counterparty address cannot be your own address.');
    }
  };

  // Form submission handler (clearing after successful submission)
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setLoading(true);
      await onCreateSwap(
        Number(values.tokenId),
        values.counterparty,
        Number(values.desiredTokenId)
      );
      form.reset();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Swap</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Token ID input field with validation on blur */}
            <FormField
              control={form.control}
              name="tokenId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Token ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="1"
                      {...field}
                      disabled={loading}
                      onBlur={async (e) => {
                        field.onBlur();
                        await validateTokenIds(e.target.value, form.getValues('desiredTokenId'), form.getValues('counterparty'));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {/* Display various error messages if they exist */}
                  {tokenIdError && (
                    <div className="text-red-500 text-xs mt-1">{tokenIdError}</div>
                  )}
                  {sameTokenIdError && (
                    <div className="text-red-500 text-xs mt-1">{sameTokenIdError}</div>
                  )}
                  {approvalError && (
                    <div className="text-red-500 text-xs mt-1">{approvalError}</div>
                  )}
                </FormItem>
              )}
            />
            
            {/* Counterparty address input field with validation on blur */}
            <FormField
              control={form.control}
              name="counterparty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Counterparty Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="0x..."
                      {...field}
                      disabled={loading}
                      onBlur={async (e) => {
                        field.onBlur();
                        await validateTokenIds(form.getValues('tokenId'), form.getValues('desiredTokenId'), e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {/* Display counterparty-related error messages */}
                  {counterpartyOwnershipError && (
                    <div className="text-red-500 text-xs mt-1">{counterpartyOwnershipError}</div>
                  )}
                  {selfCounterpartyError && (
                    <div className="text-red-500 text-xs mt-1">{selfCounterpartyError}</div>
                  )}
                </FormItem>
              )}
            />

            {/* Desired token ID input field with validation on blur */}
            <FormField
              control={form.control}
              name="desiredTokenId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Desired Token ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="2"
                      {...field}
                      disabled={loading}
                      onBlur={async (e) => {
                        field.onBlur();
                        await validateTokenIds(form.getValues('tokenId'), e.target.value, form.getValues('counterparty'));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  {/* Input error messages */}
                  {desiredTokenIdError && (
                    <div className="text-red-500 text-xs mt-1">{desiredTokenIdError}</div>
                  )}
                  {sameTokenIdError && (
                    <div className="text-red-500 text-xs mt-1">{sameTokenIdError}</div>
                  )}
                  {counterpartyOwnershipError && (
                    <div className="text-red-500 text-xs mt-1">{counterpartyOwnershipError}</div>
                  )}
                </FormItem>
              )}
            />
            
            {/* Submit button (is disabled when loading or any errors) */}
            <Button type="submit" className="w-full mt-4" disabled={loading || !!tokenIdError || !!desiredTokenIdError || !!sameTokenIdError || !!approvalError || !!counterpartyOwnershipError || !!selfCounterpartyError}>
              Create Swap
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}