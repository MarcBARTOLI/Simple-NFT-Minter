# Simple-NFT-Minter
The most basic smart contract for a NFT minter based on [ERC721A](https://github.com/chiru-labs/ERC721A).\
This smart contract is written in Solidity in order to be deployed on the Ethereum blockchain or any L2 blockchain based on Ethereum.\
It is ready to be deployed with Hardhat, or can be easily adapted to be used with any other tool you prefer.

## How to test
1. Install [Hardhat](https://hardhat.org/getting-started/)
2. Run `npx hardhat test`


## Contract overview
### 3 mint phases
- Dev mint to reserve a certain amount of mint to the dev team
- Private mint where whitelisted buyers can mint
- Public mint where everyone can mint

### Mint limit
- 10000 mint total
- 100 mint for the dev team
- 200 mint for the presale

### Mint Price
- Presale price of 1 mint = 0.1 ETH
- Public sale price for 1 mint = 0.2 ETH

### Other features
- Limit of mint by wallet during the presale
- MerkleTree whitelisting
- Metadata URI functions to set and read
- Setters for all non-constant values
- Error handling for each error case
- Protection from reentrancy attacks

## Mint phases overview
### Dev mint
- After the contract deployment, the dev team can immediately mint.
- The mint is limited by the `devSupply` value. This value is constant and cannot be changed after the contract deployment.

### Private mint
- The presale starts when the `startPrivateMint` function is called by the team, and end when the `startPublicMint` function is called by the team.
- The presale is limited by the `presaleSupply` value. This value is constant and cannot be changed after the contract deployment.
- The buyer must send the correct amount of ETH (set by the `presalePrice` value per amount).
- The buyer cannot mint an amount over the maximum in his wallet (set by the `presaleMaxItemsPerWallet` value).
- The buyer must be whitelisted. The verification is done with a Merkle proof (see [merkletreejs](https://github.com/miguelmota/merkletreejs))

### Public mint
- The public sale starts when the `startPublicMint` function is called by the team.
- The public mint is limited by the `collectionSupply` value. This value is constant and cannot be changed after the contract deployment.
- The buyer must send the correct amount of ETH (set by the `mintPrice` value per amount).
