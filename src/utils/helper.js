// @flow

// Appends 0x in front of hex strings so
// it fits the solidity format
const append0x = (s: String): String => {
  if (s.indexOf('0x') !== 0) {
    return '0x' + s
  }
  return s
}

export {
  append0x
}
