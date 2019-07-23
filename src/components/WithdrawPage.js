// @flow
import BN from 'bn.js'
import { Scalar, Point, serialize, h1, bn128 } from '../utils/AltBn128'
import { append0x } from '../utils/helper'
import React, { useState } from 'react'
import { Form, Radio, Field, Flex, Input, Blockie, EthAddress, Link, Icon, Modal, Flash, Card, Box, Button, Loader, Text, Heading, Tooltip } from 'rimble-ui'
import { DappGateway } from '../types/DappGateway'
import axios from 'axios'

// BigNumber 0
const bnZero = new BN('0', 10)

// Possible states
const WITHDRAWALSTATES = {
  RelayerUnreachable: -3,
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

const WithdrawPage = (props: { dappGateway: DappGateway, noWeb3: Boolean, noContractInstance: Boolean }) => {
  const { dappGateway } = props

  const [ringParticipants, setRingParticipants] = useState({
    deposited: 0,
    withdrawn: 0,
    participantsRequired: 0
  })
  const [unknownErrorStr, setUnknownErrorStr] = useState('')
  const [txReceipt, setTxReceipt] = useState(null)
  const [heiToken, setHeiToken] = useState('')
  const [useRelayer, setUseRelayer] = useState(true)
  const [useDefaultRelayer, setUseDefaultRelayer] = useState(true)
  const [customerRelayerURL, setCustomRelayerURL] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [withdrawalState, setWithdrawalState] = useState(WITHDRAWALSTATES.Nothing)

  const { noWeb3, noContractInstance } = props

  const getModalDisplay = (ws) => {
    if (ws === WITHDRAWALSTATES.Nothing) {
      return <div>
        <Loader style={{ margin: 'auto' }} size='10rem' />
        <br />
        <Text bold style={{ textAlign: 'center' }}>Withdrawing ETH... </Text>
        <Text style={{ textAlign: 'center' }}>Remember to confirm this withdrawal in your wallet.</Text>
      </div>
    } else if (ws === WITHDRAWALSTATES.ForceClosingRing) {
      return <div>
        <Box>
          <Loader style={{ margin: 'auto' }} size='10rem' />
          <br />
          <Text bold style={{ textAlign: 'center' }}>Closing pool...</Text>
          <Text style={{ textAlign: 'center' }}>Remember to confirm this in your wallet.</Text>
        </Box>
      </div>
    } else if (ws === WITHDRAWALSTATES.CorruptedToken) {
      return <div>This token doesn't look right. Check you've pasted it correctly and try again.</div>
    } else if (ws === WITHDRAWALSTATES.SuccessCloseRing) {
      return (
        <div>
          <Box>
            <Heading.h3 my='3' fontSize='4'>Pool closed</Heading.h3>
            <Text>Your ETH is now ready to withdraw.</Text>
          </Box>
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.FailedCloseRing) {
      return (
        <div>
          <Box>
            <Heading.h3 my='3' fontSize='4'>Couldn't close pool</Heading.h3>
            <Text>If you recently tried closing the pool, it may still be closing in the background. Please wait a few minutes and try your withdrawal again.</Text>
          </Box>
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.RingNotClosed) {
      return (
        <div>
          <Box>
            <Heading.h3 my='3' fontSize='4'>Not Enough Participants</Heading.h3>
            <Text>To get your ETH, you'll need to wait for more participants to join. </Text>
            <Flash my={3}>
              The pool currently has {ringParticipants.deposited}/{ringParticipants.participantsRequired} ETH participants(s).
            </Flash>
            <Flex mt={4} justifyContent='space-between'>
              <Box ml={2} width={1 / 2}>
                <Button.Outline
                  onClick={() => setOpenModal(false)}
                  width={1}>Wait
                </Button.Outline>
              </Box>
            </Flex>
          </Box>
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.RingNotEnoughParticipantsToClose) {
      return (
        <div>
          <Box>
            <Heading.h3 my='3' fontSize='4'>Couldn't close pool</Heading.h3>
            <Text>There's not enough ETH in this pool right now to make your withdrawal private. Please try again later.</Text>
          </Box>
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
          <Heading.h3 my={3} fontSize='4'>Wrong account</Heading.h3>
          <Text>There's no ETH in the pool for:</Text>
          <Flex p={3} bg='#DED9FC' alignItems='center' my={3}>
            <Box mr={3}>
              <Blockie opts={{ seed: dappGateway.ethAddress, size: 16 }} />
            </Box>
            <Box>
              <EthAddress ml={3} fontSize='4' address={dappGateway.ethAddress} />
            </Box>
          </Flex>
          <Text>Try changing your Ethereum account.</Text>
        </Box>
      )
    } else if (ws === WITHDRAWALSTATES.SignatureUsed) {
      return (
        <Box>
          <Heading.h3 my={3} fontSize='4'>Old token</Heading.h3>
          <Text>This token's already been used to withdraw ETH.</Text>
        </Box>
      )
    } else if (ws === WITHDRAWALSTATES.Withdrawn) {
      return (
        <div>
          <Box justifyContent='center'>
            <Icon style={{ margin: 'auto' }} size='80' mb={3} color='#29B236' name='CheckCircle' />
            <Heading.h3 textAlign='center' mb={3}>ETH withdrawn</Heading.h3>
            <Button.Text
              textAlign='center'
              as='a'
              href={`https://ropsten.etherscan.io/tx/${txReceipt.transactionHash}`}>
            View on etherscan
            </Button.Text>
          </Box>
        </div>
      )
    } else if (ws === WITHDRAWALSTATES.RelayerUnreachable) {
      return (
        <Box>
          <Heading.h3 my={3} fontSize='4'>Unable to reach relayer</Heading.h3>
          <Text>Try using a different relayer, you can also <a href='https://github.com/kendricktan/heiswap-relayer'>setup your own relayer</a></Text>
        </Box>
      )
    }

    return (
      <Box>
        <Heading.h3 my={3} fontSize='4'>Unknown Error Occured</Heading.h3>
        <Text>
          <a href='https://github.com/kendricktan/heiswap-dapp/issues'>Please open a new issue with the error description below.</a>
          Description: { unknownErrorStr }
        </Text>
      </Box>
    )
  }

  return (
    <Box style={{ width: '100%' }} mb={6}>
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
            const participantsRequired = await heiswapInstance
              .methods
              .getRingMaxParticipants()
              .call()

            const curParticipants = await heiswapInstance
              .methods
              .getParticipants(ethAmount, ringIdx)
              .call()

            setRingParticipants({
              deposited: curParticipants[0],
              withdrawn: curParticipants[1],
              participantsRequired
            })

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

          console.log(publicKeys)

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
          const c0 = append0x(signature[0].toString('hex'))
          const s = signature[1].map(x => append0x(x.toString('hex')))
          const keyImage = [
            append0x(signature[2][0].toString('hex')),
            append0x(signature[2][1].toString('hex'))
          ]

          const dataBytecode = heiswapInstance
            .methods
            .withdraw(
              ethAddress,
              ethAmount,
              ringIdx,
              c0,
              keyImage,
              s
            ).encodeABI()

          // Just send the dataBytecode to a relayer
          // TFW can't signTransaction with web3.eth.signTransaction
          // web3 is so broken, the versioning is so fucked,
          // the docs are so outdated. Fucking hell.
          if (useRelayer) {
            const relayerURL = useDefaultRelayer ? 'https://relayer.heiswap.exchange' : customerRelayerURL
            try {
              // Nicer user flow for withdrawal (has prompts to sign message even through relayer)
              // Also safer since relayer knows address authorized it
              const message = `Get ETH from Heiswap via Relayer (Destination: ${dappGateway.ethAddress})`

              const signedMessage = await web3.eth.personal.sign(
                message,
                dappGateway.ethAddress
              )

              const resp = await axios.post(relayerURL, {
                message,
                signedMessage,
                receiver: ethAddress,
                ethAmount,
                ringIdx,
                c0,
                keyImage,
                s
              })

              const respJson: { errorMessage: String, txHash: String } = resp.data

              setTxReceipt({ transactionHash: respJson.txHash })
              setWithdrawalState(WITHDRAWALSTATES.Withdrawn)
            } catch (exc) {
              // Relayer unavailable
              if (exc.response === undefined) {
                setWithdrawalState(WITHDRAWALSTATES.RelayerUnreachable)
                return
              }

              const errorMessage = exc.response.data.errorMessage
              if (errorMessage.indexOf('invalid format') !== -1) {
                setWithdrawalState(WITHDRAWALSTATES.CorruptedToken)
              } else if (errorMessage.indexOf('EVM revert') !== -1) {
                // EVM Revert is likely that the key image was used
                setWithdrawalState(WITHDRAWALSTATES.SignatureUsed)
              } else if (
                errorMessage.indexOf('Invalid Message Signature') !== -1 ||
                errorMessage.indexOf('Invalid Ring Signature') !== -1
              ) {
                setWithdrawalState(WITHDRAWALSTATES.InvalidSignature)
              } else {
                setUnknownErrorStr(errorMessage)
                setWithdrawalState(WITHDRAWALSTATES.UnknownError)
              }
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
              } else if (excStr.indexOf('Pool isn\'t closed') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.RingNotClosed)
              } else if (excStr.indexOf('All ETH from current pool') !== 0) {
                setWithdrawalState(WITHDRAWALSTATES.SignatureUsed)
              } else {
                setUnknownErrorStr(excStr)
                setWithdrawalState(WITHDRAWALSTATES.UnknownError)
              }
            }
          }
        }
        )()
      }} width='100%'>
        <Card>
          <Heading.h3 fontSize='3'>Get ETH</Heading.h3>
          <Text my='3'>Paste your Hei token to see if your ETH is ready to withdraw privately.</Text>

          <Form.Field
            label='Hei token' width={1}>
            <Form.Input
              type='text'
              placeholder='e.g. hei-x-xx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
              required
              width={1}
              value={heiToken}
              onChange={(e) => setHeiToken(e.target.value)}
            />
          </Form.Field>
          <Box textAlign='right'>
            <Tooltip message='Whoever deposited your ETH should have your Hei token' placement='bottom'>
              <Link>I don't have a token</Link>
            </Tooltip>
          </Box>
          <Box my='3'>
            <Form.Check
              checked={useRelayer}
              label={`Use relayer to withdraw`}
              mb={3}
              onChange={(e) => setUseRelayer(e.target.checked)}
            />
          </Box>
          <Box my='3'>
            {
              useRelayer
                ? <div>
                  <Field label='Select your relayer'>
                    <div>
                      <Radio label='Default - relayer.heiswap.exchange'
                        my='1'
                        checked={useDefaultRelayer}
                        onChange={(e) => setUseDefaultRelayer(e.target.checked)}
                      />
                      <Radio label='Custom'
                        my='1'
                        checked={!useDefaultRelayer}
                        onChange={(e) => setUseDefaultRelayer(!e.target.checked)}
                      />
                      <Input
                        placeholder='http://myrelayer.com:3000'
                        height='2rem'
                        disabled={useDefaultRelayer}
                        width={1}
                        value={customerRelayerURL}
                        onChange={(e) => setCustomRelayerURL(e.target.value)}
                      />
                    </div>
                  </Field>
                  <Flex alignItems='center' my='3'>
                    <Box>
                      <Icon size='20' mr={1} name='Info' />
                    </Box>
                    <Box>
                      <Text italic>You will pay a small amount of fees to the relayer for GAS purposes.</Text>
                    </Box>
                  </Flex>
                </div>
                : <Flex alignItems='center' my='3'>
                  <Box>
                    <Icon size='20' mr={1} name='Info' />
                  </Box>
                  <Box>
                    <Text italic>You will need some ETH in your withdrawal address to pay for GAS.</Text>
                  </Box>
                </Flex>
            }
          </Box>
          <Button type='submit' width={1} disabled={noWeb3 || noContractInstance}>
            Withdraw ETH
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
    </Box>
  )
}

export default WithdrawPage
