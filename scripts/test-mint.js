const hre = require("hardhat");

async function main() {
  console.log("🎯 Testing NFT Minting...");
  
  // Get the deployed contract
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const contractAddress = "0xD297B2852aD94B0256a840b631B1cCf0E2154541";
  const contract = BadgeNFT.attach(contractAddress);
  
  console.log(`Contract: ${contractAddress}`);
  
  // Get signer (your wallet)
  const [signer] = await hre.ethers.getSigners();
  console.log(`Signer: ${signer.address}`);
  
  // Test address (your wallet)
  const userAddress = "0x785E821b89584897e5f286E2f671CCDe7Fc4f664";
  
  try {
    // Check current balance
    const balance = await contract.balanceOf(userAddress);
    console.log(`Current NFT balance: ${balance.toString()}`);
    
    // Get all badges for user
    const badges = await contract.getUserBadges(userAddress);
    console.log(`User badges: ${badges.length} badges found`);
    
    for (let i = 0; i < badges.length; i++) {
      console.log(`Badge ${i + 1}: Token ID ${badges[i].toString()}`);
    }
    
    // Try to mint a test badge
    console.log("\n🔨 Attempting to mint test badge...");
    const questId = ethers.utils.formatBytes32String("TestQuest");
    const tokenURI = "https://defiquest.example/metadata/test.json";
    const rarity = 1; // Common
    
    const tx = await contract.mintBadge(userAddress, questId, tokenURI, rarity);
    console.log(`Transaction hash: ${tx.hash}`);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`✅ NFT minted successfully! Block: ${receipt.blockNumber}`);
    
    // Check new balance
    const newBalance = await contract.balanceOf(userAddress);
    console.log(`New NFT balance: ${newBalance.toString()}`);
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.message.includes("Ownable: caller is not the owner")) {
      console.log("💡 Note: You need to be the contract owner to mint. The contract owner is the deployer address.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });