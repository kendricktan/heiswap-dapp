// @flow

import React, { useState, useEffect } from "react";
import getWeb3 from "./utils/getWeb3";
import createDrizzleUtils from "@drizzle-utils/core";
import StatusModal from "./components/StatusModal";
import Logo from './assets/key.png';
import {
  Heading,
  Text,
  Input,
  Flex,
  Box,
  Button,
  Blockie,
  QR
} from "rimble-ui";
import { ThemeProvider } from "rimble-ui";

type DappGateway = {
  web3: Object,
  drizzleUtils: Object,
  ethAddress: String, // Current ETH Address
  attempted: Boolean // Have we attempted to connect to web3 and drizzleUtils?
};

const App = () => {
  // Dapp gateway state
  const [dappGateway: DappGateway, setDappGateway] = useState({
    web3: null,
    drizzleUtils: null,
    ethAddress: null,
    attempted: false
  });

  // Status Modal
  const [statusModalOpen: Boolean, setStatusModalOpen] = useState(false);

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
      (async () => {
        await initDappGateway();
      })();
    }
  });

  return (
    <ThemeProvider>
      <Flex>
        <Box p={3} width={1 / 2}>
          <Button.Outline>
            <img alt="logo" src={Logo} style={{ width: '15px', height: '15px' }} />
            &nbsp;
            Heiswap
          </Button.Outline>
        </Box>
        <Box p={3} width={1 / 2} style={{ textAlign: "right" }}>
          {dappGateway.ethAddress === null ? (
            <Button
              onClick={() => {
                if (dappGateway.ethAddress === null) {
                  (async () => {
                    if (!await initDappGateway()) {
                      setStatusModalOpen(true);
                    }
                  })();
                }
              }}
            >
              Connect
            </Button>
          ) : (
              <Button.Outline
                onClick={() => setStatusModalOpen(true)}
              >
                <Blockie opts={{ seed: dappGateway.ethAddress, size: 6 }} />
                &nbsp;&nbsp;
                {dappGateway.ethAddress.slice(0, 5) + "..." + dappGateway.ethAddress.slice(-4)}
              </Button.Outline>
            )}
        </Box>
      </Flex>

      <StatusModal isOpen={statusModalOpen} setIsOpen={setStatusModalOpen}>
        {
          dappGateway.ethAddress === null ?
            (
              <div>
                <Heading.h3>No Ethereum account found</Heading.h3>
                <br />
                <Text>
                  Please visit this page in a Web3 enabled browser.{" "}
                  <a href="https://ethereum.org/use/#_3-what-is-a-wallet-and-which-one-should-i-use">
                    Learn more
                  </a>
                </Text>
              </div>
            ) :
            (
              <div style={{ textAlign: 'center' }}>
                <Heading.h3>Connected Ethereum account</Heading.h3>
                <br />
                <Text style={{ textAlign: 'center' }}>
                  <QR value={dappGateway.ethAddress} />
                  <br /><br />
                  <Input
                    style={{ textAlign: 'center' }}
                    width="100%"
                    type="text" onChange={() => { }} value={dappGateway.ethAddress}
                  />
                </Text>
              </div>
            )
        }
      </StatusModal>
    </ThemeProvider>
  );
};

export default App;
