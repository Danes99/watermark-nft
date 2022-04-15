// Import built-in modules
const assert = require('assert')

const { expect } = require("chai")
const { ethers } = require("hardhat")

// Import functions
const testOwnershipMetadata = require('./utils/testTokenOwnership')
const { testEventTokenOwnershipTransfer } = require('./utils/events')

// Constants
const CONTRACT_NAME = "Some Super Collection"
const CONTRACT_SYMBOL = "SSC"
const STORAGE_BUCKET_BASE_URI = "www.google.com/myCollection/"

// variables: ETH Addresses
let contractOwner
let accounts
let contractOwnerAddress
let accountAddresses

// Contracts
let factory
let collectionABI

beforeEach(async () => {

  // Participants
  [contractOwner, ...accounts] = await ethers.getSigners();
  [contractOwnerAddress, ...accountAddresses] = (await ethers.getSigners()).map(e => e.address)

  // Contract deployment
  const Contract = await ethers.getContractFactory("WatermarkFactory")
  factory = await Contract.deploy()
  await factory.deployed()

  const CollectionContract = await ethers.getContractFactory("DeployableCollection")
  collectionABI = CollectionContract.interface

})

describe("Factory", function () {

  it("Can deploy a collection", async () => {

    let collectionAddresses

    collectionAddresses = await factory.getDeployedCollections()
    expect(collectionAddresses.length).to.equal(0)

    const deployTX = await factory.deployCollection(CONTRACT_NAME, CONTRACT_SYMBOL, STORAGE_BUCKET_BASE_URI)
    await deployTX.wait()

    collectionAddresses = await factory.getDeployedCollections()
    expect(collectionAddresses.length).to.equal(1)

  })

  it("Can interact with deployed collection", async () => {

    const deployTX = await factory.deployCollection(CONTRACT_NAME, CONTRACT_SYMBOL, STORAGE_BUCKET_BASE_URI)
    await deployTX.wait()

    const [collectionAddress] = await factory.getDeployedCollections()
    const collection = new ethers.Contract(collectionAddress, collectionABI, contractOwner)

    expect(await collection.name()).to.equal(CONTRACT_NAME)
    expect(await collection.symbol()).to.equal(CONTRACT_SYMBOL)

  })

  it("Can several token have multiple transfers and certification", async () => {

    const [collectionOwner, ...tokenOwners] = accounts

    const deployTX = await factory.connect(collectionOwner).deployCollection(CONTRACT_NAME, CONTRACT_SYMBOL, STORAGE_BUCKET_BASE_URI)
    await deployTX.wait()

    const [collectionAddress] = await factory.getDeployedCollections()
    const collection = new ethers.Contract(collectionAddress, collectionABI, contractOwner)

    for (let tokenId = 0, maxTokenId = 20; tokenId < maxTokenId; tokenId++) {

      // Data
      const tokenURI = STORAGE_BUCKET_BASE_URI + tokenId
      const fileHash = "myFileHash"
      const firstTokenOwnerIndex = 0

      // Mint token
      const mintTX = await collection.connect(collectionOwner).safeMint(tokenOwners[firstTokenOwnerIndex].address, tokenId, fileHash)
      // const mintTX = await collection.connect(collectionOwner).incrementalSafeMint(tokenOwners[firstTokenOwnerIndex].address, fileHash)
      await mintTX.wait()

      // Chain of certification & transfer
      for (let i = firstTokenOwnerIndex, c = tokenOwners.length - 2; i < c; i++) {

        const tokenOwner = tokenOwners[i]
        const tokenOwnerAddress = tokenOwner.address
        const tokenReceiverAddress = tokenOwners[i + 1].address
        const ownerCounter = i + 1
        const newFileHash = fileHash + ownerCounter

        // Test: Try to Transfer Token Ownership (before certification)
        try {
          const transferTx = await collection.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
          await transferTx.wait()
          assert(false)
        } catch (error) {
          assert(error)
        }

        // Test Token Ownership Metadata (before certification)
        try {
          await collection.getOwnershipMetadata(tokenId, ownerCounter)
          assert(false)
        } catch (error) {
          assert(error)
        }

        // Certify Token Ownership
        const certifyTx = await collection.connect(tokenOwner).certifyTokenOwnership(tokenId, newFileHash)
        await certifyTx.wait()

        await testOwnershipMetadata(
          collection, tokenId, ownerCounter,
          tokenOwnerAddress, newFileHash, STORAGE_BUCKET_BASE_URI
        )

        // Transfer Token Ownership
        const transferTx = await collection.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
        await transferTx.wait()

        await testEventTokenOwnershipTransfer(
          collection, tokenId, ownerCounter, tokenReceiverAddress, transferTx.hash
        )

      }

    }

  })

})