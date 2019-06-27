const AltBn128 = artifacts.require("AltBn128");
const LSAG = artifacts.require("LSAG");
const Heiswap = artifacts.require("Heiswap");

module.exports = function(deployer) {
  deployer.deploy(AltBn128);
  deployer.link(AltBn128, LSAG);
  deployer.deploy(LSAG);
  deployer.link(LSAG, Heiswap);
  deployer.link(AltBn128, Heiswap);
  deployer.deploy(Heiswap);
};