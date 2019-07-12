import React from 'react'
import { Flex, Box, Heading, Text } from 'rimble-ui'

const NotFoundPage = () => {
  return (
    <Flex px={4} py={4}>
      <Box m={'auto'} width={[1, 1 / 2]}>
        <h1>Heiswap</h1>
        <Heading>404 Not Found</Heading>
        <Text><a href='/'>Go home</a></Text>
      </Box>
    </Flex>
  )
}

export default NotFoundPage
