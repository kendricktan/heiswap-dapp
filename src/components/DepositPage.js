// @flow
import crypto from 'crypto'
import React, { useState } from 'react'
import { Loader, Card, Form, Box, Input, Modal, Select, Text, Button, Checkbox } from 'rimble-ui'
import { serialize, h1, bn128 } from '../utils/AltBn129'
import { DappGateway } from '../types/DappGateway'

type DepositForumParams = {
  ethAmount: Number,
  ethAddress: String
}

type ModalParams = {
  isOpen: Boolean,
  heiToken: String,
  acknowledgeClose: Boolean
}

const DepositPage = (props: { dappGateway: DappGateway }) => {
  const { dappGateway } = props

  // Form validation
  const [depForumParams: DepositForumParams, setDepForumParams] = useState({
    ethAmount: 2,
    ethAddress: '',
    validEthAddress: false
  })

  // Modal to preview progress
  const [modalParams: ModalParams, setModalParams] = useState({
    isOpen: false,
    acknowledgeClose: false,
    txHash: null, // transaction hash
    heiTokenEst: null, // Estimate what the hei-token will be
    heiTokenFinal: null // The real hei-token generated from the contract's ret value firing
  })

  // Disable buttons etc if web3 isn't injected
  const noWeb3: boolean = (
    dappGateway.web3 === null &&
    dappGateway.drizzleUtils === null &&
    dappGateway.attempted
  )

  return (
    <div style={{ width: '100%' }}>
      <Form onSubmit={
        (e) => {
          (async () => {
            // No refresh
            e.preventDefault()

            const { ethAmount } = depForumParams
            const { ethAddress, heiswapInstance, web3 } = dappGateway

            // Generaete a burner secret key
            // and create a pseudo stealth address
            const randomSk = crypto.randomBytes(32).toString('hex')
            const stealthSk = h1(
              serialize([randomSk, ethAddress])
            )

            // Opens modal
            const estRingIdx = await heiswapInstance
              .methods
              .getCurrentRingIdx(ethAmount)
              .call()

            const heiTokenEst = `hei-${ethAmount}-${estRingIdx}-${randomSk}`
            // Make sure to set heiTokenFinal to null
            setModalParams(Object.assign({}, modalParams, {
              isOpen: true,
              heiTokenEst,
              heiTokenFinal: null
            }))

            // Append "0x" in front of it, web3 requires it
            const stealthPk = bn128.ecMulG(stealthSk).map(x => '0x' + x.toString(16))

            // Deposit into Ring
            try {
              const depositResult = await heiswapInstance
                .methods
                .deposit(stealthPk)
                .send(
                  { from: ethAddress, value: web3.utils.toWei(ethAmount.toString(10), 'ether') }
                )

              // Get event return value
              const depositEventRetVal = depositResult.events.Deposited.returnValues

              // Used to get the index of the ring
              const realRingIdx = depositEventRetVal.idx

              // Generate token
              // Format is "hei-<ether-amount>-<idx>-<randomSk>"
              const heiTokenFinal = `hei-${ethAmount}-${realRingIdx}-${randomSk}`

              setModalParams(Object.assign(modalParams, {
                isOpen: true,
                heiTokenFinal,
                txHash: depositResult.transactionHash
              }))
            } catch (exc) {
              // TODO: Handle Exception
            }
          })()
        }
      } width='100%'>
        <Form.Field
          validated={depForumParams.validEthAddress}
          label='Approved Withdrawal Address' width={1}
        >
          <Form.Input
            type='text'
            placeholder='ETH Address: 0x.....'
            required
            width={1}
            value={depForumParams.ethAddress}
            onChange={(e) => {
              // For the little checkmark
              if (e.target.value.indexOf('0x') === 0 && e.target.value.length === 42) {
                e.target.parentNode.classList.add('was-validated')
              } else {
                e.target.parentNode.classList.remove('was-validated')
              }

              setDepForumParams(
                Object.assign(
                  {},
                  depForumParams,
                  {
                    ethAddress: e.target.value,
                    validEthAddress: e.target.value.indexOf('0x') === 0 && e.target.value.length === 42
                  })
              )
            }}
          />
        </Form.Field>
        <Form.Field label='ETH Amount' width={1}>
          <Select
            items={[
              '2',
              '4',
              '8',
              '16',
              '32',
              '64',
              '128',
              '256',
              '512'
            ]}
            required
            width={1}
            onChange={(e) => {
              setDepForumParams(
                Object.assign(
                  {},
                  depForumParams,
                  { ethAmount: e.target.value })
              )
            }}
          />
        </Form.Field>
        <Button type='submit' width={1} disabled={noWeb3 || !depForumParams.validEthAddress}>
          Deposit
        </Button>
      </Form>

      <Modal isOpen={modalParams.isOpen}>
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
              // Only allow close if tx is complete
              // and user acknowledged close
              if (modalParams.heiToken !== null && modalParams.acknowledgeClose) {
                setModalParams(Object.assign({}, modalParams, { isOpen: false }))
              }
            }}
          />

          <Box p={4} mb={3}>
            <div>
              {
                modalParams.heiTokenFinal === null
                  ? <Loader style={{ margin: 'auto' }} size='10rem' />
                  : null
              }

              <br />
              <Text style={{ textAlign: 'center' }}>
                {
                  modalParams.heiTokenFinal === null
                    ? 'Processing transaction...'
                    : <a href={`https://etherscan.io/tx/${modalParams.txHash}`}>Transaction completed</a>
                }<br /><br />
                Ensure the withdrawing party has the following hei-token. <br />
                <strong>Losing it will make you lose access to the deposited funds.</strong>
              </Text>
              <br />
              <Box>
                <Checkbox
                  label='I have saved the hei-token somewhere safe'
                  mb={3}
                  onChange={(e) => { setModalParams(Object.assign({}, modalParams, { acknowledgeClose: e.target.checked })) }}
                />
              </Box>
              <Input style={{ textAlign: 'center' }} width='100%' value={
                modalParams.heiTokenFinal === null ? modalParams.heiTokenEst : modalParams.heiTokenFinal
              } onChange={() => {}}
              />
            </div>
          </Box>

        </Card>
      </Modal>
    </div>
  )
}

export default DepositPage
