// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BadgeNFT is ERC721, Ownable {
    uint256 public nextTokenId;

    mapping(uint256 => uint256) public questIds; // tokenId -> questId
    mapping(uint256 => string) private _tokenURIs;

    constructor() ERC721("DeFiQuest Badges", "DQB") {}

    function mintBadge(address to, uint256 questId, string memory tokenURI) external onlyOwner {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        _safeMint(to, tokenId);
        questIds[tokenId] = questId;
        _tokenURIs[tokenId] = tokenURI;
        emit BadgeMinted(to, tokenId, questId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "BadgeNFT: URI query for nonexistent token");
        return _tokenURIs[tokenId];
    }

    event BadgeMinted(address indexed to, uint256 tokenId, uint256 indexed questId);
}
