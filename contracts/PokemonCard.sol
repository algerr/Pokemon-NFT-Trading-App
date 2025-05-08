// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title  PokemonCard
/// @notice Pokémon card NFT using ERC721URIStorage (to have the Pokémon card image directly in token metadata on-chain to not having to worry about it in frontend. This makes gas-fee a bit higher, but since this project isn't about using real money, it's fine and makes things easier)
/// @notice Public minting is possible without any roles, simulating the opening of a booster card pack in real life
contract PokemonCard is ERC721URIStorage, Pausable, Ownable {
    uint256 private _nextTokenId = 1; // track token ID of next minted token

    /// @notice Setting token name and symbol on deployment
    constructor() ERC721("PokemonCard", "POK") Ownable() {}

    /// @notice Returns next token ID
    function nextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }

    /// @notice Mint function for minting a new token to address `to` with metadata URI
    /// @param to:  Recipient of the minted token
    /// @param uri: URL pointing to the token's metadata (will contain link to Pokémon image)
    function mint(address to, string memory uri) external whenNotPaused {
        _safeMint(to, _nextTokenId);       // safe minting of token checks for ERC721Receiver
        _setTokenURI(_nextTokenId, uri);    // storing metadata URI on-chain
        _nextTokenId++;                     // incrementing tokenid for next mint
    }

    /// @notice Internal burn override clears stored metadata
    function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
        super._burn(tokenId);
    }

    /// @notice Returns metadata URI for a given token
    /// @param tokenId of the token to query
    /// @return URI string associated with `tokenId`
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }


    // This is just solely for having a possibility to pause the contract while in production and fix errors

    /// @notice Pause the contract
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract
    function unpause() external onlyOwner {
        _unpause();
    }
}