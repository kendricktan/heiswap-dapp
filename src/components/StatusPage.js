import React from 'react'
import { Form, Button } from 'rimble-ui'

const StatusPage = () => {
  return (
    <Form onSubmit={() => {}} width='100%'>
      <Form.Field label='Token' width={1}>
        <Form.Input
          type='text'
          placeholder='hei-xxxxxxxx'
          required
          width={1}
          onChange={() => {}}
        />
      </Form.Field>
      <Button type='submit' width={1}>
        Check Ring Status
      </Button>
    </Form>
  )
}

export default StatusPage
