import React from 'react'
import { Flex, Box, Text } from 'rimble-ui'

const FAQPage = () => {
  return (
    <Flex px={4} py={4}>
      <Box m={'auto'} width={[1, 1 / 2]}>
        <h1>Heiswap FAQ</h1>

        <h3>What is Heiswap?</h3>
        <Text>
          Heiswap (黑 swap) is an Ethereum mixer / tumbler designed to "mix" up Ethereum
          transactions to make them harder to trace back to the original source. Heiswap is built on top of
          proven technologies like <a href='https://cryptonote.org'>cryptonote</a> used
          in monero. However, the <a href='https://github.com/kendricktan/heiswap-dapp/tree/master/contracts'>smart contracts</a> used
          in Heiswap is not yet audited, so use it at your own risk!
          <br /><br />
          You may find the source code for the project <a href='https://github.com/kendricktan/heiswap-dapp'>here</a>.
        </Text>

        <h3>How does it work?</h3>
        <Text>
          Imagine you have 5 people from group A, who all want to send $2 to 5 people in group B.
          To avoid knowing who in particular from group A is sending money to that particular person in group B,
          we can ask the 5 people from group A to all put their money into a pot, and ask the 5 people from
          group B to each come and get $2 from the pot.
          <br /><br />
          We only learn that group A is sending money to group B,
          not who is sending money to who, which gives a 1/5 chance (in this scenario) of guessing who the right sender it.
          Do it one more time and you have a 1/25 of guessing who the sender was. With each "mix", the probability of
          guessing who the sender and receiver are decreases dramatically. That is how Heiswap is able to keep the senders and
          receivers anonymous, but instead of a pot it uses a smart contract.
        </Text>

        <br />
        <hr />

        <h1>Heiswap Guide</h1>

        <h2>Depositing</h2>
        <Text>
          Unfortunately due to the nature of <a href='https://cryptonote.org'>cryptonote</a>, participants
          can only deposit Ethereum in fixed quantities of 2, 4, 8, 16, 32, 64, 128, 256, or 512. To send a "mixed"
          Ethereum transaction, simply click on the "Deposit" tab and insert the address that is going to
          withdraw the deposited Ethereum, select the amount of Ethereum to deposit, and hit deposit.

          <br /><br />
          <strong>Once the transaction is complete, you'll receive a secret token, and should be sent to / held by the person
          who is going to withdraw the deposit.</strong>

          <br /><br />
          <strong>Note</strong>: The destination address is never committed on-chain, and is instead used to calculated a pseudo-stealth address.
          So even if the token is known to the public, they cannot withdraw the funds unless they know the destination address.
        </Text>

        <br />

        <h2>Withdrawing</h2>
        <Text>
          Before withdrawing, check the status of the deposited Ethereum on the "Status" tab with the supplied token
          to see if the transaction has been sufficiently "mixed" before withdrawing.

          <br /><br />

          To withdraw the deposited funds, simply insert the received token into the textbox and click "withdraw".

          <br /><br />

          <strong>Relayer:</strong> By default, the transaction is sent to a relayer that will pay the gas needed to execute the transaction.
          A small fee will be charged for this service (mainly to recover gas costs). If you choose to deselect this option, make sure you have enough gas to cover the transaction.
        </Text>

        <br />

        <h2>Status</h2>
        <Text>
          The status tab tells you if your deposited funds have been sufficiently "mixed" to withdraw. Note that if you withdraw
          your funds before they are sufficiently "mixed", then there is a greater chance of tracing the transaction back to the original
          sender.

          <br /><br />

          To use it, insert the supplied token into the textbox, and make sure you are logged in the approved withdrawal address in MetaMask, and click "Check Status".
        </Text>
      </Box>
    </Flex>
  )
}

export default FAQPage
