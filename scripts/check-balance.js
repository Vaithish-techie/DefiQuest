const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Network:", hre.network.name);
  console.log("Wallet address:", signer.address);
  
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "BDAG");
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("Chain ID:", network.chainId.toString());
}

main().catch(console.error);