// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title PokemonSwap
/// @notice Contract for swapping Pokémon cards between users
contract PokemonSwap is ReentrancyGuard, Pausable, Ownable {
    IERC721 public immutable pokemonCard; // reference to the PokemonCard contract

    /// @notice Struct to store swap details
    struct Swap {
        address tokenAOwner; // address of the user who created the swap
        uint256 tokenA;      // token ID of the card offered by tokenAOwner
        address tokenBOwner; // address of the user who owns the desired card
        uint256 tokenB;      // token ID of the desired card
        bool executed;       // flag to track if the swap has been executed
    }

    /// @notice Mapping to store swaps by their ID
    mapping(uint256 => Swap) public swaps;

    /// @notice Counter to track the next swap ID (starting at 1)
    uint256 public nextSwapId = 1;

    /// @notice Event emitted when a new swap is created
    event SwapCreated(uint256 indexed swapId, address indexed tokenAOwner, uint256 tokenA, address indexed tokenBOwner, uint256 tokenB);

    /// @notice Event emitted when a swap is executed
    event SwapExecuted(uint256 indexed swapId, address indexed tokenAOwner, address indexed tokenBOwner);

    /// @notice Event emitted when a swap is cancelled
    event SwapCancelled(uint256 indexed swapId, address indexed tokenAOwner);

    /// @notice Constructor sets the PokemonCard contract address
    /// @param _pokemonCard Address of the PokemonCard contract
    constructor(address _pokemonCard) Ownable() {
        pokemonCard = IERC721(_pokemonCard);
    }

    /// @notice Create a new swap
    /// @param tokenA Token ID of the card being offered
    /// @param tokenBOwner Address of the user who owns the desired card
    /// @param tokenB Token ID of the desired card
    /// @return swapId ID of the created swap
    function createSwap(uint256 tokenA, address tokenBOwner, uint256 tokenB) external whenNotPaused nonReentrant returns (uint256 swapId) {
        require(tokenA != tokenB, "Cannot swap the same token");
        require(pokemonCard.ownerOf(tokenA) == msg.sender, "Not the owner of tokenA");
        require(pokemonCard.ownerOf(tokenB) == tokenBOwner, "TokenB not owned by specified owner");
        require(pokemonCard.getApproved(tokenA) == address(this), "Contract not approved for tokenA");

        swapId = nextSwapId++;
        swaps[swapId] = Swap({
            tokenAOwner: msg.sender,
            tokenA: tokenA,
            tokenBOwner: tokenBOwner,
            tokenB: tokenB,
            executed: false
        });

        // Transfer tokenA to the contract (escrow)
        pokemonCard.transferFrom(msg.sender, address(this), tokenA);

        emit SwapCreated(swapId, msg.sender, tokenA, tokenBOwner, tokenB);
        return swapId;
    }

    /// @notice Execute a swap
    /// @param swapId ID of the swap to execute
    function acceptSwap(uint256 swapId) external whenNotPaused nonReentrant {
        Swap storage swap = swaps[swapId];
        require(!swap.executed, "Swap already executed");
        require(msg.sender == swap.tokenBOwner, "Not the tokenB owner");
        require(pokemonCard.getApproved(swap.tokenB) == address(this), "Contract not approved for tokenB");

        // Transfer tokenB to the contract (escrow)
        pokemonCard.transferFrom(swap.tokenBOwner, address(this), swap.tokenB);

        // Execute the swap
        pokemonCard.transferFrom(address(this), swap.tokenBOwner, swap.tokenA);
        pokemonCard.transferFrom(address(this), swap.tokenAOwner, swap.tokenB);

        swap.executed = true;
        emit SwapExecuted(swapId, swap.tokenAOwner, swap.tokenBOwner);
    }

    /// @notice Cancel a swap
    /// @param swapId ID of the swap to cancel
    function cancelSwap(uint256 swapId) external whenNotPaused nonReentrant {
        Swap storage swap = swaps[swapId];
        require(!swap.executed, "Swap already executed");
        require(msg.sender == swap.tokenAOwner, "Not the tokenA owner");

        // Return tokenA to its owner
        pokemonCard.transferFrom(address(this), swap.tokenAOwner, swap.tokenA);

        // Delete the swap instead of marking it as executed
        delete swaps[swapId];
        
        emit SwapCancelled(swapId, swap.tokenAOwner);
    }

    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}