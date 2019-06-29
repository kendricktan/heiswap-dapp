import React from 'react'
import { Form, Select, Button } from 'rimble-ui'

const DepositPage = () => {
  return (
    <Form onSubmit={() => {}} width='100%'>
      <Form.Field label='Approved Withdrawal Address' width={1}>
        <Form.Input
          type='text'
          placeholder='ETH / ENS Address'
          required
          width={1}
          onChange={() => {}}
        />
      </Form.Field>
      <Form.Field validated={() => {}} label='ETH Amount' width={1}>
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
          onChange={() => {}}
        />
      </Form.Field>
      <Button type='submit' width={1}>
          Deposit
      </Button>
    </Form>
  )
}

export default DepositPage
