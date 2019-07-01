// @flow
import BN from 'bn.js'
import { Scalar, Point, serialize, h1, bn128 } from '../utils/AltBn129'
import { append0x } from '../utils/helper'
import React, { useState } from 'react'
import { Form, Modal, Card, Box, Button } from 'rimble-ui'
import { DappGateway } from '../types/DappGateway'

// Possible states
const WITHDRAWALSTATES = {
  Nothing: -1,
  CorruptedToken: 0,
  RingNotClosed: 1,
  ForceClosingRing: 2,
  FailedCloseRing: 3,
  SuccessCloseRing: 4,
  InvalidRing: 5,
  InvalidSignature: 6,
  Withdrawing: 7
}

const WithdrawPage = (props: { dappGateway: DappGateway }) => {
  const { dappGateway } = props

  const [heiToken, setHeiToken] = useState('')
  // const [useRelayer, setUseRelayer] = useState(true)
  const [openModal, setOpenModal] = useState(false)
  const [withdrawalState, setWithdrawalState] = useState(WITHDRAWALSTATES.Nothing)

  const getModalDisplay = () => {
    if (withdrawalState === WITHDRAWALSTATES.CorruptedToken) {
      return <div>Invalid token</div>
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <Form onSubmit={(e) => {
        (async () => {
          e.preventDefault()

          const { ethAddress, heiswapInstance, web3 } = dappGateway

          // Invalid heiToken
          if (heiToken.split('-').length - 1 !== 3) {
            setWithdrawalState(WITHDRAWALSTATES.CorruptedToken)
            console.log('corrupted')
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

          // If ring hash isn't closed
          // 32 bytes (64 chars + 2 chars ('0x')))
          if (ringHash.length !== 66) {
            setWithdrawalState(WITHDRAWALSTATES.RingNotClosed)
            return
          }

          // Get Public Keys
          const publicKeys: [[String, String]] = await heiswapInstance
            .methods
            .getPublicKeys(ethAmount, ringIdx)
            .call()

          // Convert to array of Point
          const publicKeysBN: [Point] = publicKeys.map(x => {
            return [
              // Slice the '0x'
              new BN(Buffer.from(x[0].slice(2), 'hex')),
              new BN(Buffer.from(x[1].slice(2), 'hex'))
            ]
          })

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
            setWithdrawalState(WITHDRAWALSTATES.InvalidRing)
            return
          }

          // If user can sign it, then sign the transaction
          const signature = bn128.ringSign(
            ringHashBuf, // Remove '0x'
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
          const gas = await web3.eth.estimateGas({
            to: heiswapInstance._address,
            data: dataBytecode
          })
          const tx = {
            from: ethAddress,
            to: heiswapInstance._address,
            gas,
            data: dataBytecode
          }

          // Sign the transaction
          try {
            const txReceipt = await web3.eth.sendTransaction(tx)
            console.log(txReceipt)
          } catch (exc) {
            const excStr = exc.toString()

            if (excStr.indexOf('Signature has been used!') !== 0) {
              console.log('Signature has been used')
            } else if (excStr.indexOf('Invalid signature') !== 0) {
              console.log('Invalid Signature')
            } else if (excStr.indexOf('Ring isn\'t closed') !== 0) {
              console.log('Ring has not closed')
            } else if (excStr.indexOf('All funds from current Ring') !== 0) {
              console.log('All funds have been withdrawn')
            } else {
              console.log('Unknown error occured')
            }
          }
        })()
      }} width='100%'>
        <Form.Field label='Token' width={1}>
          <Form.Input
            type='text'
            placeholder='hei-xxxxxxxx'
            required
            width={1}
            value={heiToken}
            onChange={(e) => setHeiToken(e.target.value)}
          />
        </Form.Field>
        {/* <Box>
          <Form.Check
            checked={useRelayer}
            label={<span>Retrieve via relayer. <a href='/faq'>More Info</a></span>}
            mb={3}
            onChange={(e) => setUseRelayer(e.target.checked)}
          />
        </Box> */}
        <Button type='submit' width={1}>
            Withdraw
        </Button>
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
            }}
          />

          <Box p={4} mb={3}>
            { getModalDisplay() }
          </Box>
        </Card>
      </Modal>
    </div>
  )
}

export default WithdrawPage
