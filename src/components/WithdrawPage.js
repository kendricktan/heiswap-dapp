// @flow
import BN from 'bn.js'
import { Scalar, Point, serialize, h1, bn128 } from '../utils/AltBn128'
import { append0x } from '../utils/helper'
import React, { useState } from 'react'
import { Form, Flex, Blockie, EthAddress, Icon, Modal, Flash, Card, Box, Button, Loader, Text, Heading, Tooltip } from 'rimble-ui'
import { DappGateway } from '../types/DappGateway'

// BigNumber 0
const bnZero = new BN('0', 10)

// Possible states
const WITHDRAWALSTATES = {
  UnknownError: -2,
  Nothing: -1,
  CorruptedToken: 0,
  RingNotClosed: 1,
  RingNotEnoughParticipantsToClose: 2,
  ForceClosingRing: 3,
  FailedCloseRing: 4,
  SuccessCloseRing: 5,
  InvalidRing: 6,
  InvalidSignature: 7,
  SignatureUsed: 8,
  Withdrawn: 9
}

const WithdrawPage = (props: { dappGateway: DappGateway }) => {
  const { dappGateway } = props

  const [ringParticipants, setRingParticipants] = useState({
    deposited: 0,
    withdrawn: 0
  })
  const [unknownErrorStr, setUnknownErrorStr] = useState('')
  const [txReceipt, setTxReceipt] = useState(null)
  const [forceCloseBlocksLeft, setForceCloseBlocksLeft] = useState(-1)
  const [heiToken, setHeiToken] = useState('')
  const [useRelayer, setUseRelayer] = useState(false)
  const [openModal, setOpenModal] = useState(false)
  const [withdrawalState, setWithdrawalState] = useState(WITHDRAWALSTATES.Nothing)

  const { noWeb3, noContractInstance } = props

  const getModalDisplay = (ws) => {
    if (ws === WITHDRAWALSTATES.Nothing) {
      return <div>
      <Loader style={{ margin: 'auto' }} size='10rem' />
      <br />
      <Text style={{ textAlign: 'center' }}>Withdrawing ETH...</Text>
      <Text style={{ textAlign: 'center' }}>Remember to confirm this withdrawal in your wallet.</Text>
    </div>
    } else if (ws === WITHDRAWALSTATES.ForceClosingRing) {
      return <div>
        <Loader style={{ margin: 'auto' }} size='10rem' />
        <br />
        <Text style={{ textAlign: 'center' }}>Closing pool...</Text>
        <Text style={{ textAlign: 'center' }}>Remember to confirm this in your wallet.</Text>
      </div>
    } else if (ws === WITHDRAWALSTATES.CorruptedToken) {
      return <div>This token doesn't look right. Check you've pasted it correctly and try again.</div>
    } else if (ws === WITHDRAWALSTATES.SuccessCloseRing) {
      return (
        <div>
        <Box>
          <Heading.h3 my="3" fontSize="4">Pool closed</Heading.h3>
          <Text>Your ETH is now ready to withdraw.</Text>
        </Box>
        </div>
        )
    } else if (ws === WITHDRAWALSTATES.FailedCloseRing) {
      return <div>Failed to close ring. Likely an invalid signature or Ring isn't mature enough.</div>
    } else if (ws === WITHDRAWALSTATES.RingNotClosed) {
      // User can close it themselves
      if (forceCloseBlocksLeft === 0) {
        // Use cannot close it if deposited < 2
        if (ringParticipants.deposited < 2) {
          return (
            <div>
            <Box>
              <Heading.h3 my="3" fontSize="4">Can't withdraw funds yet</Heading.h3>
              <Text>Your ETH is the only ETH currently in the pool so your withdrawal won't be private. Please wait until more ETH has been deposited.</Text>
            </Box>
            </div>
          )
        }

        return (
          <div>
          <Box>
          <Heading.h3 my="3" fontSize="4">Close pool and withdraw ETH?</Heading.h3>
          <Text>To get your ETH, you'll need to close the current pool. </Text>
          <Flash my={3}>
              Your ETH is currently mixed in with a pool of {ringParticipants.deposited} ETH deposit(s).
          </Flash>
              {
                ringParticipants.deposited <= 1
                  ? <Text>If you close the pool now your withdrawal will <strong>not</strong> be private.</Text>
                  : ringParticipants.deposited <= 3
                    ? <Text>If you close the pool now your withdrawal will be <strong>somewhat</strong> private. For more privacy, wait for the pool to get bigger.</Text>
                    : <Text>Withdrawing your ETH will be <strong>completely</strong> private.</Text>
              }
            <Text italic my={3}>Closing the pool will cost a small transaction fee</Text>
              <Flex mt={4} justifyContent="space-between">
              <Box mr={2} width={1/2}>
              <Button
                width={1}
                onClick={() => {
                  (async () => {
                    // Reset state
                    setWithdrawalState(WITHDRAWALSTATES.Nothing)

                    // Invalid heiToken
                    const { ethAddress, heiswapInstance, web3 } = dappGateway

                    // eslint-disable-next-line no-unused-vars
                    const [ethAmount, ringIdx, randomSk] = heiToken.split('-').slice(1)

                    // Checks if ring is closed
                    const ringHash = await heiswapInstance
                      .methods
                      .getRingHash(ethAmount, ringIdx)
                      .call()

                    const ringHashBuf = Buffer.from(
                      ringHash.slice(2), // Remove the '0x'
                      'hex'
                    )

                    // Get Public Keys
                    const publicKeys: [[String, String]] = await heiswapInstance
                      .methods
                      .getPublicKeys(ethAmount, ringIdx)
                      .call()

                    // Convert to array of Point
                    const publicKeysBN: [Point] = publicKeys
                      .map(x => {
                        return [
                        // Slice the '0x'
                          new BN(Buffer.from(x[0].slice(2), 'hex')),
                          new BN(Buffer.from(x[1].slice(2), 'hex'))
                        ]
                      })
                      .filter(x => x[0].cmp(bnZero) !== 0 && x[1].cmp(bnZero) !== 0)

                    if (publicKeysBN.length < 2) {
                      setWithdrawalState(WITHDRAWALSTATES.RingNotEnoughParticipantsToClose)
                      return
                    }

                    // Check if user is able to generate any one of these public keys
                    const stealthSk: Scalar = h1(
                      serialize([randomSk, ethAddress])
                    )
                    const stealthPk: Point = bn128.ecMulG(stealthSk)

                    let secretIdx = 0
                    let canSign = false
                    for (let i = 0; i < publicKeysBN.length; i++) {
                      const curPubKey = publicKeysBN[i]

                      if (curPubKey[0].cmp(stealthPk[0]) === 0 && curPubKey[1].cmp(stealthPk[1]) === 0) {
                        secretIdx = i
                        canSign = true
                        break
                      }
                    }

                    if (!canSign) {
                      setWithdrawalState(WITHDRAWALSTATES.InvalidSignature)
                      return
                    }

                    // Create signature
                    const signature = bn128.ringSign(
                      ringHashBuf,
                      publicKeysBN,
                      stealthSk,
                      secretIdx
                    )

                    // Construct bytecode
                    const dataBytecode = heiswapInstance
                      .methods
                      .forceCloseRing(
                        ethAmount,
                        ringIdx,
                        append0x(signature[0].toString('hex')),
                        [
                          append0x(signature[2][0].toString('hex')),
                          append0x(signature[2][1].toString('hex'))
                        ],
                        signature[1].map(x => append0x(x.toString('hex')))
                      ).encodeABI()

                    // Just send the dataBytecode to a relayer
                    // TFW can't signTransaction with web3.eth.signTransaction
                    // web3 is so broken, the versioning is so fucked,
                    // the docs are so outdated. Fucking hell.
                    if (useRelayer) {
                      try {
                        // TODO: Post dataBytecode to relayer
                      } catch (exc) {
                      }
                    } else {
                      // Broadcast the transaction otherwise
                      try {
                        const gas = await web3.eth.estimateGas({
                          to: heiswapInstance._address,
                          data: dataBytecode
                        })

                        const tx = {
                          from: ethAddress,
                          to: heiswapInstance._address,
                          gas,
                          data: dataBytecode,
                          nonce: await web3.eth.getTransactionCount(ethAddress)
                        }

                        const txR = await web3.eth.sendTransaction(tx)

                        setTxReceipt(txR)
                        setWithdrawalState(WITHDRAWALSTATES.SuccessCloseRing)
                      } catch (exc) {
                        setWithdrawalState(WITHDRAWALSTATES.FailedCloseRing)
                      }
                    }
                  })()
                }}
                width={1}>
                Close pool
              </Button>
              </Box>
              <Box ml={2} width={1/2}>
                <Button.Outline
                  width={1}>Wait
                </Button.Outline>
              </Box>
            </Flex>
            </Box>
          </div>

        )
      } else {
        return (
          <div>
            <Text>
              Ring isn't closed yet. <br />
              You can manually close it in {forceCloseBlocksLeft} number of blocks.
            </Text>
          </div>
        )
      }
    } else if (ws === WITHDRAWALSTATES.RingNotEnoughParticipantsToClose) {
      return (
        <div>
          Needs at least one more participant in your Ring before you can close it manually.
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.InvalidRing) {
      return (
        <div>
          Invalid signature.
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.InvalidSignature) {
      return (
        <Box>
        <Heading.h3 my={3} fontSize="4">Wrong account</Heading.h3>
        <Text>There's no ETH in the pool for:</Text>
        <Flex p={3} bg="#DED9FC" alignItems="center" my={3}>
        <Box mr={3}>
          <Blockie opts={{ seed: dappGateway.ethAddress, size: 16 }} />
        </Box>
        <Box>
          <EthAddress ml={3} fontSize="4" address={dappGateway.ethAddress} />
        </Box>
        </Flex>
        <Text>Try changing your Ethereum account.</Text>
        </Box>
      )
    } else if (ws === WITHDRAWALSTATES.SignatureUsed) {
      return (
        <Box>
        <Heading.h3 my={3} fontSize="4">Old token</Heading.h3>
        <Text>This token's already been used to withdraw ETH.</Text>
        </Box>
      )
    } else if (ws === WITHDRAWALSTATES.Withdrawn) {
      return (
        <div>
        <Box justifyContent="center">
          <Icon style={{ margin: 'auto' }} mb={3} color="#29B236" name="CheckCircle" />
          <Heading.h3 mb={3}>The ETH is all yours!</Heading.h3>
          <Button.Text
            as="a"
            href={`https://ropsten.etherscan.io/tx/${txReceipt.transactionHash}`}>
            View on etherscan
          </Button.Text>
        </Box>
        </div>
      )
    }

    return <div>
      <a href='https://github.com/kendricktan/heiswap-dapp/issues'>
        Please open a new issue with the error description below.
      </a>
      <br />
      Unknown error occured: <br />{ unknownErrorStr }
    </div>
  }

  return (
    <div style={{ width: '100%' }}>
      <Form onSubmit={(e) => {
        (async () => {
          e.preventDefault()

          const { ethAddress, heiswapInstance, web3 } = dappGateway

          // Opens modal
          setOpenModal(true)

          // Invalid heiToken
          if (heiToken.split('-').length - 1 !== 3) {
            setWithdrawalState(WITHDRAWALSTATES.CorruptedToken)
            return
          }

          // eslint-disable-next-line no-unused-vars
          const [ethAmount, ringIdx, randomSk] = heiToken.split('-').slice(1)

          // Checks if ring is closed
          const ringHash = await heiswapInstance
            .methods
            .getRingHash(ethAmount, ringIdx)
            .call()
          const ringHashBuf = Buffer.from(
            ringHash.slice(2), // Remove the '0x'
            'hex'
          )
          const ethAddressBuf = Buffer.from(
            ethAddress.slice(2), // Remove the '0x'
            'hex'
          )
          const msgBuf = Buffer.concat([
            ringHashBuf,
            ethAddressBuf
          ])

          // If ring hash isn't closed
          // 32 bytes (64 chars + 2 chars ('0x')))
          if (ringHash.length !== 66) {
            const blocksLeftStr = await heiswapInstance
              .methods
              .getForceCloseBlocksLeft(ethAmount, ringIdx)
              .call()

            const blocksLeft = parseInt(blocksLeftStr)

            // If blocksLeft === 0
            // User can close the ring, display information
            // regarding their privacy before they close it manually
            if (blocksLeft === 0) {
              const curParticipants = await heiswapInstance
                .methods
                .getParticipants(ethAmount, ringIdx)
                .call()

              setRingParticipants({
                deposited: curParticipants[0],
                withdrawn: curParticipants[1]
              })
            }

            setForceCloseBlocksLeft(blocksLeft)
            setWithdrawalState(WITHDRAWALSTATES.RingNotClosed)
            return
          }

          // Get Public Keys
          // Don't want uninitialized keys
          // Since solidity can't return dynamic arrays
          const publicKeys: [[String, String]] = await heiswapInstance
            .methods
            .getPublicKeys(ethAmount, ringIdx)
            .call()

          // Convert to array of Point
          const publicKeysBN: [Point] = publicKeys
            .map(x => {
              return [
                // Slice the '0x'
                new BN(Buffer.from(x[0].slice(2), 'hex')),
                new BN(Buffer.from(x[1].slice(2), 'hex'))
              ]
            })
            .filter(x => x[0].cmp(bnZero) !== 0 && x[1].cmp(bnZero) !== 0)

          // Check if user is able to generate any one of these public keys
          const stealthSk: Scalar = h1(
            serialize([randomSk, ethAddress])
          )
          const stealthPk: Point = bn128.ecMulG(stealthSk)

          let secretIdx = 0
          let canSign = false
          for (let i = 0; i < publicKeysBN.length; i++) {
            const curPubKey = publicKeysBN[i]

            if (curPubKey[0].cmp(stealthPk[0]) === 0 && curPubKey[1].cmp(stealthPk[1]) === 0) {
              secretIdx = i
              canSign = true
              break
            }
          }

          if (!canSign) {
            setWithdrawalState(WITHDRAWALSTATES.InvalidSignature)
            return
          }

          // Create signature
          const signature = bn128.ringSign(
            msgBuf,
            publicKeysBN,
            stealthSk,
            secretIdx
          )

          // Create the transaction
          const dataBytecode = heiswapInstance
            .methods
            .withdraw(
              ethAddress,
              ethAmount,
              ringIdx,
              append0x(signature[0].toString('hex')),
              [
                append0x(signature[2][0].toString('hex')),
                append0x(signature[2][1].toString('hex'))
              ],
              signature[1].map(x => append0x(x.toString('hex')))
            ).encodeABI()

          // Just send the dataBytecode to a relayer
          // TFW can't signTransaction with web3.eth.signTransaction
          // web3 is so broken, the versioning is so fucked,
          // the docs are so outdated. Fucking hell.
          if (useRelayer) {
            try {
              // TODO: Post dataBytecode to relayer
            } catch (exc) {
            }
          } else {
            // Broadcast the transaction otherwise
            try {
              const gas = await web3.eth.estimateGas({
                to: heiswapInstance._address,
                data: dataBytecode
              })

              const tx = {
                from: ethAddress,
                to: heiswapInstance._address,
                gas,
                data: dataBytecode,
                nonce: await web3.eth.getTransactionCount(ethAddress)
              }

              const txR = await web3.eth.sendTransaction(tx)

              setTxReceipt(txR)
              setWithdrawalState(WITHDRAWALSTATES.Withdrawn)
            } catch (exc) {
              const excStr = exc.toString()

              if (excStr.indexOf('Signature has been used!') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.SignatureUsed)
              } else if (excStr.indexOf('Invalid signature') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.InvalidSignature)
              } else if (excStr.indexOf('Ring isn\'t closed') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.RingNotClosed)
              } else if (excStr.indexOf('All funds from current Ring') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.SignatureUsed)
              } else {
                setUnknownErrorStr(excStr)
                setWithdrawalState(WITHDRAWALSTATES.UnknownError)
              }
            }
          }
        })()
      }} width='100%'>
      <Card>
      <Heading.h3 fontSize="3">Withdraw ETH</Heading.h3>
      <Text my="3">Paste your Hei token to see if your ETH is ready to be withdrawn privately. </Text>
        <Tooltip message="If you don't have the token, ask whoever deposited the ETH" placement="right">
        <Form.Field
          label='Hei token' width={1}>
          <Form.Input
            type="text"
            placeholder='e.g. hei-x-xx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
            required={true}
            width={1}
            value={heiToken}
            onChange={(e) => setHeiToken(e.target.value)}
          />
        </Form.Field>
        </Tooltip>
        {/* <Box>
          <Form.Check
            checked={useRelayer}
            label={<span>Retrieve via relayer. <a href='/faq'>More Info</a></span>}
            mb={3}
            onChange={(e) => setUseRelayer(e.target.checked)}
          />
        </Box> */}
        <Text italic my="3">You will need to pay a small transaction fee to withdraw funds.</Text>
        <Button type='submit' width={1} disabled={noWeb3 || noContractInstance}>
            Withdraw funds
        </Button>
      </Card>
      </Form>

      <Modal isOpen={openModal}>
        <Card style={{ maxWidth: '620px' }} p={0}>
          <Button.Text
            icononly
            icon={'Close'}
            color={'moon-gray'}
            position={'absolute'}
            top={0}
            right={0}
            mt={3}
            mr={3}
            onClick={() => {
              setOpenModal(false)
              setWithdrawalState(WITHDRAWALSTATES.Nothing)
            }}
          />

          <Box p={4} mb={3}>
            { getModalDisplay(withdrawalState) }
          </Box>
        </Card>
      </Modal>
    </div>
  )
}

export default WithdrawPage
