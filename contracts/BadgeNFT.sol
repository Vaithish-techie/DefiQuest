// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BadgeNFT is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Quest-related mappings
    mapping(uint256 => uint256) public questIds; // tokenId -> questId
    mapping(address => uint256[]) public userBadges; // user -> badge tokenIds
    mapping(uint256 => bool) public questCompletionBadges; // questId -> exists
    
    // Authorized minters (backend services)
    mapping(address => bool) public authorizedMinters;
    
    // Badge tiers for different achievement levels
    enum BadgeRarity { COMMON, RARE, EPIC, LEGENDARY }
    mapping(uint256 => BadgeRarity) public badgeRarity;
    
    // Events
    event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed questId, BadgeRarity rarity);
    event MinterAuthorized(address indexed minter);
    event MinterRevoked(address indexed minter);

    constructor() ERC721("DeFiQuest Badges", "DQB") {
        _tokenIdCounter.increment(); // Start from token ID 1
    }

    modifier onlyAuthorizedMinter() {
        require(authorizedMinters[msg.sender] || msg.sender == owner(), "Not authorized to mint");
        _;
    }

    function authorizeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = true;
        emit MinterAuthorized(minter);
    }

    function revokeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRevoked(minter);
    }

    function mintBadge(
        address to, 
        uint256 questId, 
        string memory tokenURI,
        BadgeRarity rarity
    ) public onlyAuthorizedMinter nonReentrant {
        _mintBadgeInternal(to, questId, tokenURI, rarity);
    }

    function _mintBadgeInternal(
        address to, 
        uint256 questId, 
        string memory tokenURI,
        BadgeRarity rarity
    ) internal {
        require(to != address(0), "Cannot mint to zero address");
        require(!questCompletionBadges[questId] || questId == 0, "Badge already exists for this quest");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        questIds[tokenId] = questId;
        badgeRarity[tokenId] = rarity;
        userBadges[to].push(tokenId);
        
        if (questId > 0) {
            questCompletionBadges[questId] = true;
        }
        
        emit BadgeMinted(to, tokenId, questId, rarity);
    }

    function batchMintBadges(
        address[] calldata recipients,
        uint256[] calldata questIdList,
        string[] calldata tokenURIs,
        BadgeRarity[] calldata rarities
    ) external onlyAuthorizedMinter nonReentrant {
        require(
            recipients.length == questIdList.length && 
            questIdList.length == tokenURIs.length && 
            tokenURIs.length == rarities.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mintBadgeInternal(recipients[i], questIdList[i], tokenURIs[i], rarities[i]);
        }
    }

    function getUserBadges(address user) external view returns (uint256[] memory) {
        return userBadges[user];
    }

    function getBadgeInfo(uint256 tokenId) external view returns (
        uint256 questId,
        BadgeRarity rarity,
        string memory uri
    ) {
        require(_exists(tokenId), "Token does not exist");
        return (questIds[tokenId], badgeRarity[tokenId], tokenURI(tokenId));
    }

    function getUserBadgeCount(address user) external view returns (uint256) {
        return userBadges[user].length;
    }

    function getTotalSupply() external view returns (uint256) {
        return _tokenIdCounter.current() - 1;
    }

    // Override transfer functions to update user badge arrays
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        if (from != address(0) && to != address(0)) {
            // Remove from sender's badge list
            uint256[] storage fromBadges = userBadges[from];
            for (uint256 i = 0; i < fromBadges.length; i++) {
                if (fromBadges[i] == tokenId) {
                    fromBadges[i] = fromBadges[fromBadges.length - 1];
                    fromBadges.pop();
                    break;
                }
            }
            
            // Add to recipient's badge list
            userBadges[to].push(tokenId);
        }
    }

    // Emergency functions
    function emergencyMintToOwner(string memory tokenURI) external onlyOwner {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        _safeMint(owner(), tokenId);
        _setTokenURI(tokenId, tokenURI);
        userBadges[owner()].push(tokenId);
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
