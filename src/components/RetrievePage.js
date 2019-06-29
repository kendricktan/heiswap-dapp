import React from 'react'
import { Form, Box, Button } from 'rimble-ui'

const RetrievePage = () => {
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
      <Box>
        <Form.Check
          checked
          label={<span>Retrieve via relayer. <a href='#'>What does that mean?</a></span>}
          mb={3}
          onChange={() => {}}
        />
      </Box>
      <Button type='submit' width={1}>
          Retrieve
      </Button>
    </Form>
  )
}

export default RetrievePage
