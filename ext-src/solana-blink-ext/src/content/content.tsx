// Content script — injects PredictX prediction market cards into Twitter/X
import './content.css'

// ── Config ─────────────────────────────────────────────────────────────────

const BLINK_URL_PATTERNS = [
  /https?:\/\/(?:www\.)?localhost:\d+\/api\/blink\/monad\/(\d+)[^\s"<>]*/,
  /https?:\/\/(?:www\.)?predictx\.vercel\.app\/api\/blink\/monad\/(\d+)[^\s"<>]*/,
]

// Frontend URL for Privy signing popup
const FRONTEND_BASE_DEV = 'http://localhost:3001'
const FRONTEND_BASE_PROD = 'https://predictx.vercel.app'

// Set to true for local testing, false for production
const USE_LOCAL_DEV = true;

function getApiBaseUrl(blinkUrl: string): string {
  if (USE_LOCAL_DEV) return FRONTEND_BASE_DEV
  if (blinkUrl.includes('localhost')) return FRONTEND_BASE_DEV
  return FRONTEND_BASE_PROD
}

function getFrontendBaseUrl(): string {
  if (USE_LOCAL_DEV) return FRONTEND_BASE_DEV
  return FRONTEND_BASE_PROD
}

// ── State ──────────────────────────────────────────────────────────────────

const processedElements = new WeakSet<Element>()

// ── URL Parsing ────────────────────────────────────────────────────────────

function extractBlinkInfo(text: string): { marketId: string; apiBase: string; fullUrl: string } | null {
  // Multiple patterns to catch different text forms (full URL, truncated, etc.)
  const allPatterns = [
    // Full URLs
    /https?:\/\/(?:www\.)?localhost:\d+\/api\/blink\/monad\/(\d+)/i,
    /https?:\/\/(?:www\.)?predictx\.vercel\.app\/api\/blink\/monad\/(\d+)/i,
    // Without protocol
    /predictx\.vercel\.app\/api\/blink\/monad\/(\d+)/i,
    /localhost:\d+\/api\/blink\/monad\/(\d+)/i,
    // Truncated (Twitter shows "predictx.vercel.app/api/blink/mona..." )
    /predictx\.vercel\.app\/api\/blink\/mona[^\s]*/i,
    // Just the domain + api path prefix
    /predictx\.vercel\.app[^\s]*\/blink\/monad/i,
  ]

  for (const pattern of allPatterns) {
    const match = text.match(pattern)
    if (match) {
      // Try to extract market ID
      let marketId = match[1]
      
      // If no capture group, try to find any digit after the pattern
      if (!marketId) {
        const idMatch = text.match(/\/blink\/monad\/(\d+)/) || text.match(/monad\/(\d+)/)
        marketId = idMatch?.[1] || '1' // Default to market 1 if truncated
      }
      
      let fullUrl = match[0]
      if (!fullUrl.startsWith('http')) fullUrl = 'https://' + fullUrl
      
      const apiBase = getApiBaseUrl(fullUrl)
      // Only log once per unique market found
      return { marketId, apiBase, fullUrl }
    }
  }
  return null
}

// ── Blink Data Fetch ───────────────────────────────────────────────────────

interface BlinkAction {
  label: string
  href: string
}

interface BlinkData {
  icon?: string
  title: string
  description: string
  links?: { actions: BlinkAction[] }
}

async function fetchBlinkData(apiBase: string, marketId: string): Promise<BlinkData | null> {
  const url = `${apiBase}/api/blink/monad/${marketId}`
  try {
    const resp = await fetch(url)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}

// ── Send EVM Transaction via Privy Popup ──────────────────────────────────

interface SignResult {
  success: boolean
  txHash?: string
  error?: string
}

/**
 * Opens a popup to the PredictX frontend for Privy-based signing.
 * The popup signs the transaction with the embedded wallet and sends result back via postMessage.
 */
async function sendBlinkTransactionViaPrivy(
  marketId: string,
  side: 'yes' | 'no',
  amountMon: string
): Promise<SignResult> {
  return new Promise((resolve) => {
    const frontendBase = getFrontendBaseUrl()
    const params = new URLSearchParams({
      marketId,
      side,
      amount: amountMon,
      returnOrigin: window.location.origin,
    })
    
    const signUrl = `${frontendBase}/blink-sign?${params.toString()}`
    
    // Open popup
    const popup = window.open(
      signUrl,
      'PredictX Sign',
      'width=420,height=600,left=100,top=100,resizable=yes,scrollbars=yes'
    )
    
    if (!popup) {
      resolve({ success: false, error: 'Popup blocked. Please allow popups for this site.' })
      return
    }

    // Listen for result from popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (!event.origin.includes('localhost') && !event.origin.includes('predictx')) return
      if (event.data?.type !== 'BLINK_SIGN_RESULT') return
      
      window.removeEventListener('message', handleMessage)
      resolve({
        success: event.data.success,
        txHash: event.data.txHash,
        error: event.data.error,
      })
    }
    
    window.addEventListener('message', handleMessage)

    // Timeout after 2 minutes
    setTimeout(() => {
      window.removeEventListener('message', handleMessage)
      if (!popup.closed) {
        popup.close()
      }
      resolve({ success: false, error: 'Signing timeout. Please try again.' })
    }, 120000)

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        // Give a moment for the message to arrive before reporting closure
        setTimeout(() => {
          resolve({ success: false, error: 'Signing cancelled.' })
        }, 500)
      }
    }, 1000)
  })
}

/**
 * Legacy function that uses MetaMask/Rabby directly.
 * Kept as fallback if user prefers external wallet.
 * Prefixed with _ to indicate intentionally unused.
 */
async function _sendBlinkTransactionViaExternalWallet(href: string, amountMon: string): Promise<SignResult> {
  if (typeof window.ethereum === 'undefined') {
    return { success: false, error: 'No Ethereum wallet found. Install MetaMask or Rabby.' }
  }

  try {
    // Switch to Monad Testnet (chainId 0x27af = 10143)
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x27af' }],
      })
    } catch (switchErr: any) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x27af',
            chainName: 'Monad Testnet',
            rpcUrls: ['https://testnet-rpc.monad.xyz'],
            nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
            blockExplorerUrls: ['https://testnet.monadexplorer.com'],
          }],
        })
      }
    }

    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
    const from = accounts[0]

    // POST to Blink API to get unsigned transaction
    const resp = await fetch(href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: from, amount: amountMon }),
    })
    const body = await resp.json()
    if (!body.transaction) return { success: false, error: 'API returned no transaction' }

    const txHash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ ...body.transaction, from }],
    }) as string

    return { success: true, txHash }
  } catch (err: any) {
    return { success: false, error: err.message || 'Transaction failed' }
  }
}

// ── Card UI ────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text || ''
  return div.innerHTML
}

// Generate a random sparkline path for visual effect
function generateSparklinePath(width: number, height: number, yesPct: number): string {
  const points: [number, number][] = []
  const numPoints = 20
  const baseline = height * (1 - yesPct / 100)
  
  for (let i = 0; i <= numPoints; i++) {
    const x = (i / numPoints) * width
    // Add some randomness but trend toward current price
    const noise = (Math.random() - 0.5) * 20
    const trend = ((i / numPoints) * (yesPct - 50)) // trend toward current
    let y = baseline + noise - trend * 0.3
    y = Math.max(5, Math.min(height - 5, y))
    points.push([x, y])
  }
  
  // Create smooth path
  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i]
    const [px, py] = points[i - 1]
    const cpx = (px + x) / 2
    path += ` Q ${px} ${py} ${cpx} ${(py + y) / 2}`
  }
  path += ` L ${points[points.length - 1][0]} ${points[points.length - 1][1]}`
  
  return path
}

function generateSparklineAreaPath(linePath: string, width: number, height: number): string {
  return `${linePath} L ${width} ${height} L 0 ${height} Z`
}

function parseOddsFromLabel(label: string): number {
  // Extract percentage from labels like "Buy YES (65%)" or "✅ Buy YES (65%)"
  const match = label.match(/\((\d+)%\)/)
  return match ? parseInt(match[1], 10) : 50
}

function createPredictCard(data: BlinkData, marketId: string, _apiBase: string): HTMLElement {
  const actions = data.links?.actions || []
  const [yesBuy, noBuy] = actions
  
  // Parse odds from action labels
  const yesPct = yesBuy ? parseOddsFromLabel(yesBuy.label) : 50
  const noPct = 100 - yesPct
  
  // Generate sparkline
  const chartWidth = 280
  const chartHeight = 60
  const sparklinePath = generateSparklinePath(chartWidth, chartHeight, yesPct)
  const areaPath = generateSparklineAreaPath(sparklinePath, chartWidth, chartHeight)
  const lastPoint = sparklinePath.split(' ').slice(-2).map(Number)

  const container = document.createElement('div')
  container.className = 'predictx-card-container'
  container.innerHTML = `
    <div class="predictx-card">
      <div class="predictx-header">
        <span class="predictx-badge">⚡ PredictX</span>
        <span class="predictx-market-id">Market #${escapeHtml(marketId)}</span>
      </div>
      
      <div class="predictx-question">${escapeHtml(data.title)}</div>
      <div class="predictx-meta">${escapeHtml(data.description)}</div>
      
      <!-- Sparkline Chart -->
      <div class="predictx-chart-section">
        <div class="predictx-chart-container">
          <svg class="predictx-sparkline" viewBox="0 0 ${chartWidth} ${chartHeight}" preserveAspectRatio="none">
            <defs>
              <linearGradient id="predictx-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#facc15;stop-opacity:0.4" />
                <stop offset="100%" style="stop-color:#facc15;stop-opacity:0" />
              </linearGradient>
            </defs>
            <path class="predictx-sparkline-area" d="${areaPath}"></path>
            <path class="predictx-sparkline-path" d="${sparklinePath}"></path>
            <circle class="predictx-sparkline-dot" cx="${lastPoint[0] || chartWidth}" cy="${lastPoint[1] || chartHeight / 2}" r="4"></circle>
          </svg>
        </div>
      </div>
      
      <!-- Probability Bar -->
      <div class="predictx-probability">
        <div class="predictx-prob-bar-wrapper">
          <span class="predictx-prob-yes">YES ${yesPct}%</span>
          <div class="predictx-prob-bar-container">
            <div class="predictx-prob-bar-yes" style="width: ${yesPct}%"></div>
          </div>
          <span class="predictx-prob-no">NO ${noPct}%</span>
        </div>
      </div>
      
      <!-- Stats -->
      <div class="predictx-stats">
        <div class="predictx-stat">
          <div class="predictx-stat-value">$${(Math.random() * 50000 + 1000).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}</div>
          <div class="predictx-stat-label">Volume</div>
        </div>
        <div class="predictx-stat">
          <div class="predictx-stat-value">${Math.floor(Math.random() * 500 + 50)}</div>
          <div class="predictx-stat-label">Traders</div>
        </div>
        <div class="predictx-stat">
          <div class="predictx-stat-value">Monad</div>
          <div class="predictx-stat-label">Network</div>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div class="predictx-actions">
        ${yesBuy ? `<button class="predictx-btn predictx-btn-yes" data-market-id="${escapeHtml(marketId)}" data-side="yes" data-href="${escapeHtml(yesBuy.href)}">
          ✅ Buy YES
        </button>` : ''}
        ${noBuy ? `<button class="predictx-btn predictx-btn-no" data-market-id="${escapeHtml(marketId)}" data-side="no" data-href="${escapeHtml(noBuy.href)}">
          ❌ Buy NO
        </button>` : ''}
      </div>
      
      <!-- Quick Amount Buttons -->
      <div class="predictx-quick-amounts">
        <button class="predictx-quick-btn" data-amount="0.01">0.01</button>
        <button class="predictx-quick-btn" data-amount="0.1">0.1</button>
        <button class="predictx-quick-btn" data-amount="1">1</button>
        <button class="predictx-quick-btn" data-amount="5">5</button>
      </div>
      
      <!-- Amount Input -->
      <div class="predictx-amount-row">
        <input class="predictx-amount-input" type="number" placeholder="Amount" min="0.0001" step="0.01" value="0.01" />
        <span class="predictx-mon">MON</span>
      </div>
      
      <div class="predictx-status" style="display:none;"></div>
      <div class="predictx-footer">Powered by PredictX · Monad Testnet</div>
    </div>
  `

  // Wire up quick amount buttons
  const quickBtns = container.querySelectorAll<HTMLButtonElement>('.predictx-quick-btn')
  const amountInput = container.querySelector<HTMLInputElement>('.predictx-amount-input')!
  
  quickBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      amountInput.value = btn.dataset.amount || '0.01'
    })
  })

  // Wire up action buttons - use Privy embedded wallet signing
  const actionBtns = container.querySelectorAll<HTMLButtonElement>('.predictx-btn')
  const statusEl = container.querySelector<HTMLElement>('.predictx-status')!

  actionBtns.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()

      const mktId = btn.dataset.marketId || marketId
      const side = (btn.dataset.side || 'yes') as 'yes' | 'no'
      const amount = amountInput.value || '0.01'

      statusEl.style.display = 'block'
      statusEl.className = 'predictx-status predictx-status-loading'
      statusEl.innerHTML = `<span class="predictx-loader"></span>Processing ${side.toUpperCase()} — ${amount} MON...`
      actionBtns.forEach(b => (b.disabled = true))

      // Use Privy embedded wallet via popup
      const result = await sendBlinkTransactionViaPrivy(mktId, side, amount)

      if (result.success) {
        statusEl.className = 'predictx-status predictx-status-success'
        statusEl.innerHTML = `✅ Trade submitted! <a href="https://testnet.monadexplorer.com/tx/${result.txHash}" target="_blank">View tx</a>`
      } else {
        statusEl.className = 'predictx-status predictx-status-error'
        statusEl.textContent = `❌ ${result.error}`
        actionBtns.forEach(b => (b.disabled = false))
      }
    })
  })

  return container
}

// ── Injection Logic ────────────────────────────────────────────────────────

async function processBlinkLinks() {
  console.log('[PredictX] Scanning for blink links...')
  
  // Strategy 1: Check ALL anchor tags on the page
  for (const link of document.querySelectorAll('a[href]')) {
    if (processedElements.has(link)) continue
    const href = link.getAttribute('href') || ''
    const text = link.textContent || ''
    const info = extractBlinkInfo(href) || extractBlinkInfo(text)
    if (!info) continue
    console.log('[PredictX] Found link:', href, text)
    processedElements.add(link)
    await injectCard(link, info)
  }

  // Strategy 2: Check tweet text elements (multiple Twitter selectors)
  const tweetSelectors = [
    '[data-testid="tweetText"]',
    'article div[lang]',
    'article [dir="auto"]',
    '[data-testid="tweet"] div[dir="auto"]',
  ]
  
  for (const selector of tweetSelectors) {
    for (const tweetText of document.querySelectorAll(selector)) {
      if (processedElements.has(tweetText)) continue
      const text = tweetText.textContent || ''
      const info = extractBlinkInfo(text)
      if (!info) continue
      const article = tweetText.closest('article')
      if (article?.querySelector('.predictx-card-container')) continue
      console.log('[PredictX] Found in tweet text:', text.substring(0, 100))
      processedElements.add(tweetText)
      await injectCard(tweetText as HTMLElement, info)
    }
  }

  // Strategy 3: Check Twitter's card wrapper (link previews)
  for (const cardWrapper of document.querySelectorAll('[data-testid="card.wrapper"]')) {
    if (processedElements.has(cardWrapper)) continue
    // Check if card contains predictx URL in any child
    const text = cardWrapper.textContent || ''
    const info = extractBlinkInfo(text)
    if (!info) continue
    const article = cardWrapper.closest('article')
    if (article?.querySelector('.predictx-card-container')) continue
    console.log('[PredictX] Found in card wrapper:', text.substring(0, 100))
    processedElements.add(cardWrapper)
    await injectCardAtCardWrapper(cardWrapper as HTMLElement, info)
  }

  // Strategy 4: Scan ALL text content in articles
  for (const article of document.querySelectorAll('article')) {
    if (processedElements.has(article)) continue
    if (article.querySelector('.predictx-card-container')) continue
    
    const fullText = article.textContent || ''
    const info = extractBlinkInfo(fullText)
    if (!info) continue
    console.log('[PredictX] Found by article scan')
    processedElements.add(article)
    await injectCardInArticle(article as HTMLElement, info)
  }
}

// Inject card replacing Twitter's card wrapper
async function injectCardAtCardWrapper(cardWrapper: HTMLElement, info: { marketId: string; apiBase: string; fullUrl: string }) {
  const data = await fetchBlinkData(info.apiBase, info.marketId) || {
    title: `Prediction Market #${info.marketId}`,
    description: 'Trade on Monad Testnet',
    links: {
      actions: [
        { label: 'Buy YES', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=yes` },
        { label: 'Buy NO', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=no` },
      ]
    }
  }

  const card = createPredictCard(data, info.marketId, info.apiBase)
  
  // Hide the Twitter card and insert ours after it
  cardWrapper.style.display = 'none'
  cardWrapper.parentNode?.insertBefore(card, cardWrapper.nextSibling)
}

// Inject card within an article (fallback)
async function injectCardInArticle(article: HTMLElement, info: { marketId: string; apiBase: string; fullUrl: string }) {
  const data = await fetchBlinkData(info.apiBase, info.marketId) || {
    title: `Prediction Market #${info.marketId}`,
    description: 'Trade on Monad Testnet',
    links: {
      actions: [
        { label: 'Buy YES', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=yes` },
        { label: 'Buy NO', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=no` },
      ]
    }
  }

  const card = createPredictCard(data, info.marketId, info.apiBase)

  // Hide any Twitter card wrapper
  article.querySelectorAll('[data-testid="card.wrapper"]').forEach(el => {
    (el as HTMLElement).style.display = 'none'
  })

  // Find tweet text or last text block to insert after
  const tweetText = article.querySelector('[data-testid="tweetText"]') || article.querySelector('div[lang]')
  if (tweetText) {
    tweetText.parentNode?.insertBefore(card, tweetText.nextSibling)
  } else {
    article.appendChild(card)
  }
}

async function injectCard(element: Element, info: { marketId: string; apiBase: string; fullUrl: string }) {
  console.log('[PredictX] injectCard called for market:', info.marketId)
  
  const data = await fetchBlinkData(info.apiBase, info.marketId) || {
    title: `Prediction Market #${info.marketId}`,
    description: 'Trade on Monad Testnet',
    links: {
      actions: [
        { label: 'Buy YES', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=yes` },
        { label: 'Buy NO', href: `${info.apiBase}/api/blink/monad/${info.marketId}/trade?side=no` },
      ]
    }
  }
  
  console.log('[PredictX] Fetched data:', data?.title)

  const container =
    element.closest('[data-testid="tweet"]') ||
    element.closest('article') ||
    element.parentElement

  console.log('[PredictX] Container found:', !!container, container?.tagName)
  
  if (!container) {
    console.log('[PredictX] No container found, skipping')
    return
  }
  
  if (container.querySelector('.predictx-card-container')) {
    console.log('[PredictX] Card already exists in container, skipping')
    return
  }

  // Hide Twitter's link preview
  container.querySelectorAll('[data-testid="card.wrapper"]').forEach(el => {
    (el as HTMLElement).style.display = 'none'
  })

  const card = createPredictCard(data, info.marketId, info.apiBase)
  console.log('[PredictX] Card created, inserting...')
  
  const insertPoint = element.closest('[data-testid="tweetText"]') || element
  insertPoint.parentNode?.insertBefore(card, insertPoint.nextSibling)
  console.log('[PredictX] Card inserted successfully!')
}

// ── Init ───────────────────────────────────────────────────────────────────

let isScanning = false

async function init() {
  console.log('[PredictX] Extension active on', window.location.hostname)
  
  // Initial scan after short delay for page render
  await new Promise(r => setTimeout(r, 1000))
  await processBlinkLinks()

  // Mutation observer for lazy-loaded content
  new MutationObserver(mutations => {
    if (mutations.some(m => m.addedNodes.length > 0)) {
      if (!isScanning) {
        isScanning = true
        setTimeout(async () => {
          await processBlinkLinks()
          isScanning = false
        }, 500)
      }
    }
  }).observe(document.body, { childList: true, subtree: true })

  // Interval-based scanning as fallback (like reference repo)
  // Twitter's React rendering can miss mutation events
  setInterval(async () => {
    if (!isScanning) {
      isScanning = true
      await processBlinkLinks()
      isScanning = false
    }
  }, 2000)
}

// Extend window to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
