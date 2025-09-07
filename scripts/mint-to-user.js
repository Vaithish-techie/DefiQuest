const hre = require("hardhat");

async function main() {
  console.log("🎯 Minting NFT for your wallet...");
  
  const contractAddress = "0xd1Ba21Ca5DB1D65c8584B4588934AC3f748B6d3b";
  const userAddress = "0xDf52F5e71d07A21934Ad9d4Ade1D1e31c4C8525e";
  
  console.log(`Contract: ${contractAddress}`);
  console.log(`User: ${userAddress}`);
  
  // Get the contract
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const contract = BadgeNFT.attach(contractAddress);
  
  try {
    // Check current balance
    const balance = await contract.balanceOf(userAddress);
    console.log(`Current NFT balance: ${balance.toString()}`);
    
    // Check if you're the owner
    const owner = await contract.owner();
    const [signer] = await hre.ethers.getSigners();
    console.log(`Contract owner: ${owner}`);
    console.log(`Your address: ${signer.address}`);
    
    if (owner.toLowerCase() === signer.address.toLowerCase()) {
      console.log("✅ You are the contract owner! Proceeding with minting...");
      
      // Mint a badge
      const questId = hre.ethers.encodeBytes32String("DeFiQuest2");
      const tokenURI = "https://defiquest.example/metadata/defi-advanced.json";
      const rarity = 2; // Rare
      
      console.log("🔨 Minting NFT badge...");
      const tx = await contract.mintBadge(userAddress, questId, tokenURI, rarity);
      console.log(`Transaction hash: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`✅ NFT minted successfully! Block: ${receipt.blockNumber}`);
      
      // Check new balance
      const newBalance = await contract.balanceOf(userAddress);
      console.log(`New NFT balance: ${newBalance.toString()}`);
      
      // Get the token ID
      const userBadges = await contract.getUserBadges(userAddress);
      console.log(`Your badges: ${userBadges.map(id => id.toString()).join(', ')}`);
      
    } else {
      console.log("❌ You are not the contract owner. Cannot mint NFT.");
      console.log("This is normal - the contract was deployed by a different address.");
      console.log("Your app should work through the backend API once it's configured correctly.");
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });