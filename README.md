# Pokemon Card Swap dApp

This decentralized app allows users to swap Pokemon cards (NFTs) using Ethereum smart contracts. Built with Next.js, Solidity, and ethers.js.

## Features

- 🃏 Minting cards, and trading them with other users 
- 🔐 Secure token swapping using smart contracts
- 🎨 Modern and responsive UI
- 🔄 Real-time swap status updates

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [npm](https://www.npmjs.com/)
- [MetaMask extension for your browser](https://metamask.io/)
- [Hardhat](https://hardhat.org/)

## Project Structure

```
pokemon-card-swap/
├── contracts/             # Smart contracts
│   ├── PokemonCard.sol    # ERC721 token contract
│   └── PokemonSwap.sol    # Swap contract
└── frontend/              # Next.js frontend
    ├── src/
    │   ├── components/    # React components
    │   ├── hooks/         # Custom React hooks
    │   ├── lib/           # Utility functions
    │   └── types/         # TypeScript types
    └── public/            # Static assets
```

## Technical Implementation Details

## Smart Contracts Overview

This project consists of two smart contracts. Users can mint collectible Pokémon cards as ERC-721 tokens (NFTs) and swap them securely with others, resembling real-life card pack opening and trading.

---

### 🃏 `PokemonCard.sol`

An ERC-721 compliant NFT contract used to mint individual Pokémon cards. Each token represents a unique card with its own tokenID and image stored in metadata directly on-chain.

#### Features

- **ERC-721 + URI Storage**: Inherits from `ERC721URIStorage` to support fully on-chain metadata URIs, not having to worry about storing the image off-chain.
- **Public Minting**: Minting a card works without access restrictions by just providing a metadata URI — simulating the experience of opening booster packs.
- **Sequential Token IDs**: New tokens are automatically assigned unique, incrementing IDs starting from 1.
- **On-Chain Metadata**: Stores metadata directly on-chain, simplifying frontend access and integration.
- **Admin Controls**: Contract owner can pause and unpause the contract in case of emergencies or updates.

#### Key Functions

- `mint(address to, string memory uri)`: Mints a new card to the specified address with a given metadata URI.
- `nextTokenId()`: Returns the ID of the next token to be minted.
- `pause()` / `unpause()`: Owner-only functions to halt or resume minting.
- `tokenURI(uint256 tokenId)`: Returns the URI associated with a specific token.

#### 📦 Dependencies

- [`@openzeppelin/contracts`](https://docs.openzeppelin.com/contracts/):
  - `ERC721URIStorage`
  - `Pausable`
  - `Ownable`

---

### 🔄 `PokemonSwap.sol`

A secure, non-custodial NFT swap contract that allows users to trade Pokémon cards with one another, held in escrow until both sides complete the trade.

#### Features

- **Decentralized Swapping**: Enables peer-to-peer card exchanges between two users.
- **Escrow Mechanism**: Uses the contract as an escrow to guarantee safe and atomic swaps.
- **Lifecycle Events**: Emits events for every key action — creation, execution, cancellation.
- **Security Focused**: Protects against reentrancy attacks and includes pausability for safety.

#### Swap Structure

```solidity
struct Swap {
    address tokenAOwner;
    uint256 tokenA;
    address tokenBOwner;
    uint256 tokenB;
    bool executed;
}
```

The swap is initiated by the owner of `tokenA`, referred to as `tokenAOwner`, who proposes to trade their token for another token owned by `tokenBOwner`.
Firstly, `tokenAOwner` must approve the `PokemonSwap` contract to manage their token. This approval is crucial because it allows the contract to temporarily hold the token in escrow, ensuring that the token is available for the swap and that `tokenAOwner` cannot withdraw it unilaterally once the swap is initiated.
Once the approval is in place, `tokenAOwner` can create a swap offer by specifying the token they wish to trade (`tokenA`) and the token they wish to receive (`tokenB`). The contract then holds `tokenA` in escrow, awaiting acceptance from `tokenBOwner`. If `tokenBOwner` agrees to the swap, they must also approve the contract to manage their token (`tokenB`). Upon acceptance, both tokens are exchanged atomically, meaning the swap is completed in a single transaction, ensuring that both parties receive their desired tokens simultaneously.
This mechanism of using token approvals and escrow ensures that swaps are secure, preventing either party from backing out after the swap is initiated and protecting against potential fraud or reentrancy attacks.

#### Security

There is not much to worry about regarding security issues, as the swap is peer-to-peer and exchanges only the tokens in an atomic swap. However, to keep instable states in the blockchain and bad things in the ui from happening, the contract employs OpenZeppelin's `ReentrancyGuard` to safeguard against reentrancy attacks. Reentering a function like `acceptSwap` would not do much, because after the swap is done, the tokens are not owned by the previous owners anymore, but it could still mess up things in the frontend. Additionally, the contract features pausable functionality, allowing the contract owner to halt all swap operations in case of emergencies, thus providing a mechanism to respond to unforeseen vulnerabilities or attacks. Of course, also ownership controls are in place, ensuring that only a specific, trusted address can perform administrative actions such as pausing and unpausing the contract. Before a swap can be executed, both parties must approve the contract to manage their tokens, ensuring that the contract can securely hold tokens in escrow and prevent unauthorized transfers. The contract also guarantees atomic swaps, meaning both tokens are exchanged in a single transaction, preventing scenarios where one party could receive a token while the other does not.

### Frontend Architecture

The frontend is built with Next.js 13+ using the App Router pattern, TypeScript, and Tailwind CSS. 
The UI components (Buttons, Cards, Forms, etc.) are adapted from a previous project, while the UI styling is primarily AI-generated (Cursor) using Tailwind CSS, with custom modifications for:
- Responsive design patterns
- Dark/light mode support
- Loading states and animations
- Error states and notifications

#### Contract Interaction

The frontend uses `ethers.js` for smart contract interactions. Custom hooks simplify tasks like token approvals, swap creations, and acceptances by using the `useWallet` hook to access the user's wallet and signer, ensuring correct transaction signing and sending.

**contracts.ts**: With this utility file, we export a contract instance using the provided address and ABI. It ensures that the contract is connected to the user's wallet signer, allowing for authenticated transactions.

#### Custom Hooks

1. **useWallet Hook**: This hook provides an interface for interacting with the user's Web3 wallet. It manages the connection state, retrieves the user's address and signer, and handles wallet-related events such as account changes and network switching.

2. **useTokens Hook**: This hook manages the fetching and real-time updating of the user's token list. It listens for `Transfer` events to dynamically update the token state, ensuring that the UI reflects the latest blockchain state.

3. **useSwap Hook**: This hook handles the creation and acceptance of swaps. It abstracts the logic for interacting with the `PokemonSwap` contract, providing a simple interface for initiating and completing swaps.

#### Real-Time Updates

The integration of event listeners within these hooks allows the frontend to react to blockchain events in real-time. For instance, when a swap is created or accepted, the UI is immediately updated to reflect these changes, providing users with instant feedback on their actions.

Overall, the contract and hook integration in the frontend architecture ensures a smooth and efficient interaction with the blockchain, enhancing the user experience by providing real-time updates and simplifying complex contract operations.

#### Key Technical Features

1. **Token Approval System**
   The token approval system mitigates the risk of accidentally swapping the wrong token and allows for a secure peer-to-peer swap. It implements a permission mechanism where users authorize the swap contract to transfer their tokens, includes transaction confirmation and receipt validation to ensure approvals are properly recorded, features a user-friendly approval interface with clear status indicators, provides detailed error handling with specific messages for common approval issues, and incorporates approval status caching to minimize redundant blockchain queries.
2. **Swap Creation Flow**
   When a user decides to swap a token, the system first validates all inputs to ensure the swap parameters are valid, including checking that the token IDs exist and that the user owns the token they're offering. Once initiated, the transaction can be monitored through the UI providing real-time feedback on its status from pending to confirmed in the swap table. The system listens for the SwapCreated event emitted by the contract to confirm successful creation and update the UI accordingly. This ensures that the frontend state remains synchronized with the blockchain state, providing users with immediate confirmation when their swap is successfully created. Additionally, the swap creation flow includes comprehensive error handling, ensuring users always understand what's happening with their swap request.

4. **Error Handling**
   - Comprehensive error boundary implementation
   - User-friendly error messages
   - Transaction failure recovery
   - Network error handling

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/algerr/Pokemon-NFT-Trading-App
cd Pokemon-NFT-Trading-App
```

### 2. Install Dependencies

```bash
# Install contract dependencies
npm install
# Install frontend dependencies
cd frontend
npm install
```

### 3. Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile
# Start local hardhat node
npx hardhat node
# Deploy to local network
npx hardhat run deploy.js --network localhost
```

### 4. Copy compiled contracts
After compilation, copy the `PokemonCard.json` and the `PokemonSwap.json` from `artifacts/contracts` to `frontend/src/config/abi`, so that the frontend can interact with them.

### 5. Update Contract Addresses

After deployment, update the contract addresses in `.env.local`:

```typescript
NEXT_PUBLIC_POKEMON_CARD_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_POKEMON_SWAP_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

### 6. Set up local network in MetaMask
In the top left of your MetaMask window, click on the Ethereum symbol with the down arrow, and then click on "Add custom network". 
After that, give the network some name (e.g. "Local Hardhat"), add `http://127.0.0.1:8545` as standard RPC, and put in `31337` as Chain-ID. Lastly, set the token symbol to `ETH`.
Now, you just need to add one of the 20 prefunded accounts via their private key, which will show after starting your local hardhat node.
To do this, make sure that you have your local network selected, and click on `Account` at the top center. Then click `Add account`, and choose `Private key`. Now, just paste in one of the private keys and click `Import`. Now, you're all set with 10000 ETH, to try out the application.

### 7. Start the Frontend

```bash
cd frontend
npm start
```

The application will be available at `http://localhost:3000`

## How to Use (Watching the demo video is recommended)

### Setting up local hardhat network, and adding prefunded wallet to MetaMask

1. After installing the MetaMask extension to your 

### Connecting Your Wallet

(Use one of the prefunded accounts, listed on top when starting your local hardhat node. They already have 10000 ETH.)

1. Click "Connect Wallet"
2. Select your wallet in the MetaMask extension
3. Approve the connection request

### Creating a Swap

1. Navigate to the Swaps page
2. Enter the following details:
   - Your Token ID: The ID of the card you want to trade
   - Counterparty Address: The Ethereum address of the person you want to trade with
   - Desired Token ID: The ID of the card you want to receive
3. Click "Create Swap"

### Approving Tokens

Before creating or accepting a swap, you need to approve your tokens:

1. Find your token in the list
2. Click "Approve" on the token you want to trade
3. Confirm the approval transaction in your wallet

### Accepting a Swap

1. Find the swap in the Active Swaps table
2. Click "Accept" on the swap you want to complete
3. Confirm the approval of your token, and the transaction in your wallet

### Canceling a Swap

1. Find your swap in the Active Swaps table
2. Click "Cancel" on the swap you want to cancel
3. Confirm the transaction in your wallet

## Troubleshooting

### Common Issues

1. **Transaction Failed**
   - Ensure you have enough ETH for gas
   - Check if the token is approved
   - Verify you own the tokens you're trying to swap

2. **Contract Not Approved**
   - Make sure to approve your tokens before creating/accepting swaps
   - Check if the approval transaction was successful

3. **Wallet Connection Issues**
   - Ensure MetaMask is installed and unlocked
   - Check if you're on the correct network
   - Try refreshing the page

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Source

For the Pokémon images, I have used the official artworks from the [PokeAPI](https://github.com/PokeAPI/sprites).