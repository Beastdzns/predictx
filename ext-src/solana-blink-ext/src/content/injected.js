// Injected script - runs in page context to access window.solana (Phantom)
// Communicates with content script via custom events

; (function () {
    'use strict'

    window.addEventListener('privacy-wallet-action', async function (event) {
        const detail = event.detail
        const action = detail.action
        const data = detail.data || {}
        const requestId = detail.requestId

        try {
            let result

            switch (action) {
                case 'connect':
                    result = await connectWallet()
                    break
                case 'checkConnection':
                    result = await checkConnection()
                    break
                case 'disconnect':
                    result = await disconnectWallet()
                    break
                default:
                    throw new Error('Unknown action: ' + action)
            }

            window.dispatchEvent(
                new CustomEvent('privacy-wallet-response', {
                    detail: { requestId: requestId, success: true, data: result },
                })
            )
        } catch (error) {
            window.dispatchEvent(
                new CustomEvent('privacy-wallet-response', {
                    detail: { requestId: requestId, success: false, error: error.message },
                })
            )
        }
    })

    async function connectWallet() {
        const solana = window.solana
        if (!solana || !solana.isPhantom) {
            throw new Error('Phantom wallet not found. Please install Phantom.')
        }

        const response = await solana.connect()
        return {
            connected: true,
            address: response.publicKey.toString(),
        }
    }

    async function checkConnection() {
        const solana = window.solana
        if (!solana || !solana.isPhantom) {
            return { connected: false, address: null }
        }

        try {
            const response = await solana.connect({ onlyIfTrusted: true })
            return {
                connected: true,
                address: response.publicKey.toString(),
            }
        } catch (e) {
            return { connected: false, address: null }
        }
    }

    async function disconnectWallet() {
        const solana = window.solana
        if (solana && solana.isPhantom) {
            await solana.disconnect()
        }
        return { connected: false, address: null }
    }

    console.log('Privacy Cash: Wallet bridge loaded')
})()
