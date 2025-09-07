const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking NFT balances...");
  
  const contractAddress = "0xd1Ba21Ca5DB1D65c8584B4588934AC3f748B6d3b";
  const wallet1 = "0x785E821b89584897e5f286E2f671CCDe7Fc4f664"; // Your wallet
  const wallet2 = "0xDf52F5e71d07A21934Ad9d4Ade1D1e31c4C8525e"; // Second wallet
  
  console.log(`Contract: ${contractAddress}`);
  console.log(`Wallet 1: ${wallet1}`);
  console.log(`Wallet 2: ${wallet2}`);
  
  // Get the contract
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const contract = BadgeNFT.attach(contractAddress);
  
  try {
    // Check balances
    const balance1 = await contract.balanceOf(wallet1);
    const balance2 = await contract.balanceOf(wallet2);
    
    console.log(`\n📊 NFT Balances:`);
    console.log(`Wallet 1 balance: ${balance1.toString()}`);
    console.log(`Wallet 2 balance: ${balance2.toString()}`);
    
    // Get badges for each wallet
    if (balance1 > 0) {
      const badges1 = await contract.getUserBadges(wallet1);
      console.log(`Wallet 1 badges: ${badges1.map(id => id.toString()).join(', ')}`);
    }
    
    if (balance2 > 0) {
      const badges2 = await contract.getUserBadges(wallet2);
      console.log(`Wallet 2 badges: ${badges2.map(id => id.toString()).join(', ')}`);
    }
    
    // Get total supply
    const totalSupply = await contract.totalSupply();
    console.log(`\n📈 Total NFTs minted: ${totalSupply.toString()}`);
    
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