// @flow
import BN from 'bn.js'
import React, { useState } from 'react'
import { Form, Flash, Select, Button } from 'rimble-ui'
import { serialize, h1, h2, bn128 } from '../utils/AltBn129'
import { DappGateway } from '../types/DappGateway'

type DepositForumParams = {
  ethAmount: Number,
  ethAddress: String
}

const DepositPage = (props: { dappGateway: DappGateway }) => {
  const { dappGateway } = props

  const [depForumParams: DepositForumParams, setDepForumParams] = useState({
    ethAmount: 2,
    ethAddress: '',
    validEthAddress: false
  })

  const noWeb3: boolean = (
    dappGateway.web3 === null &&
    dappGateway.drizzleUtils === null &&
    dappGateway.attempted
  )

  return (
    <div style={{ width: '100%' }}>
      {
        noWeb3
          ? <Flash my={3} variant='danger'>
            Please connect your Ethereum account to continue
          </Flash>
          : null
      }

      <Form onSubmit={
        (e) => {
          (async () => {
            e.preventDefault()

            // Convert to format to suit solidity
            const sk = bn128.randomScalar()
            const pk = bn128.ecMulG(sk).map(x => '0x' + x.toString(16))

            const { ethAmount } = depForumParams
            const { ethAddress, heiswapEvent$, heiswapInstance, web3 } = dappGateway

            // Watch for events
            console.log(heiswapEvent$)
            heiswapEvent$.subscribe(event => console.log(event))

            // Deposit into Ring
            try {
              const ret = await heiswapInstance
                .methods
                .deposit(pk)
                .send(
                  { from: ethAddress, value: web3.utils.toWei(ethAmount.toString(10), 'ether') }
                )

              console.log(ret)
            } catch (exc) {
              console.log(exc)
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
    </div>
  )
}

export default DepositPage
