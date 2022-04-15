pragma solidity ^0.8.10;

// SPDX-License-Identifier: GPL-3.0

// OpenZeppelin Access
import "@openzeppelin/contracts/access/Ownable.sol";

// OpenZeppelin security
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./WatermarkNft.sol";

contract WatermarkFactory is Ownable, Pausable, ReentrancyGuard {
    DeployableCollection[] public deployedCollections;

    function deployCollection(
        string memory name_,
        string memory symbol_,
        string memory baseURI_
    ) public whenNotPaused nonReentrant {
        DeployableCollection newCollection = new DeployableCollection(
            name_,
            symbol_,
            baseURI_,
            msg.sender
        );
        deployedCollections.push(newCollection);
    }

    function getDeployedCollections()
        public
        view
        returns (DeployableCollection[] memory)
    {
        return deployedCollections;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unPause() public onlyOwner {
        _unpause();
    }
}

contract DeployableCollection is WatermarkNFT {
    string internal baseURI;

    uint256 public tokenCounter;

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        address collectionOwner
    ) WatermarkNFT(name_, symbol_) {
        require(bytes(baseURI_).length > 0, "Base URI cannot be null.");
        baseURI = baseURI_;

        transferOwnership(collectionOwner);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function incrementalSafeMint(address to, string memory fileHash)
        public
        whenNotPaused
        onlyOwner
        returns (uint256)
    {
        _steganoSafeMint(to, tokenCounter, fileHash);
        tokenCounter++;
        return tokenCounter;
    }
}
