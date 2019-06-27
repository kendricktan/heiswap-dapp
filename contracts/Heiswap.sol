pragma solidity >=0.5.0 <0.6.0;

import "./AltBn128.sol";
import "./LSAG.sol";

contract Heiswap {
    // Events
    event Deposited(address, uint256 etherAmount, uint256 idx);

    // Minimum number of blocks that needs to be mined
    // before user can forcefully close the ring
    // Each blockTime is ~15 seconds
    // Want 86400 seconds to pass (24 hours)
    // So 86400 / 15 = 5760 blocks, which is roughly one day
    uint256 constant minBlockNumberToCloseRing = 5760;

    // Maximum number of participants in a ring
    uint256 constant ringMaxParticipants = 5;

    struct Ring {
        /* NOTE: Once someone signs a transaction
                 then no one else is able to deposit
                 money into the ring anymore
        */

        // When was thing block created
        uint256 createdBlockNumber;

        // Ring hash will be available once
        // there is 5 participants in the ring
        // TODO: Manually call the function "closeRing"
        bytes32 ringHash;

        // In a ring, everyone deposits
        // the same amount of ETH. Otherwise
        // the sender and receiver can be identified
        // which defeats the whole purpose of this
        // application
        uint256 amountDeposited;

        // Number of participants who've deposited
        uint8 dParticipantsNo;
        // The Public Key (stealth addresses)
        // These are in bytes because web3.js is
        // buggy with big int
        mapping (uint256 => uint256[2]) publicKeys;

        // Number of participants who've withdrawn
        uint8 wParticipantsNo;
        // Key Images of participants who have withdrawn
        // Used to determine if a participant is trying to
        // double withdraw
        mapping (uint256 => uint256[2]) keyImages;
    }

    // Fixed amounts allowed to be inserted into the rings
    uint256[10] allowedAmounts = [
        2 ether, 4 ether, 8 ether, 16 ether, 32 ether,
        64 ether, 128 ether, 256 ether, 512 ether
    ];

    // Mimics dynamic 'lists'
    // allowedAmount => numberOfRings (in the current amount)
    mapping(uint256 => uint256) ringsNo;

    // allowedAmount => ringIndex => Ring
    mapping (uint256 => mapping(uint256 => Ring)) rings;


    function deposit(uint256[2] memory publicKey) public payable
    {
        // Get amount sent
        uint256 receivedEther = floorEtherAndCheck(msg.value);

        // Gets the current ring for the amounts
        uint256 curIndex = ringsNo[receivedEther];
        Ring storage ring = rings[receivedEther][curIndex];

        if (!AltBn128.onCurve(uint256(publicKey[0]), uint256(publicKey[1]))) {
            revert("Public Key no on Curve");
        }

        // Make sure that public key (stealth address)
        // isn't already in there
        for (uint8 i = 0; i < ring.dParticipantsNo; i++) {
            if (ring.publicKeys[i][0] == publicKey[0] &&
                ring.publicKeys[i][1] == publicKey[1]) {
                revert("Address already in current Ring");
            }
        }

        // If its a new ring
        // set createdBlockNum size
        if (ring.dParticipantsNo == 0) {
            ring.createdBlockNumber = block.number - 1;
        }

        // Update ring params
        ring.publicKeys[ring.dParticipantsNo] = publicKey;
        ring.dParticipantsNo++;
        ring.amountDeposited += receivedEther;

        // Create new ring if current ring has exceeded number of participants
        if (ring.dParticipantsNo >= ringMaxParticipants) {
            // Set ringHash
            ring.ringHash = createRingHash(receivedEther / (1 ether), curIndex);

            // Add new Ring pool
            ringsNo[receivedEther] += 1;
        }

        // Broadcast Event
        emit Deposited(msg.sender, receivedEther, curIndex);
    }

    // User can only withdraw if the ring is closed
    // NOTE: Convert to ether
    // i.e. there is a ringHash
    function withdraw(
        address payable receiver, uint256 amountEther, uint256 index,
        uint256 c0, uint256[2] memory keyImage, uint256[] memory s
    ) public
    {
        uint i;
        uint256 startGas = gasleft();

        // Get amount sent
        uint256 withdrawEther = floorEtherAndCheck(amountEther * 1 ether);

        // Gets the current ring for the amounts
        Ring storage ring = rings[withdrawEther][index];

        // If everyone has withdrawn
        if (ring.wParticipantsNo >= ringMaxParticipants) {
            revert("All funds from current Ring has been withdrawn");
        }

        // Ring needs to be closed first
        // TODO: Make sure ring is closed later on...
        if (ring.ringHash == bytes32(0x00)) {
            revert("Ring isn't closed");
        }

        uint256[2][] memory publicKeys = new uint256[2][](ringMaxParticipants);

        for (i = 0; i < ringMaxParticipants; i++) {
            publicKeys[i] = [
                uint256(ring.publicKeys[uint8(i)][0]),
                uint256(ring.publicKeys[uint8(i)][1])
            ];
        }

        // Attempts to verify ring signature
        bool signatureVerified = LSAG.verify(
            abi.encodePacked(ring.ringHash), // Convert to bytes
            c0,
            keyImage,
            s,
            publicKeys
        );

        if (!signatureVerified) {
            revert("Invalid signature");
        }

        // Checks if Key Image has been used
        // AKA No double withdraw
        for (i = 0; i < ring.wParticipantsNo; i++) {
            if (ring.keyImages[uint8(i)][0] == keyImage[0] &&
                ring.keyImages[uint8(i)][1] == keyImage[1]) {
                revert("Signature has been used!");
            }
        }

        // Otherwise adds key image to the current key image
        // And adjusts params accordingly
        ring.keyImages[ring.wParticipantsNo] = keyImage;
        ring.wParticipantsNo += 1;

        // Send ETH to receiver
        // Calculate fees (1.33%) + gasUsage fees
        uint256 gasUsed = startGas - gasleft();
        uint256 fees = (withdrawEther / 75) + gasUsed + startGas;

        // Relayer gets (1%) of the xferred value + compensated for gas usage
        msg.sender.transfer(fees);

        // Reciever then gets the remaining ETH
        receiver.transfer(withdrawEther - fees);
    }


    // If enough blocks has passed, user can manually close the ring.
    function forceCloseRing(
        uint256 amount, uint256 index
    ) public
    {
        // Get amount sent
        uint256 receivedEther = floorEtherAndCheck(amount * 1 ether);

        // Gets the current ring for the amounts
        uint256 curIndex = ringsNo[receivedEther];
        Ring storage ring = rings[receivedEther][curIndex];


        if (ring.ringHash != bytes32(0x00)) {
            revert("Ring is already closed!");
        }

        if (block.number - 1 - ring.createdBlockNumber >= minBlockNumberToCloseRing) {
            revert("Ring needs to mature longer before forcefully closing");
        }

        // Close the ring
        ring.ringHash = createRingHash(receivedEther / (1 ether), index);

        // Create new ring
        ringsNo[receivedEther] += 1;
    }

    /* Helper functions */
    // TODO: Use safemath library

    // Creates ring hash (used for signing)
    function createRingHash(uint256 amountEther, uint256 index) internal view
        returns (bytes32)
    {
        uint256[2][ringMaxParticipants] memory publicKeys;
        uint256 receivedEther = floorEtherAndCheck(amountEther * 1 ether);

        Ring storage r = rings[receivedEther][index];

        for (uint8 i = 0; i < ringMaxParticipants; i++) {
            publicKeys[i] = r.publicKeys[i];
        }

        bytes memory b = abi.encodePacked(
            blockhash(block.number - 1),
            r.createdBlockNumber,
            r.amountDeposited,
            r.dParticipantsNo,
            publicKeys
        );

        return keccak256(b);
    }

    // Gets ring hash
    function getRingHash(uint256 amountEther, uint256 index) public view
        returns (bytes32)
    {
        uint256 receivedEther = floorEtherAndCheck(amountEther * 1 ether);
        Ring memory r = rings[receivedEther][index];

        return r.ringHash;
    }

    // Gets all addresses in a Ring
    // Converting to Bytes32 cause web3.js has a bug that doesn't convert
    // Big Num correctly....
    function getPublicKeys(uint256 amountEther, uint256 index) public view
        returns (bytes32[2][ringMaxParticipants] memory)
    {
        uint256 receivedEther = floorEtherAndCheck(amountEther * 1 ether);

        bytes32[2][ringMaxParticipants] memory publicKeys;

        for (uint i = 0; i < ringMaxParticipants; i++) {
            publicKeys[i][0] = bytes32(rings[receivedEther][index].publicKeys[i][0]);
            publicKeys[i][1] = bytes32(rings[receivedEther][index].publicKeys[i][1]);
        }

        return publicKeys;
    }

    // Gets number of participants who
    // have deposited and withdrawn
    // ret: (dParticipants, wParticipants)
    function getParticipants(uint256 amountEther, uint256 index) public view
        returns (uint8, uint8)
    {
        uint256 receivedEther = floorEtherAndCheck(amountEther * 1 ether);
        Ring memory r = rings[receivedEther][index];

        return (r.dParticipantsNo, r.wParticipantsNo);
    }

    // Floors the current ether values
    // Makes sure the values needs to in `allowedAmounts`
    function floorEtherAndCheck(uint256 receivedAmount) internal view
        returns (uint256)
    {
        uint256 i;
        bool allowed = false;

        // Floors received ether
        uint256 receivedEther = (receivedAmount / 1 ether) * 1 ether;

        for (i = 0; i < 10; i ++) {
            if (allowedAmounts[i] == receivedEther) {
                allowed = true;
            }
            if (allowed) {
                break;
            }
        }

        // Revert if ETH sent isn't in the allowed fixed amounts
        require(allowed, "Only ETH values of 2, 4, 6, 8 ... 512 are allowed");

        return receivedEther;
    }
}