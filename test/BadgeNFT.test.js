const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BadgeNFT", function () {
  let badgeNFT;
  let owner;
  let user1;
  let user2;
  let addrs;

  beforeEach(async function () {
    [owner, user1, user2, ...addrs] = await ethers.getSigners();
    
    const BadgeNFT = await ethers.getContractFactory("BadgeNFT");
    badgeNFT = await BadgeNFT.deploy();
    await badgeNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await badgeNFT.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await badgeNFT.name()).to.equal("DeFiQuest Badges");
      expect(await badgeNFT.symbol()).to.equal("DQB");
    });
  });

  describe("Minting", function () {
    it("Should mint a badge to user", async function () {
      const questId = 1;
      const tokenURI = "https://example.com/token/1";
      const rarity = 0; // COMMON

      await badgeNFT.mintBadge(user1.address, questId, tokenURI, rarity);
      
      expect(await badgeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await badgeNFT.ownerOf(1)).to.equal(user1.address);
      expect(await badgeNFT.tokenURI(1)).to.equal(tokenURI);
    });

    it("Should only allow authorized minters to mint", async function () {
      const questId = 1;
      const tokenURI = "https://example.com/token/1";
      const rarity = 0;

      await expect(
        badgeNFT.connect(user1).mintBadge(user2.address, questId, tokenURI, rarity)
      ).to.be.revertedWith("Not authorized to mint");
    });

    it("Should emit BadgeMinted event", async function () {
      const questId = 1;
      const tokenURI = "https://example.com/token/1";
      const rarity = 1; // RARE

      await expect(
        badgeNFT.mintBadge(user1.address, questId, tokenURI, rarity)
      ).to.emit(badgeNFT, "BadgeMinted")
       .withArgs(user1.address, 1, questId, rarity);
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint badges", async function () {
      const recipients = [user1.address, user2.address];
      const questIds = [1, 2];
      const tokenURIs = ["https://example.com/token/1", "https://example.com/token/2"];
      const rarities = [0, 1]; // COMMON, RARE

      await badgeNFT.batchMintBadges(recipients, questIds, tokenURIs, rarities);

      expect(await badgeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await badgeNFT.balanceOf(user2.address)).to.equal(1);
      expect(await badgeNFT.ownerOf(1)).to.equal(user1.address);
      expect(await badgeNFT.ownerOf(2)).to.equal(user2.address);
    });

    it("Should revert batch mint with mismatched arrays", async function () {
      const recipients = [user1.address, user2.address];
      const questIds = [1]; // Different length
      const tokenURIs = ["https://example.com/token/1", "https://example.com/token/2"];
      const rarities = [0, 1];

      await expect(
        badgeNFT.batchMintBadges(recipients, questIds, tokenURIs, rarities)
      ).to.be.revertedWith("Array length mismatch");
    });
  });

  describe("User Badge Retrieval", function () {
    beforeEach(async function () {
      // Mint some badges for user1
      await badgeNFT.mintBadge(user1.address, 1, "https://example.com/token/1", 0);
      await badgeNFT.mintBadge(user1.address, 2, "https://example.com/token/2", 1);
      await badgeNFT.mintBadge(user2.address, 3, "https://example.com/token/3", 2);
    });

    it("Should return all badges for a user", async function () {
      const user1Badges = await badgeNFT.getUserBadges(user1.address);
      const user2Badges = await badgeNFT.getUserBadges(user2.address);

      expect(user1Badges.length).to.equal(2);
      expect(user2Badges.length).to.equal(1);
      expect(user1Badges[0]).to.equal(1);
      expect(user1Badges[1]).to.equal(2);
      expect(user2Badges[0]).to.equal(3);
    });

    it("Should return empty array for user with no badges", async function () {
      const badges = await badgeNFT.getUserBadges(addrs[0].address);
      expect(badges.length).to.equal(0);
    });
  });

  describe("Rarity System", function () {
    it("Should store and retrieve badge rarity", async function () {
      await badgeNFT.mintBadge(user1.address, 1, "https://example.com/token/1", 3); // LEGENDARY
      
      const rarity = await badgeNFT.badgeRarity(1);
      expect(rarity).to.equal(3);
    });

    it("Should revert for invalid rarity", async function () {
      await expect(
        badgeNFT.mintBadge(user1.address, 1, "https://example.com/token/1", 4) // Invalid rarity
      ).to.be.reverted;
    });
  });

  describe("Authorization", function () {
    it("Should add and remove minters", async function () {
      expect(await badgeNFT.authorizedMinters(user1.address)).to.be.false;
      
      await badgeNFT.authorizeMinter(user1.address);
      expect(await badgeNFT.authorizedMinters(user1.address)).to.be.true;
      
      await badgeNFT.revokeMinter(user1.address);
      expect(await badgeNFT.authorizedMinters(user1.address)).to.be.false;
    });

    it("Should only allow owner to manage minters", async function () {
      await expect(
        badgeNFT.connect(user1).authorizeMinter(user2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should allow authorized minters to mint", async function () {
      await badgeNFT.authorizeMinter(user1.address);
      
      await badgeNFT.connect(user1).mintBadge(user2.address, 1, "https://example.com/token/1", 0);
      
      expect(await badgeNFT.balanceOf(user2.address)).to.equal(1);
    });
  });

  describe("Quest Integration", function () {
    it("Should track badges by quest ID", async function () {
      await badgeNFT.mintBadge(user1.address, 1, "https://example.com/token/1", 0);
      await badgeNFT.mintBadge(user2.address, 2, "https://example.com/token/2", 0);
      
      // In a real implementation, you might want to add a function to get badges by quest ID
      // For now, we just verify the tokens were minted successfully
      expect(await badgeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await badgeNFT.balanceOf(user2.address)).to.equal(1);
    });
  });
});