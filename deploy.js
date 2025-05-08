const { ethers } = require("hardhat");

async function main() {
  // Deploy PokemonCard
  const Card = await ethers.getContractFactory("PokemonCard");
  const card = await Card.deploy();
  console.log("PokemonCard deployed to:", card.target);

  // Deploy PokemonSwap with PokemonCard address
  const Swap = await ethers.getContractFactory("PokemonSwap");
  const swap = await Swap.deploy(card.target);
  console.log("PokemonSwap deployed to:", swap.target);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
