// @flow
import React, { useState } from 'react'
import { Form, Button, Modal, Card, Box, Loader, Text, Pill } from 'rimble-ui'
import { DappGateway } from '../types/DappGateway'

type StatusPageModalParams = {
  isOpen: Boolean,
  invalidToken: Boolean,
  ringHash: String,
  maxParticipants: Number,
  depositedParticipants: Number,
  withdrawnParticipants: Number,
  blocksLeftForForceClose: Number
}

const StatusPage = (props: { dappGateway: DappGateway, noWeb3: Boolean, noContractInstance: Boolean }) => {
  const { dappGateway } = props

  const [heiToken, setHeiToken] = useState('')

  const [modalParams: StatusPageModalParams, setModalParams] = useState({
    isOpen: false,
    invalidToken: false,
    ringHash: null,
    maxParticipants: null,
    depositedParticipants: null,
    withdrawnParticipants: null
  })

  // Disable buttons etc if web3 isn't injected
  const { noWeb3, noContractInstance } = props

  return (
    <div style={{ width: '100%' }}>
      <Form onSubmit={(e) => {
        (async () => {
          e.preventDefault()

          // Invalid heiToken
          if (heiToken.split('-').length - 1 !== 3) {
            setModalParams(Object.assign({}, modalParams, { isOpen: true, invalidToken: true }))
            return
          }

          // Opens modal to display spinny progress bar
          setModalParams(Object.assign({}, modalParams, {
            isOpen: true,
            invalidToken: false,
            maxParticipants: null,
            depositedParticipants: null,
            withdrawnParticipants: null,
            blocksLeftForForceClose: null
          }))

          const { heiswapInstance } = dappGateway

          // eslint-disable-next-line no-unused-vars
          const [ethAmount, ringIdx, randomSk] = heiToken.split('-').slice(1)

          // Deposited Participants, Withdrawn Participants
          const participants: [Number, Number] = await heiswapInstance
            .methods
            .getParticipants(ethAmount, ringIdx)
            .call()

          const maxParticipants: Number = await heiswapInstance
            .methods
            .getRingMaxParticipants()
            .call()

          const blocksLeftForForceClose: Number = await heiswapInstance
            .methods
            .getForceCloseBlocksLeft(ethAmount, ringIdx)
            .call()
          
          const ringHash = await heiswapInstance
            .methods
            .getRingHash(ethAmount, ringIdx)
            .call()

          // Yay display modal status
          setModalParams(Object.assign({}, modalParams, {
            isOpen: true,
            invalidToken: false,
            ringHash,
            maxParticipants: parseInt(maxParticipants),
            depositedParticipants: parseInt(participants[0]),
            withdrawnParticipants: parseInt(participants[1]),
            blocksLeftForForceClose: parseInt(blocksLeftForForceClose)
          }))
        })()
      }} width='100%'>
        <Form.Field label='Token' width={1}>
          <Form.Input
            type='text'
            placeholder='hei-x-x-xxxxxx'
            required
            width={1}
            value={heiToken}
            onChange={(e) => setHeiToken(e.target.value)}
          />
        </Form.Field>
        <Button type='submit'width={1} disabled={noWeb3 || noContractInstance}>
        Check Ring Status
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
              setModalParams(Object.assign({}, modalParams, { isOpen: false }))
            }}
          />

          <Box p={4} mb={3}>
            <div>
              {
                modalParams.invalidToken
                  ? <Text>Invalid hei-token</Text>
                  : modalParams.withdrawnParticipants === null
                    ? <Loader style={{ margin: 'auto' }} size='10rem' />
                    : <div>
                      <Text>
                        <strong>Ring status: </strong>{
                          modalParams.depositedParticipants >= modalParams.maxParticipants || modalParams.ringHash.length === 66
                            ? 'Closed'
                            : modalParams.blocksLeftForForceClose > 0
                              ? `On-going (${modalParams.blocksLeftForForceClose} blocks till manual intervention allowed)`
                              : `On-going ${modalParams.depositedParticipants > 1 ? '(Intervention allowed)' : ''}`
                        }
                        <br />
                        <strong>Ring participants: </strong> {`${modalParams.depositedParticipants}/${modalParams.maxParticipants}`}
                        &nbsp;&nbsp;
                        {
                          modalParams.depositedParticipants <= 1
                            ? <Pill color='red'>Privacy not guaranteed</Pill>
                            : modalParams.depositedParticipants <= 3
                              ? <Pill color='primary'>Privacy somewhat guaranteed</Pill>
                              : <Pill color='green'>Privacy strongly guaranteed</Pill>
                        }
                      </Text>
                    </div>
              }
            </div>
          </Box>
        </Card>
      </Modal>
    </div>
  )
}

export default StatusPage
