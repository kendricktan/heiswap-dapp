// Extending https://github.com/trufflesuite/drizzle-utils/blob/master/packages/get-web3/index.js

const Web3 = require('web3')

const resolveWeb3 = (resolve, options, isBrowser) => {
  let provider

  if (options.customProvider) {
    // use custom provider from options object
    provider = options.customProvider
  } else if (isBrowser && window.ethereum) {
    // use `ethereum` object injected by MetaMask
    provider = window.ethereum
    if (options.requestPermission) window.ethereum.enable()
  } else if (isBrowser && typeof window.web3 !== 'undefined') {
    // use injected web3 object by legacy dapp browsers
    provider = window.web3.currentProvider
  } else if (options.fallbackProvider) {
    // use fallback provider from options object
    provider = options.fallbackProvider
  }

  const web3 = new Web3(provider)
  resolve(web3)
}

const getWeb3 = (options = {}) =>
  new Promise(resolve => {
    // handle server-side and React Native environments
    const isReactNative =
      typeof navigator !== 'undefined' && navigator.product === 'ReactNative'
    const isNode = typeof window === 'undefined'
    if (isNode || isReactNative) {
      return resolveWeb3(resolve, options, false)
    }

    // if page is ready, resolve for web3 immediately
    if (document.readyState === `complete`) {
      return resolveWeb3(resolve, options, true)
    }

    // otherwise, resolve for web3 when page is done loading
    return window.addEventListener('load', () =>
      resolveWeb3(resolve, options, true)
    )
  })

module.exports = getWeb3
