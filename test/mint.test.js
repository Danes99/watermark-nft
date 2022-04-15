// Import built-in modules
const assert = require('assert')

// Import downloaded modules
const { expect } = require("chai");
const { ethers } = require("hardhat");

// Import functions
const testOwnershipMetadata = require('./utils/testTokenOwnership')
const { testEventTokenOwnershipTransfer } = require('./utils/events')

// Constants
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000'
const CONTRACT_NAME = "Some Super Collection"
const CONTRACT_SYMBOL = "SSC"
const CONTRACT_BASE_URI = "www.google.com/myCollection/"

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

describe("Mint", function () {

  it("Can deploy contract", async () => {

    expect(await contract.name()).to.equal(CONTRACT_NAME)
    expect(await contract.symbol()).to.equal(CONTRACT_SYMBOL)

  })

  it("Can mint a token", async () => {

    const tokenOwnerAddress = accountAddresses[0]
    const tokenId = 0
    const fileHash = "myFileHash"
    // const tokenURI = CONTRACT_BASE_URI + tokenId

    const mintTX = await contract.safeMint(tokenOwnerAddress, tokenId, fileHash)
    await mintTX.wait()

    expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(1)
    expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

    await testOwnershipMetadata(
      contract, tokenId, 0,
      contract.address, fileHash, CONTRACT_BASE_URI
    )

    try {
      await testOwnershipMetadata(
        contract, tokenId, 1, NULL_ADDRESS, '', CONTRACT_BASE_URI
      )
      assert(false)
    } catch (error) {
      assert(error)
    }

    await testEventTokenOwnershipTransfer(
      contract, tokenId, 0, tokenOwnerAddress, mintTX.hash
    )

  })

  it("Can mint several tokens", async () => {

    const fileHashBase = "myFileHash"

    // Mint every token
    for (let i = 0, c = accountAddresses.length; i < c; i++) {

      const tokenOwnerAddress = accountAddresses[i]
      const tokenId = i
      const fileHash = fileHashBase + i

      const mintTX = await contract.safeMint(tokenOwnerAddress, i, fileHash)
      await mintTX.wait()

      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(1)
      expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

      await testOwnershipMetadata(
        contract, tokenId, 0,
        contract.address, fileHash, CONTRACT_BASE_URI
      )

      try {
        await testOwnershipMetadata(
          contract, tokenId, 1, NULL_ADDRESS, '', CONTRACT_BASE_URI
        )
        assert(false)
      } catch (error) {
        assert(error)
      }

      await testEventTokenOwnershipTransfer(
        contract, tokenId, 0, tokenOwnerAddress, mintTX.hash
      )

    }
  })

  it("Can mint incrementally", async () => {

    const fileHashBase = "myFileHash"

    // Mint every token
    for (let i = 0, c = accountAddresses.length; i < c; i++) {

      const tokenOwnerAddress = accountAddresses[i]
      const tokenId = i
      const fileHash = fileHashBase + i

      const mintTX = await contract.incrementalSafeMint(tokenOwnerAddress, fileHash)
      await mintTX.wait()

      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(1)
      expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

      await testOwnershipMetadata(
        contract, tokenId, 0,
        contract.address, fileHash, CONTRACT_BASE_URI
      )

      try {
        await testOwnershipMetadata(
          contract, tokenId, 1, NULL_ADDRESS, '', CONTRACT_BASE_URI
        )
        assert(false)
      } catch (error) {
        assert(error)
      }

      await testEventTokenOwnershipTransfer(
        contract, tokenId, 0, tokenOwnerAddress, mintTX.hash
      )

    }
  })

  it("Can mint several tokens to one wallet", async () => {

    const tokenOwnerAddress = accountAddresses[0]
    const numberOfTokenPerWallet = 100
    const fileHashBase = "myFileHash"

    expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(0)

    // Mint every token
    for (let tokenId = 0, c = numberOfTokenPerWallet; tokenId < c; tokenId++) {

      const fileHash = fileHashBase + tokenId

      const mintTX = await contract.safeMint(tokenOwnerAddress, tokenId, fileHash)
      await mintTX.wait()

      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(tokenId + 1)

      await testEventTokenOwnershipTransfer(
        contract, tokenId, 0, tokenOwnerAddress, mintTX.hash
      )

    }

    const testOneToken = async (tokenOwnerAddress, tokenId) => {

      const fileHash = fileHashBase + tokenId
      const tokenURI = CONTRACT_BASE_URI + tokenId

      expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

      await testOwnershipMetadata(
        contract, tokenId, 0,
        contract.address, fileHash, CONTRACT_BASE_URI
      )

      try {
        await testOwnershipMetadata(
          contract, tokenId, 1, NULL_ADDRESS, '', CONTRACT_BASE_URI
        )
        assert(false)
      } catch (error) {
        assert(error)
      }

    }

    const tokens = [...Array(numberOfTokenPerWallet).keys()]

    await Promise.all(
      tokens.map(
        (tokenId) => testOneToken(tokenOwnerAddress, tokenId)
      )
    )

  })

  it("Can mint several tokens to several wallets", async () => {

    const fileHashBase = "myFileHash"
    const numberOfTokenPerWallet = 10

    // Mint every token
    for (let i = 0, c = accountAddresses.length; i < c; i++) {

      const tokenOwnerAddress = accountAddresses[i]

      expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(0)

      for (let j = 0, k = numberOfTokenPerWallet; j < k; j++) {

        const tokenId = numberOfTokenPerWallet * i + j
        const fileHash = fileHashBase + tokenId

        const mintTX = await contract.safeMint(
          tokenOwnerAddress,
          tokenId,
          fileHash
        )

        await mintTX.wait()

        expect(await contract.balanceOf(tokenOwnerAddress)).to.equal(j + 1)

        await testEventTokenOwnershipTransfer(
          contract, tokenId, 0, tokenOwnerAddress, mintTX.hash
        )

      }

    }

    // Verify one token of one wallet
    const testOneToken = async (tokenOwnerAddress, tokenId) => {

      // const tokenId = numberOfTokenPerWallet * i + j
      const fileHash = fileHashBase + tokenId
      const tokenURI = CONTRACT_BASE_URI + tokenId

      expect(await contract.ownerOf(tokenId)).to.equal(tokenOwnerAddress)

      await testOwnershipMetadata(
        contract, tokenId, 0,
        contract.address, fileHash, CONTRACT_BASE_URI
      )

      try {
        await testOwnershipMetadata(
          contract, tokenId, 1, NULL_ADDRESS, '', CONTRACT_BASE_URI
        )
        assert(false)
      } catch (error) {
        assert(error)
      }

    }

    // Verify every token of one wallet
    const testEveryTokenOfOneWallet = async (tokenOwnerAddress, walletIndex) => {

      const tokens = [...Array(numberOfTokenPerWallet).keys()]

      await Promise.all(
        tokens.map((element) => {

          const tokenId = numberOfTokenPerWallet * walletIndex + element
          return testOneToken(tokenOwnerAddress, tokenId)

        })
      )
    }

    // Verify every token
    await Promise.all(
      accountAddresses.map((address, index) =>
        testEveryTokenOfOneWallet(address, index)
      )
    )

  })

})
