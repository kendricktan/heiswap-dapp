const AltBn128 = artifacts.require('AltBn128.sol')

contract('AltBn128', accounts => {
  const secretKey = '0x1c28c75b7216693955b3ffe8c601fdfb6dd07b78600eeac48b9954d687090a87'
  const publicKey = [
    '0x0fce6aeea309c9487431af3306b49df8f1de2183ac98c59a6e382c0cd56f3b6f',
    '0x232e5711e8424a93805b971c1f6be63aa74770f9648601e9bfdc4ad04c28f3bf'
  ]

  // Converts Big Number to hex strings
  const bn2hex = x => '0x' + x.toString(16).padStart(64, '0')

  it('ecMul', async () => {
    const altbn128 = await AltBn128.deployed()

    const point = await altbn128.ecMul(publicKey, secretKey)
    const pointHex = [ bn2hex(point[0]), bn2hex(point[1]) ]

    const expectedPoint = [
      '0x1e163d27197822cf07b6fc5a0950721b9f80a7810063c8fa82d7e8f744269aad',
      '0x10f82337d1a6fdb0ef44098d066147641e200e34ee6af2d6a4f3064420192f33'
    ]

    assert.equal(true, expectedPoint.every(e => pointHex.includes(e)))
  })

  it('ecMulG', async () => {
    const altbn128 = await AltBn128.deployed()

    const calculatedPublicKey = await altbn128.ecMulG(secretKey)
    const calculatedPublicKeyHex = [
      bn2hex(calculatedPublicKey[0]),
      bn2hex(calculatedPublicKey[1])
    ]

    assert.equal(true, publicKey.every(e => calculatedPublicKeyHex.includes(e)))
  })

  it('ecAdd', async () => {
    const altbn128 = await AltBn128.deployed()

    const point = await altbn128.ecAdd(publicKey, publicKey)
    const pointHex = [ bn2hex(point[0]), bn2hex(point[1]) ]

    const expectedPoint = [
      '0x0726c08a475b0d980e2c0e2d6b92d010f6b4192bdf2c7a2014015504cf39b46c',
      '0x0cea253b7abbe43dbb05643f3a9ea936701bb77c10c442b59c1c323dbb8b4a89'
    ]

    assert.equal(true, expectedPoint.every(e => pointHex.includes(e)))
  })

  it('onCurve', async () => {
    let isOnCurve

    const altbn128 = await AltBn128.deployed()

    isOnCurve = await altbn128.onCurve(publicKey[0], publicKey[1])
    assert.equal(true, isOnCurve)

    // Generator coordinates
    isOnCurve = await altbn128.onCurve('0x01', '0x02')
    assert.equal(true, isOnCurve)

    isOnCurve = await altbn128.onCurve('0x0', '0x0')
    assert.equal(false, isOnCurve)
  })

  it('evalCurve', async () => {
    let y

    const altbn128 = await AltBn128.deployed()

    y = await altbn128.evalCurve(secretKey)
    yHex = [ bn2hex(y[0]), bn2hex(y[1]) ]
    const expectedY = [
      '0x200c701ce7526ffeaafee056172fa3018a7f10c50513023488b17256bf9e029c',
      '0x141238261eac80e90649f81745607b70d5776defe23adc09b3cba89a3b578ca8'
    ]

    assert.equal(true, yHex.every(e => expectedY.includes(e)))
  })
})
