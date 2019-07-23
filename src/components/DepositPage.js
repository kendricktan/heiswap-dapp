// @flow
import crypto from 'crypto'
import React, { useState } from 'react'
import { Loader, Card, Form, Icon, Box, Flash, Modal, Select, Text, Button, Checkbox, PublicAddress, Heading, Flex } from 'rimble-ui'
import { serialize, h1, bn128 } from '../utils/AltBn128'
import { DappGateway } from '../types/DappGateway'

type DepositForumParams = {
  targetEthAmount: Number,
  targetEthAddress: String,
  validEthAddress: Boolean
}

type ModalParams = {
  isOpen: Boolean,
  heiToken: String,
  acknowledgeClose: Boolean
}

const DepositPage = (props: { dappGateway: DappGateway, noWeb3: Boolean, noContractInstance: Boolean }) => {
  const { dappGateway } = props

  // Form validation
  const [depForumParams: DepositForumParams, setDepForumParams] = useState({
    targetEthAmount: 2,
    targetEthAddress: '',
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
  const { noWeb3, noContractInstance } = props

  return (
    <Box style={{ width: '100%' }} mb={6}>
      <Form onSubmit={
        (e) => {
          (async () => {
            // No refresh
            e.preventDefault()

            const { targetEthAmount, targetEthAddress } = depForumParams
            const { ethAddress, heiswapInstance, web3 } = dappGateway

            // Generaete a burner secret key
            // and create a pseudo stealth address
            const randomSk = crypto.randomBytes(32).toString('hex')
            const stealthSk = h1(
              serialize([randomSk, targetEthAddress])
            )

            // Opens modal
            const estRingIdx = await heiswapInstance
              .methods
              .getCurrentRingIdx(targetEthAmount)
              .call()

            const heiTokenEst = `hei-${targetEthAmount}-${estRingIdx}-${randomSk}`
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
              const gasPrice = await web3.eth.getGasPrice()

              const depositResult = await heiswapInstance
                .methods
                .deposit(stealthPk)
                .send(
                  {
                    from: ethAddress,
                    value: web3.utils.toWei(targetEthAmount.toString(10), 'ether'),
                    gasLimit: '800000',
                    gasPrice
                  }
                )

              // Get event return value
              const depositEventRetVal = depositResult.events.Deposited.returnValues

              // Used to get the index of the ring
              const realRingIdx = depositEventRetVal.idx

              // Generate token
              // Format is "hei-<ether-amount>-<idx>-<randomSk>"
              const heiTokenFinal = `hei-${targetEthAmount}-${realRingIdx}-${randomSk}`

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
        <Card>
          <Heading.h3 mb={3} fontSize='3'>Send ETH</Heading.h3>
          {/* }<Flex>
              <Box width={1/2} mx={2}>
              <Flex>
              <Box mr={1}>
              <Icon name="CheckCircle" />
              </Box>
              <Box>
              <Text fontSize="1">Deposit ETH and get a token</Text>
              </Box>
              </Flex>
              </Box>
              <Box width={1/2} mx={2}>
              <Flex>
              <Box mr={1}>
              <Icon name="CheckCircle" />
              </Box>
              <Box>
              <Text fontSize="1">Share the token with your recipient</Text>
              </Box>
              </Flex>
              </Box>
        </Flex> */}
          <Text my='3'>Deposit your ETH into the pool and get a token that represents the same value. That token can be used by the recipient address to withdraw your deposit.</Text>
          <Form.Field
            validated={depForumParams.validEthAddress}
            label='Recipient Ethereum address' width={1}
          >
            <Form.Input
              type='text'
              placeholder='e.g. 0x53Nd...2Eth'
              required
              width={1}
              value={depForumParams.targetEthAddress}
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
                      targetEthAddress: e.target.value,
                      validEthAddress: e.target.value.indexOf('0x') === 0 && e.target.value.length === 42
                    })
                )
              }}
            />
          </Form.Field>
          <Form.Field label='ETH amount' width={1}>
            <Select
              items={[
                '1',
                '2',
                '4',
                '8',
                '16',
                '32'
              ]}
              required
              width={1}
              onChange={(e) => {
                setDepForumParams(
                  Object.assign(
                    {},
                    depForumParams,
                    { targetEthAmount: e.target.value })
                )
              }}
            />
          </Form.Field>
          <Flex alignItems='center' my='3'>
            <Box>
              <Icon size='20' mr={1} name='Info' />
            </Box>
            <Box>
              <Text italic>You will need to pay a small transaction fee to deposit ETH.</Text>
            </Box>
          </Flex>

          <Button type='submit' width={1} disabled={noWeb3 || noContractInstance || !depForumParams.validEthAddress}>
          Deposit ETH
          </Button>
        </Card>
      </Form>

      <Modal isOpen={modalParams.isOpen}>
        <Card style={{ maxWidth: '620px' }} p={0}>
          <Box p={4} mb={3}>
            <div>
              {
                modalParams.heiTokenFinal === null
                  ? <Loader style={{ margin: 'auto' }} size='10rem' />
                  : <Icon style={{ margin: 'auto' }} color='#29B236' size='80' name='CheckCircle' />
              }

              <br />
              <Text py={3} borderBottom={1} borderColor={'#E8E8E8'} mb='3' style={{ textAlign: 'center' }}>
                {
                  modalParams.heiTokenFinal === null
                    ? 'Depositing ETH... make sure you have confirmed the deposit in your wallet'
                    : <a href={`https://ropsten.etherscan.io/tx/${modalParams.txHash}`}>ETH deposited!</a>
                }
              </Text>

              <Heading.h3 my='3' fontSize='3'>Next up</Heading.h3>
              <Text>
                Send this token to your recipient. They'll need it to withdraw their funds. </Text>
              <br />

              <PublicAddress width={1} label='Hei token' address={
                modalParams.heiTokenFinal === null ? modalParams.heiTokenEst : modalParams.heiTokenFinal
              } onChange={() => {}} />
            </div>
            <Box>
              <Flash mb={3} variant='warning'>
                <Flex alignItems='center'>
                  <Box mr={1}>
                    <Icon name='Warning' />
                  </Box>
                  <Box mx={3}>There is no way to recover a lost token. If you lose this token, you'll lose your ETH.</Box>
                </Flex>
              </Flash>
              <Checkbox
                label='I have saved/sent the Hei token'
                mb={3}
                onChange={(e) => { setModalParams(Object.assign({}, modalParams, { acknowledgeClose: e.target.checked })) }}
              />
              {
                modalParams.acknowledgeClose
                  ? <Button
                    position={'absolute'}
                    top={0}
                    width={1}
                    onClick={() => {
                    // Only allow close if tx is complete
                    // and user acknowledged close
                      if (modalParams.heiToken !== null && modalParams.acknowledgeClose) {
                        setModalParams(Object.assign({}, modalParams, { isOpen: false }))
                      }
                    }}
                  >Close</Button>
                  : <Button.Outline
                    position={'absolute'}
                    top={0}
                    width={1}
                    disabled
                  >Confirm you've copied the token</Button.Outline>
              }
            </Box>
          </Box>

        </Card>
      </Modal>
    </Box>
  )
}

export default DepositPage
