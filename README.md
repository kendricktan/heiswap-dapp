# Heiswap Dapp

[![Netlify Status](https://api.netlify.com/api/v1/badges/25777c9c-88bd-4f98-8711-f298e28a43c7/deploy-status)](https://app.netlify.com/sites/heiswap-exchange/deploys)

Heiswap (黑 swap) is an Ethereum transaction mixer that ultilizes parts of [CryptoNote](https://cryptonote.org) to enable zero-knowledge transactions.

It ulitilizes Ring Signatures and pseudo-stealth addresses to achieve its zero-knowledge properties. The [deployed smart contract](https://ropsten.etherscan.io/address/0xbbbf35a4485992520557ae729e21ba35aab178d7) handles the signature verification, while the client is responsible for generating the pseudo-stealth address.

Ring signatures was only possible on the EVM (gas-wise) due to the recent addition of [EIP198](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-198.md).

[You can play with the Ropsten version right now](https://heiswap.exchange/).

# Development
Project is a standard `create-react-app` project, using `truffle` to compile, migrate and deploy contracts.

Solidity files are located in `contracts`, and compiled to `src/contracts`

Run `yarn start` to run the project.

The [proof-of-concept repository is located here](https://github.com/kendricktan/heiswap-poc).

## Verifying Contract on Etherscan

1. Deploy to etherscan. (`truffle migrate --network ropsten`)
    - Remember to export ENV vars `ETH_SK` and `INFURA_KEY`
2. Install [truffle-flattener](https://www.npmjs.com/package/truffle-flattener)
3. Flatten source files: `truffle-flattener contracts/AltBn128.sol contracts/Heiswap.sol contracts/LSAG.sol > /tmp/etherscan.sol`
4. Upload single large file (`/tmp/etherscan.sol`) on to etherscan to verify, remember to add the library addresses from `src/contracts/Heiswap.json` -> `links`.


# Special Thanks

This project would not have been possible without the existence of other open sourced projects, most notably

- [HarryR](https://github.com/HarryR/solcrypto)
- [CryptoNote](https://eprint.iacr.org/2004/027.pdf)
- [Piper Merriam](https://github.com/ethereum/py_ecc/blob/master/py_ecc/bn128/bn128_curve.py)