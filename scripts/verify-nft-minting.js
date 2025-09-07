const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying NFT Minting Functionality...");
  
  // Test addresses - using the actual connected wallet from frontend
  const testUserAddress = "0xdf52f5e71d07a21934ad9d4ade1d1e31c4c8525c";
  
  // Load deployment info
  const sepoliaDeployment = JSON.parse(fs.readFileSync("deployments/sepolia.json", "utf8"));
  const blockdagDeployment = JSON.parse(fs.readFileSync("deployments/blockdag_testnet.json", "utf8"));
  
  console.log("📋 Contract Information:");
  console.log(`   Sepolia: ${sepoliaDeployment.contractAddress}`);
  console.log(`   BlockDAG: ${blockdagDeployment.contractAddress}`);
  console.log(`   Test User: ${testUserAddress}`);
  
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  
  // Check Sepolia balances
  console.log("\n🔗 Checking Ethereum Sepolia NFT Balances...");
  try {
    const sepoliaContract = BadgeNFT.attach(sepoliaDeployment.contractAddress);
    
    const balance = await sepoliaContract.balanceOf(testUserAddress);
    console.log(`   NFT Balance: ${balance.toString()}`);
    
    const userBadges = await sepoliaContract.getUserBadges(testUserAddress);
    console.log(`   Badge Token IDs: [${userBadges.map(id => id.toString()).join(', ')}]`);
    
    // Get details for each badge
    for (let i = 0; i < userBadges.length; i++) {
      const tokenId = userBadges[i];
      const badgeInfo = await sepoliaContract.getBadgeInfo(tokenId);
      console.log(`   Badge ${i + 1}: Token ID ${tokenId}, Quest ID ${badgeInfo.questId}, Rarity ${badgeInfo.rarity}`);
    }
    
  } catch (error) {
    console.error("   ❌ Error checking Sepolia:", error.message);
  }
  
  // Check authorization status
  console.log("\n🔐 Checking Authorization Status...");
  try {
    const sepoliaContract = BadgeNFT.attach(sepoliaDeployment.contractAddress);
    const backendWallet = "0x785E821b89584897e5f286E2f671CCDe7Fc4f664";
    
    const isAuthorized = await sepoliaContract.authorizedMinters(backendWallet);
    console.log(`   Backend wallet authorized: ${isAuthorized}`);
    
    const contractOwner = await sepoliaContract.owner();
    console.log(`   Contract owner: ${contractOwner}`);
    
  } catch (error) {
    console.error("   ❌ Error checking authorization:", error.message);
  }
  
  console.log("\n✅ Verification completed!");
  console.log("💡 If you see NFT balances > 0, the minting functionality is working correctly!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });