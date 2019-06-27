// @flow

import React, { useState, useEffect } from "react";
import getWeb3 from "./utils/getWeb3";
import createDrizzleUtils from "@drizzle-utils/core";
import {
  Heading,
  Text,
  Flex,
  Box,
  Button,
  Modal,
  Card,
  Blockie
} from "rimble-ui";
import ConnectButton from "./components/ConnectButton";
import { ThemeProvider } from "rimble-ui";
import { Exception } from "handlebars";
import { reject } from "any-promise";

type DappGateway = {
  web3: Object,
  drizzleUtils: Object,
  ethAddress: String, // Current ETH Address
  attempted: Boolean // Have we attempted to connect to web3 and drizzleUtils?
};

const App = () => {
  // Dapp gateway state
  const [dappGateway, setDappGateway] = useState({
    web3: null,
    drizzleUtils: null,
    ethAddress: null,
    attempted: false
  });

  // Modal to tell user if web3 is enabled on
  // their browser or not
  const [modalOpen, setModalOpen] = useState(false);

  // Helper function to initialize web3, drizzleUtils, and the ETH accounts
  const initDappGateway = async (): Boolean => {
    try {
      const web3 = await getWeb3();
      const drizzleUtils = await createDrizzleUtils({ web3 });
      const accounts = await drizzleUtils.getAccounts();

      setDappGateway({
        web3,
        drizzleUtils,
        ethAddress: accounts[0],
        attempted: true
      });

      return true;
    } catch (err) {
      return false;
    }
  };

  // On page load, grab web3 and drizzle utils and contract
  // definitions, as props, and inject them into the browser
  useEffect(() => {
    if (
      (dappGateway.web3 === null || dappGateway.drizzleUtils === null) &&
      !dappGateway.attempted
    ) {
      initDappGateway();
    }
  });

  return (
    <ThemeProvider>
      <Flex>
        <Box p={3} width={1 / 2}>
          Heiswap
        </Box>
        <Box p={3} width={1 / 2} style={{ textAlign: "right" }}>
          {dappGateway.ethAddress === null ? (
            <Button
              onClick={() => {
                if (dappGateway.ethAddress === null) {
                  (async () => {
                    // If can't initialize dapp gateway
                    // show the error modal
                    if (!await initDappGateway()) {
                      setModalOpen(true);
                    }
                  })();
                }
              }}
            >
              Connect
            </Button>
          ) : (
            <Button.Outline>
              <Blockie opts={{ seed: dappGateway.ethAddress, size: 6 }} />
              &nbsp;&nbsp;
              {dappGateway.ethAddress.slice(0, 5) +
                "..." +
                dappGateway.ethAddress.slice(-4)}
            </Button.Outline>
          )}
        </Box>
      </Flex>

      <Modal isOpen={modalOpen}>
        <Card width={"420px"} p={0}>
          <Button.Text
            icononly
            icon={"Close"}
            color={"moon-gray"}
            position={"absolute"}
            top={0}
            right={0}
            mt={3}
            mr={3}
            onClick={() => setModalOpen(false)}
          />

          <Box p={4} mb={3}>
            <Heading.h3>No Ethereum account found</Heading.h3>
            <Text>
              Please visit this page in a Web3 enabled browser.{" "}
              <a href="https://ethereum.org/use/#_3-what-is-a-wallet-and-which-one-should-i-use">
                Learn more
              </a>
            </Text>
          </Box>

          <Flex
            px={4}
            py={3}
            borderTop={1}
            borderColor={"#E8E8E8"}
            justifyContent={"flex-end"}
          >
            <Button.Outline onClick={() => setModalOpen(false)}>
              Close
            </Button.Outline>
          </Flex>
        </Card>
      </Modal>
    </ThemeProvider>
  );
};

export default App;
