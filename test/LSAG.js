const LSAG = artifacts.require('LSAG.sol')

contract('LSAG', accounts => {
  // Converts Big Number to hex strings
  const bn2hex = x => '0x' + x.toString(16).padStart(64, '0')

  it('intToPoint', async () => {
    const lsag = await LSAG.deployed()

    const secretKey = '0x1c28c75b7216693955b3ffe8c601fdfb6dd07b78600eeac48b9954d687090a87'
    const publicKey = [
      '0x0fce6aeea309c9487431af3306b49df8f1de2183ac98c59a6e382c0cd56f3b6f',
      '0x232e5711e8424a93805b971c1f6be63aa74770f9648601e9bfdc4ad04c28f3bf'
    ]

    const point = await lsag.intToPoint(secretKey)
    const pointHex = [ bn2hex(point[0]), bn2hex(point[1]) ]

    const expectedPoint = [
      '0x1c28c75b7216693955b3ffe8c601fdfb6dd07b78600eeac48b9954d687090a87',
      '0x141238261eac80e90649f81745607b70d5776defe23adc09b3cba89a3b578ca8'
    ]

    assert.equal(true, expectedPoint.every(e => pointHex.includes(e)))
  })

  it('verify', async () => {
    const lsag = await LSAG.deployed()

    const secretKeys = [
      '0x0e90a24937630c3ade5d52753792decf936f839cc317b9418257da02ee6cf0ab',
      '0x1cb0e68ec58bfa7863289b95c6d8eb9d9e66cf9f4804d5ebd346338ebad7fa6e',
      '0x100bfa9dbe3631bcfa561f9a87e0e05e8684306a8f7dcf06e9f573985b285f74',
      '0x0a5211e6ee38ee31b178c8f8e2b3281a3ddd57de0b24bdb30df4b3e443a87b02'
    ]
    const publicKeys = [
      ['0x20d9c3e18b9a6c57328ff0a5e19ed198bfa83134eebda6b06cc77e5c264ff0b0',
        '0x1176940d44f610d82a73718730671af4bd00c03fa445262436dff38d83b78006'],
      ['0x11c4cfafeb9355518b1293f083514c835832584ff443b7466cc1f83a0e22855e',
        '0x00dd2f5185175d4ffbe6bcb5106dfbb11d7f254a51337c21f3787aa65ec460d2'],
      ['0x2dfa9b9604825f2425523ad824283bc9d9c73af86d7f8878d33321c6c296607c',
        '0x0900066caa076333dcdf2a072d48a70412a19d4ee180f953da0f06e4f2ccface'],
      ['0x09ca8d27ddcfcb9a681453de9afb97aa81ebc6025423d778b9d5aebfca06c3b9',
        '0x275bce6aecf3e5be348a4f328577ced795f97cb6ebb23cc3e9daf8a807926e92']
    ]

    // message = "ETH for you and everyone!" (encoded in byte format)
    const message = '0x45544820666f7220796f7520616e642065766572796f6e6521'

    const c0 = '0x16f154c8b054472b27fa5ddfdc6efaef113f287567f0bdfe58a8890d8c6fc4ec'
    const s = [
      '0x2374c0249d845fb3d4b24b4eeb50d8a4cdb8fb366095ac6a81f4069620408de9',
      '0x27d3e33dfdb5e3f4ca318652c36bb7d425b0c547165cdfc35fef325c1b6d8805',
      '0x169defa45ba6aa703487fc0104539991e1af1395c1ef117d344202a62684e15e',
      '0x243d34a84942e1d9c1df9b6bc00fa6a073b89c9a4b9fe7959346161ca66a9852'
    ]
    const keyImage = [
      '0x052f545a6b88959b463c86b280bc201b16eee954b7190512c25624d4a2c8bb4a',
      '0x24fbbb0185ad24760408a2d383a1cd8de2be69b6bd52fee38b722927a1d6430d'
    ]

    let isVerified

    isVerified = await lsag.verify(
      message,
      c0,
      keyImage,
      s,
      publicKeys
    )
    assert.equal(true, isVerified)

    const invalidMessage = '0x45544820666f7220796f7520616e642065766572796f6e6522'
    isVerified = await lsag.verify(
      invalidMessage,
      c0,
      keyImage,
      s,
      publicKeys
    )
    assert.equal(false, isVerified)
  })
})
