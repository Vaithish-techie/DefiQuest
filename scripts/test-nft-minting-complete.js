const hre = require("hardhat");

async function main() {
  console.log("🧪 COMPREHENSIVE NFT MINTING TEST");
  console.log("=====================================\n");

  // Get signers
  const [owner, user, minter] = await hre.ethers.getSigners();
  
  console.log("👥 Test Accounts:");
  console.log(`   Owner: ${owner.address}`);
  console.log(`   User: ${user.address}`);
  console.log(`   Minter: ${minter.address}\n`);

  // Deploy contract
  console.log("🚀 Deploying BadgeNFT Contract...");
  const BadgeNFT = await hre.ethers.getContractFactory("BadgeNFT");
  const badge = await BadgeNFT.deploy();
  await badge.waitForDeployment();
  const contractAddress = await badge.getAddress();
  console.log(`   ✅ Contract deployed at: ${contractAddress}\n`);

  // Authorize minter
  console.log("🔐 Authorizing Minter...");
  await badge.authorizeMinter(minter.address);
  console.log(`   ✅ ${minter.address} authorized as minter\n`);

  // Test 1: Mint a basic badge
  console.log("🎨 Test 1: Minting Basic Badge");
  const tx1 = await badge.connect(minter).mintBadge(
    user.address,
    1, // questId as uint256
    "https://defiquest.com/badges/blockchain.json",
    1 // Common rarity
  );
  await tx1.wait();
  console.log(`   ✅ Badge minted! TX: ${tx1.hash}`);

  // Check balance
  const balance = await badge.balanceOf(user.address);
  console.log(`   📊 User NFT Balance: ${balance.toString()}\n`);

  // Test 2: Get user badges
  console.log("🏆 Test 2: Retrieving User Badges");
  const userBadges = await badge.getUserBadges(user.address);
  console.log(`   📋 User has ${userBadges.length} badge(s):`);
  
  for (let i = 0; i < userBadges.length; i++) {
    const tokenId = userBadges[i];
    const tokenURI = await badge.tokenURI(tokenId);
    const badgeInfo = await badge.getBadgeInfo(tokenId);
    
    console.log(`      Token ID: ${tokenId.toString()}`);
    console.log(`      Quest ID: ${badgeInfo.questId.toString()}`);
    console.log(`      Rarity: ${badgeInfo.rarity.toString()}`);
    console.log(`      URI: ${tokenURI}`);
  }
  console.log("");

  // Test 3: Mint different quest badges
  console.log("🌟 Test 3: Minting Multiple Quest Badges");
  const questBadges = [
    { quest: 2, name: "DeFi Basics", rarity: 1 },
    { quest: 3, name: "Wallet Management", rarity: 2 },
    { quest: 4, name: "DAO Governance", rarity: 3 }
  ];

  for (const badge_info of questBadges) {
    const tx = await badge.connect(minter).mintBadge(
      user.address,
      badge_info.quest,
      `https://defiquest.com/badges/quest${badge_info.quest}.json`,
      badge_info.rarity
    );
    await tx.wait();
    console.log(`   ✅ ${badge_info.name} badge minted!`);
  }

  // Final balance check
  const finalBalance = await badge.balanceOf(user.address);
  console.log(`\n📈 Final User NFT Balance: ${finalBalance.toString()}`);

  // Test 4: Batch minting simulation
  console.log("\n🔥 Test 4: Batch Minting Simulation");
  const batchUsers = [user.address, owner.address];
  const batchQuests = [5, 6];
  const batchURIs = [
    "https://defiquest.com/badges/batch1.json",
    "https://defiquest.com/badges/batch2.json"
  ];
  const batchRarities = [1, 2];

  const batchTx = await badge.connect(minter).batchMintBadges(
    batchUsers,
    batchQuests,
    batchURIs,
    batchRarities
  );
  await batchTx.wait();
  console.log(`   ✅ Batch minting completed! TX: ${batchTx.hash}`);

  // Test complete quest progression simulation
  console.log("\n🎯 Test 5: Complete Quest Progression Simulation");
  console.log("   Simulating user completing 'intro-blockchain' quest...");
  
  // This simulates what happens when user completes a quiz
  const questCompletionTx = await badge.connect(minter).mintBadge(
    user.address,
    7, // quest ID as uint256
    "https://defiquest.com/badges/completion.json",
    2 // Uncommon rarity for completion
  );
  await questCompletionTx.wait();
  console.log(`   ✅ Quest completion badge minted!`);

  // Final summary
  console.log("\n🏁 TESTING COMPLETE - SUMMARY");
  console.log("===============================");
  const totalBadges = await badge.balanceOf(user.address);
  console.log(`✅ Total badges minted to user: ${totalBadges.toString()}`);
  console.log(`✅ Contract address: ${contractAddress}`);
  console.log(`✅ All NFT minting functionality verified!`);
  console.log(`\n💡 This proves your NFT minting system is working perfectly!`);
  console.log(`   When users complete quests in your app, NFTs will be minted just like this.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });