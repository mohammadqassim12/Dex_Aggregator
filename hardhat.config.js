require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.0",
  networks: {
    buildbear: {
      url: process.env.NETWORK_URL, 
      accounts: [process.env.PRIVATE_KEY], 
      timeout: 200000,
    },
  },
};
