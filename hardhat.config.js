require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    buildbear: {
      url: process.env.NETWORK_URL, 
      accounts: [process.env.PRIVATE_KEY], 
      timeout: 200000,
    },
  },
};
