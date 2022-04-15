require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const mnemonic = process.env.MNEMONIC || ''
const PRIVATE_KEY_RINKEBY = process.env.PRIVATE_KEY_RINKEBY
const ALCHEMY_API_KEY_ROPSTEN = process.env.ALCHEMY_API_KEY_ROPSTEN
const ALCHEMY_API_KEY_RINKEBY = process.env.ALCHEMY_API_KEY_RINKEBY

const networks = {
  hardhat: {
  },
}

if (process.env.PRIVATE_KEY_RINKEBY) {

  networks.rinkeby = {
    url: `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_API_KEY_RINKEBY}`,
    accounts: [`${PRIVATE_KEY_RINKEBY}`],
    // mnemonic,
  }
}

if (process.env.PRIVATE_KEY_ROPSTEN) {

  networks.ropsten = {
    url: `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_API_KEY_ROPSTEN}`,
    // accounts: [`${ROPSTEN_PRIVATE_KEY}`],
    // mnemonic,
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.10",
  defaultNetwork: "hardhat",
  networks,
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 1000000
  }
};
