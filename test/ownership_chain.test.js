// Import built-in modules
const assert = require('assert')

// Import downloaded modules
const { expect } = require("chai")
const { ethers } = require("hardhat")

// Import functions
const testOwnershipMetadata = require('./utils/testTokenOwnership')
const { testEventTokenOwnershipTransfer } = require('./utils/events')

// Constants
const CONTRACT_NAME = "Some Super Collection"
const CONTRACT_SYMBOL = "SSC"
const CONTRACT_BASE_URI = "www.google.com/myCollection/"
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'

// variables: ETH Addresses
let contractOwner
let accounts
let contractOwnerAddress
let accountAddresses
let contract

beforeEach(async () => {

  // Participants
  [contractOwner, ...accounts] = await ethers.getSigners();
  [contractOwnerAddress, ...accountAddresses] = (await ethers.getSigners()).map(e => e.address)

  // Contract deployment
  const Contract = await ethers.getContractFactory("DeployableCollection")
  contract = await Contract.deploy(CONTRACT_NAME, CONTRACT_SYMBOL, CONTRACT_BASE_URI, contractOwnerAddress)
  await contract.deployed()

})


describe("Certification", function () {

  it("Can certify ownership", async () => {

    const tokenOwnerAddress = accountAddresses[0]
    const tokenId = 0
    const fileHash = "myFileHash"
    const newFileHash = "myNewFileHash"

    const mintTX = await contract.safeMint(tokenOwnerAddress, tokenId, fileHash)
    await mintTX.wait()

    const certifyTx = await contract.connect(accounts[0]).certifyTokenOwnership(tokenId, newFileHash);
    await certifyTx.wait()

  })

  it("Can transfer token after ownership certification", async () => {

    const tokenOwnerAddress = accountAddresses[0]
    const tokenReceiverAddress = accountAddresses[1]
    const tokenId = 0
    const fileHash = "myFileHash"
    const newFileHash = "myNewFileHash"

    const mintTX = await contract.safeMint(tokenOwnerAddress, tokenId, fileHash)
    await mintTX.wait()

    const certifyTx = await contract.connect(accounts[0]).certifyTokenOwnership(tokenId, newFileHash)
    await certifyTx.wait()

    const transferTx = await contract.connect(accounts[0]).transferTokenOwnership(tokenReceiverAddress, tokenId)
    await transferTx.wait()

  })

  it("Can make multiple transfer and certification", async () => {

    // Data
    const tokenId = 0
    const fileHash = "myFileHash"
    const firstTokenOwnerIndex = 0

    // Mint token
    const mintTX = await contract.safeMint(accounts[firstTokenOwnerIndex].address, tokenId, fileHash)
    await mintTX.wait()

    await testEventTokenOwnershipTransfer(
      contract, tokenId, 0, accounts[firstTokenOwnerIndex].address, mintTX.hash
    )

    // Test Token Ownership Metadata (before certification)
    try {
      await contract.getOwnershipMetadata(tokenId, firstTokenOwnerIndex)
      assert(false)
    } catch (error) {
      assert(error)
    }

    try {
      await testOwnershipMetadata(
        contract, tokenId, firstTokenOwnerIndex, NULL_ADDRESS, '', CONTRACT_BASE_URI
      )
      assert(false)
    } catch (error) {
      assert(error)
    }

    // Chain of certification & transfer
    for (let i = firstTokenOwnerIndex, c = accounts.length - 2; i < c; i++) {

      const tokenOwner = accounts[i]
      const tokenOwnerAddress = tokenOwner.address
      const tokenReceiverAddress = accountAddresses[i + 1]
      const ownerCounter = i + 1
      const newFileHash = fileHash + ownerCounter
      const tokenURI = CONTRACT_BASE_URI + tokenId

      // Certify Token Ownership
      const certifyTx = await contract.connect(tokenOwner).certifyTokenOwnership(tokenId, newFileHash)
      await certifyTx.wait()

      // Test current token owner (after certification)
      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(1)
      expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

      await testOwnershipMetadata(
        contract, tokenId, ownerCounter,
        tokenOwnerAddress, newFileHash, CONTRACT_BASE_URI
      )

      // Transfer Token Ownership
      const transferTx = await contract.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
      await transferTx.wait()

      await testEventTokenOwnershipTransfer(
        contract, tokenId, ownerCounter, tokenReceiverAddress, transferTx.hash
      )

      // Test former token owner (after transfer)
      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(0)

      // Test new token owner (after transfer)
      expect(await contract.balanceOf(tokenReceiverAddress)).to.equal(1)
      expect(await contract.ownerOf(tokenId)).to.equal(tokenReceiverAddress)

      try {
        await contract.getOwnershipMetadata(tokenId, ownerCounter + 1)
        assert(false)
      } catch (error) {
        assert(error)
      }

    }

  })

  it("Cannot transfer if not certified", async () => {

    // Data
    const tokenId = 0
    const fileHash = "myFileHash"
    const firstTokenOwnerIndex = 0

    // Mint token
    const mintTX = await contract.safeMint(accounts[firstTokenOwnerIndex].address, tokenId, fileHash)
    await mintTX.wait()

    await testEventTokenOwnershipTransfer(
      contract, tokenId, 0, accounts[firstTokenOwnerIndex].address, mintTX.hash
    )

    // Chain of certification & transfer
    for (let i = firstTokenOwnerIndex, c = accounts.length - 2; i < c; i++) {

      const tokenOwner = accounts[i]
      // const tokenOwnerAddress = tokenOwner.address
      const tokenReceiverAddress = accountAddresses[i + 1]
      const ownerCounter = i + 1
      const newFileHash = fileHash + ownerCounter

      // Test: Try to Transfer Token Ownership (before certification)
      try {
        const transferTx = await contract.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
        await transferTx.wait()
        assert(false)
      } catch (error) {
        assert(error)
      }


      // Test Token Ownership Metadata (before certification)
      try {
        await contract.getOwnershipMetadata(tokenId, ownerCounter)
        assert(false)
      } catch (error) {
        assert(error)
      }

      // Certify Token Ownership
      const certifyTx = await contract.connect(tokenOwner).certifyTokenOwnership(tokenId, newFileHash)
      await certifyTx.wait()

      // Transfer Token Ownership
      const transferTx = await contract.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
      await transferTx.wait()

      await testEventTokenOwnershipTransfer(
        contract, tokenId, ownerCounter, tokenReceiverAddress, transferTx.hash
      )

    }

  })

  it("Can several token have multiple transfers and certification", async () => {

    for (let tokenId = 0, maxTokenId = 20; tokenId < maxTokenId; tokenId++) {

      // Data
      const fileHash = "myFileHash"
      const firstTokenOwnerIndex = 0
      const tokenURI = CONTRACT_BASE_URI + tokenId

      // Mint token
      const mintTX = await contract.safeMint(accounts[firstTokenOwnerIndex].address, tokenId, fileHash)
      await mintTX.wait()

      await testEventTokenOwnershipTransfer(
        contract, tokenId, 0, accounts[firstTokenOwnerIndex].address, mintTX.hash
      )

      // Chain of certification & transfer
      for (let i = firstTokenOwnerIndex, c = accounts.length - 2; i < c; i++) {

        const tokenOwner = accounts[i]
        const tokenOwnerAddress = tokenOwner.address
        const tokenReceiverAddress = accountAddresses[i + 1]
        const ownerCounter = i + 1
        const newFileHash = fileHash + ownerCounter

        // Test: Try to Transfer Token Ownership (before certification)
        try {
          const transferTx = await contract.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
          await transferTx.wait()
          assert(false)
        } catch (error) {
          assert(error)
        }


        // Test Token Ownership Metadata (before certification)
        try {
          await contract.getOwnershipMetadata(tokenId, ownerCounter)
          assert(false)
        } catch (error) {
          assert(error)
        }

        // Certify Token Ownership
        const certifyTx = await contract.connect(tokenOwner).certifyTokenOwnership(tokenId, newFileHash)
        await certifyTx.wait()

        await testOwnershipMetadata(
          contract, tokenId, ownerCounter,
          tokenOwnerAddress, newFileHash, CONTRACT_BASE_URI
        )

        // Transfer Token Ownership
        const transferTx = await contract.connect(tokenOwner).transferTokenOwnership(tokenReceiverAddress, tokenId)
        await transferTx.wait()

        await testEventTokenOwnershipTransfer(
          contract, tokenId, ownerCounter, tokenReceiverAddress, transferTx.hash
        )

      }

    }

  })

})