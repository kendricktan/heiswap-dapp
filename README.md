# Heiswap Dapp

---

| Branch | Status | URL |
| --- | --- | --- |
| master | [![Build Status](https://travis-ci.org/kendricktan/heiswap-dapp.svg?branch=master)](https://travis-ci.org/kendricktan/heiswap-dapp) | <a href="https://heiswap.exchange">heiswap.exchange</a> |

---

Heiswap (黑 swap) is an Ethereum transaction mixer that ultilizes parts of [CryptoNote](https://cryptonote.org) to enable zero-knowledge transactions.

It ulitilizes Ring Signatures and pseudo-stealth addresses to achieve its zero-knowledge properties. The [deployed smart contract](https://ropsten.etherscan.io/address/0x8AAbE42EeCA45E040fab330fD24eA6746b832Ad2) handles the signature verification, while the client is responsible for generating the pseudo-stealth address.

Ring signatures was only possible on the EVM (gas-wise) due to the recent addition of [EIP198](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-198.md) and [EIP1895](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1895.md).

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