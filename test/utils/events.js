// Import built-in modules
const assert = require('assert')

// Import downloaded modules
const { expect } = require("chai");

const getEventTokenOwnershipTransfer = async (collection, tokenId, ownerCounter) => {

  const filterForm = collection.filters.TokenOwnershipTransfer()
  const logsFrom = await collection.queryFilter(filterForm)

  const event = logsFrom.find(value => {

    const isTokenId = parseInt(value.args?.tokenId) == tokenId
    const isOwnerCounter = parseInt(value.args?.ownerCounter) == ownerCounter

    return isTokenId && isOwnerCounter
  })

  return event
}

const testEventTokenOwnershipTransfer = async (collection, tokenId, ownerCounter, tokenReceiverAddress, transactionHash) => {

  const event = await getEventTokenOwnershipTransfer(collection, tokenId, ownerCounter)

  assert(event)
  assert(event.args)

  // Test Event args
  expect(event.args.tokenId).to.equal(tokenId)
  expect(event.args.ownerCounter).to.equal(ownerCounter)
  expect(event.args.to).to.equal(tokenReceiverAddress)

  // Test Event Metadata
  expect(event.address).to.equal(collection.address)
  expect(event.transactionHash).to.equal(transactionHash)

}

exports.getEventTokenOwnershipTransfer = getEventTokenOwnershipTransfer
exports.testEventTokenOwnershipTransfer = testEventTokenOwnershipTransfer