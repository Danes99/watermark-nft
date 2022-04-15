// Import downloaded modules
const { expect } = require("chai");

const testTokenOwnership = async (collection, tokenId, ownerCounter, tokenOwnerAddress, fileHash, baseURI) => {

  const [
    ownershipMetadata,
    doesTokenExist
  ] = await Promise.all([
    collection.getOwnershipMetadata(tokenId, ownerCounter),
    collection.doesTokenExists(tokenId, ownerCounter)
  ])

  const URI = `${baseURI}${baseURI[baseURI.length - 1] === '/' ? '' : '/'}${tokenId}/${ownerCounter}`

  expect(ownershipMetadata[0]).to.equal(tokenOwnerAddress)
  expect(ownershipMetadata[1]).to.equal(fileHash)
  expect(ownershipMetadata[2]).to.equal(URI)

  expect(doesTokenExist).to.equal(true)
}

module.exports = testTokenOwnership