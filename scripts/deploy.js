const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Starting BadgeNFT deployment...");

  // Get the contract factory
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");

  // Deploy the contract
  console.log("Deploying BadgeNFT contract...");
  const badgeNFT = await BadgeNFT.deploy();

  // Wait for deployment
  await badgeNFT.waitForDeployment();

  console.log(`BadgeNFT deployed to: ${await badgeNFT.getAddress()}`);
  console.log(`Deployed on network: ${hre.network.name}`);
  console.log(`Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    contractAddress: await badgeNFT.getAddress(),
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address,
    txHash: badgeNFT.deploymentTransaction().hash
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  // Save deployment info to file
  const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  console.log(`Deployment info saved to: ${deploymentFile}`);

  // Wait for a few block confirmations before verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    const deployTx = badgeNFT.deploymentTransaction();
    await deployTx.wait(5);
    
    try {
      console.log("Verifying contract on Etherscan...");
      await hre.run("verify:verify", {
        address: await badgeNFT.getAddress(),
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Contract verification failed:", error.message);
    }
  }

  // Log deployment summary
  console.log("\n=== Deployment Summary ===");
  console.log(`Network: ${hre.network.name}`);
  console.log(`Contract Address: ${await badgeNFT.getAddress()}`);
  console.log(`Deployer: ${deploymentInfo.deployer}`);
  console.log(`Transaction Hash: ${deploymentInfo.txHash}`);
  console.log(`Gas Used: ${badgeNFT.deploymentTransaction().gasLimit?.toString() || 'N/A'}`);
  
  // Provide next steps
  console.log("\n=== Next Steps ===");
  console.log("1. Update your backend .env file with the contract address:");
  console.log(`   BADGE_NFT_CONTRACT_ADDRESS=${await badgeNFT.getAddress()}`);
  console.log("2. Update your frontend configuration if needed");
  console.log("3. Test the contract by running some transactions");
  
  if (hre.network.name === "localhost") {
    console.log("4. Since this is localhost, start the Hardhat node and keep it running");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });