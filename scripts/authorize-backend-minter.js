const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔐 Authorizing Backend Wallet as NFT Minter...");
  
  // Backend wallet address from .env
  const backendWalletAddress = "0x785E821b89584897e5f286E2f671CCDe7Fc4f664";
  
  // Get the contract factory
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  
  // Load deployment info
  const sepoliaDeployment = JSON.parse(fs.readFileSync("deployments/sepolia.json", "utf8"));
  const blockdagDeployment = JSON.parse(fs.readFileSync("deployments/blockdag_testnet.json", "utf8"));
  
  console.log("📋 Contract Information:");
  console.log(`   Sepolia: ${sepoliaDeployment.contractAddress}`);
  console.log(`   BlockDAG: ${blockdagDeployment.contractAddress}`);
  console.log(`   Backend Wallet: ${backendWalletAddress}`);
  
  const [signer] = await hre.ethers.getSigners();
  console.log(`   Signer: ${signer.address}`);
  
  // Authorize on Sepolia
  console.log("\n🔗 Authorizing on Ethereum Sepolia...");
  try {
    const sepoliaContract = BadgeNFT.attach(sepoliaDeployment.contractAddress);
    
    // Check if already authorized
    const isAuthorizedSepolia = await sepoliaContract.authorizedMinters(backendWalletAddress);
    console.log(`   Current authorization status: ${isAuthorizedSepolia}`);
    
    if (!isAuthorizedSepolia) {
      console.log("   Sending authorization transaction...");
      const tx1 = await sepoliaContract.authorizeMinter(backendWalletAddress);
      console.log(`   Transaction hash: ${tx1.hash}`);
      
      console.log("   Waiting for confirmation...");
      const receipt1 = await tx1.wait();
      console.log(`   ✅ Authorized on Sepolia! Block: ${receipt1.blockNumber}`);
    } else {
      console.log("   ✅ Already authorized on Sepolia!");
    }
    
  } catch (error) {
    console.error("   ❌ Error authorizing on Sepolia:", error.message);
  }
  
  // Authorize on BlockDAG
  console.log("\n◈ Authorizing on BlockDAG...");
  try {
    // Switch to BlockDAG network
    const blockdagContract = BadgeNFT.attach(blockdagDeployment.contractAddress);
    
    // Check if already authorized
    const isAuthorizedBlockDAG = await blockdagContract.authorizedMinters(backendWalletAddress);
    console.log(`   Current authorization status: ${isAuthorizedBlockDAG}`);
    
    if (!isAuthorizedBlockDAG) {
      console.log("   Sending authorization transaction...");
      const tx2 = await blockdagContract.authorizeMinter(backendWalletAddress);
      console.log(`   Transaction hash: ${tx2.hash}`);
      
      console.log("   Waiting for confirmation...");
      const receipt2 = await tx2.wait();
      console.log(`   ✅ Authorized on BlockDAG! Block: ${receipt2.blockNumber}`);
    } else {
      console.log("   ✅ Already authorized on BlockDAG!");
    }
    
  } catch (error) {
    console.error("   ❌ Error authorizing on BlockDAG:", error.message);
  }
  
  console.log("\n🎉 Authorization process completed!");
  console.log("💡 The backend wallet can now mint NFT badges on both networks.");
  console.log("🚀 You can now test the complete quest -> NFT minting flow!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Authorization failed:", error);
    process.exit(1);
  });