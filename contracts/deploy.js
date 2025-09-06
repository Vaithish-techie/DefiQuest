const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying DeFiQuest BadgeNFT contract...");

  // Get the contract factory
  const BadgeNFT = await ethers.getContractFactory("BadgeNFT");

  // Deploy the contract
  const badgeNFT = await BadgeNFT.deploy();
  await badgeNFT.deployed();

  console.log("BadgeNFT deployed to:", badgeNFT.address);
  console.log("Contract deployed by:", await badgeNFT.owner());

  // Authorize the backend service as a minter (replace with your backend wallet address)
  // const backendWalletAddress = "0x..."; // Your backend service wallet
  // const authTx = await badgeNFT.authorizeMinter(backendWalletAddress);
  // await authTx.wait();
  // console.log("Backend service authorized as minter");

  // Verify the deployment
  const contractName = await badgeNFT.name();
  const contractSymbol = await badgeNFT.symbol();
  const totalSupply = await badgeNFT.getTotalSupply();

  console.log("\n=== Contract Verification ===");
  console.log("Name:", contractName);
  console.log("Symbol:", contractSymbol);
  console.log("Total Supply:", totalSupply.toString());
  console.log("Owner:", await badgeNFT.owner());

  // Save deployment information
  const deploymentInfo = {
    contractAddress: badgeNFT.address,
    contractName: contractName,
    contractSymbol: contractSymbol,
    owner: await badgeNFT.owner(),
    blockNumber: badgeNFT.deployTransaction.blockNumber,
    transactionHash: badgeNFT.deployTransaction.hash
  };

  console.log("\n=== Deployment Info ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });