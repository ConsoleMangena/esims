/**
 * Hardhat configuration
 * Minimal config to run `npx hardhat node`.
 */

import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: { url: "http://127.0.0.1:8545", chainId: 31337 },
  },
};

export default config;
