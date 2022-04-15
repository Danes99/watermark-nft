// contracts/MyNFT.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

// OpenZeppelin Utils
import "@openzeppelin/contracts/utils/Strings.sol";

// OpenZeppelin Access
import "@openzeppelin/contracts/access/Ownable.sol";

// OpenZeppelin security
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// OpenZeppelin ERC-721 standard
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract WatermarkNFT is IERC721, ERC721, Ownable, Pausable, ReentrancyGuard {
    // Upgrading uints
    using Strings for uint256;

    // The Ownership-Chain for a single token
    struct tokenOwnershipChain {
        uint256 ownerCounter;
        mapping(uint256 => address) owners;
        mapping(uint256 => string) fileHashs;
    }

    // string internal baseURI;

    // Each token has its unique Ownership-Chain
    mapping(uint256 => tokenOwnershipChain) public tokenOwnershipChains;

    constructor(string memory _name, string memory _symbol)
        // ,
        // string memory inputBaseURI
        ERC721(_name, _symbol)
    {
        // baseURI = inputBaseURI;
    }

    // Event
    event TokenOwnershipCertification(
        uint256 indexed tokenId,
        uint256 indexed ownerCounter,
        address indexed by
    );

    event TokenOwnershipTransfer(
        uint256 indexed tokenId,
        uint256 indexed ownerCounter,
        address indexed to
    );

    modifier onlyTokenOwner(uint256 tokenId) {
        // Sender must be owner of the token
        require(
            ownerOf(tokenId) == _msgSender(),
            "You are not owner of the token"
        );
        _;
    }

    // function safeMint(
    //     address to,
    //     uint256 tokenId,
    //     string memory fileHash
    // )
    //     public
    //     virtual
    //     whenNotPaused
    //     // nonReentrant
    //     onlyOwner
    // {
    //     _safeMint(to, tokenId);

    //     // Genesis file ownership meta-data
    //     tokenOwnershipChains[tokenId].owners[0] = address(this);
    //     tokenOwnershipChains[tokenId].fileHashs[0] = fileHash;

    //     // First owner of the token
    //     tokenOwnershipChains[tokenId].ownerCounter++;

    //     emit TokenOwnershipCertification(tokenId, 0, address(this));
    //     emit TokenOwnershipTransfer(tokenId, 0, to);
    // }

    function safeMint(
        address to,
        uint256 tokenId,
        string memory fileHash
    ) public virtual whenNotPaused nonReentrant onlyOwner {
        _steganoSafeMint(to, tokenId, fileHash);
    }

    function _steganoSafeMint(
        address to,
        uint256 tokenId,
        string memory fileHash
    ) internal virtual {
        _safeMint(to, tokenId);

        // Genesis file ownership meta-data
        tokenOwnershipChains[tokenId].owners[0] = address(this);
        tokenOwnershipChains[tokenId].fileHashs[0] = fileHash;

        // First owner of the token
        tokenOwnershipChains[tokenId].ownerCounter++;

        emit TokenOwnershipCertification(tokenId, 0, address(this));
        emit TokenOwnershipTransfer(tokenId, 0, to);
    }

    function transferTokenOwnership(address to, uint256 tokenId)
        public
        whenNotPaused
        nonReentrant
        onlyTokenOwner(tokenId)
    {
        require(
            doesTokenExists(
                tokenId,
                tokenOwnershipChains[tokenId].ownerCounter
            ),
            "Watermark NFT: Certification not carried out."
        );

        _safeTransfer(_msgSender(), to, tokenId, "");

        emit TokenOwnershipTransfer(
            tokenId,
            tokenOwnershipChains[tokenId].ownerCounter,
            to
        );

        tokenOwnershipChains[tokenId].ownerCounter++;
    }

    function certifyTokenOwnership(uint256 tokenId, string memory fileHash)
        public
        whenNotPaused
        nonReentrant
        onlyTokenOwner(tokenId)
    {
        uint256 ownerCounter = tokenOwnershipChains[tokenId].ownerCounter;

        require(
            _exists(tokenId) &&
                (tokenOwnershipChains[tokenId].owners[ownerCounter] ==
                    address(0)) &&
                (bytes(tokenOwnershipChains[tokenId].fileHashs[ownerCounter])
                    .length == 0),
            "File hash already been initialized."
        );

        tokenOwnershipChains[tokenId].fileHashs[ownerCounter] = fileHash;
        tokenOwnershipChains[tokenId].owners[ownerCounter] = _msgSender();

        emit TokenOwnershipCertification(tokenId, ownerCounter, _msgSender());
    }

    function doesTokenExists(uint256 tokenId, uint256 ownerCounter)
        public
        view
        virtual
        returns (bool)
    {
        return
            _exists(tokenId) &&
            (tokenOwnershipChains[tokenId].owners[ownerCounter] !=
                address(0)) &&
            (bytes(tokenOwnershipChains[tokenId].fileHashs[ownerCounter])
                .length > 0);
    }

    function getOwnershipMetadata(uint256 tokenId, uint256 ownerCounter)
        public
        view
        returns (
            address,
            string memory,
            string memory
        )
    {
        // require(
        //     doesTokenExists(tokenId, ownerCounter),
        //     "Watermark NFT: Meta-data query for nonexistent token"
        // );

        string memory _tokenURI = tokenURI(tokenId);
        string memory _tokenURIWithOwnerCounter = bytes(_tokenURI).length > 0
            ? string(abi.encodePacked(_tokenURI, "/", ownerCounter.toString()))
            : "";

        return (
            tokenOwnershipChains[tokenId].owners[ownerCounter],
            tokenOwnershipChains[tokenId].fileHashs[ownerCounter],
            _tokenURIWithOwnerCounter
        );
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unPause() public onlyOwner {
        _unpause();
    }
}
