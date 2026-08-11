import { connect } from 'framer-api'

const projectUrl = process.env.FRAMER_PROJECT_URL
const apiKey = process.env.FRAMER_API_KEY
const checkoutUrl = process.env.DSG_ENCODING_CHECKOUT_URL ||
  'https://tdealer01-crypto-dsg-control-plane.onrender.com/framer/encoding-proof/checkout'

if (!projectUrl || !apiKey) {
  throw new Error('FRAMER_PROJECT_URL and FRAMER_API_KEY are required')
}

const MARKER = 'data-dsg="encoding-proof-v1"'

function renderEncodingProof(checkout) {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path !== '/encoding-proof') return

  document.title = 'DSG Encoding Proof Gate — Verify QUBO / Ising Encodings'
  let description = document.querySelector('meta[name="description"]')
  if (!description) {
    description = document.createElement('meta')
    description.name = 'description'
    document.head.appendChild(description)
  }
  description.content = 'Deterministic validation for finite QUBO and Ising encodings with PASS, REVIEW, or BLOCK evidence.'

  const style = document.createElement('style')
  style.setAttribute('data-dsg', 'encoding-proof-v1')
  style.textContent = `
    :root{color-scheme:dark}
    html,body{margin:0;background:#071014;color:#f4fbf8;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    body{min-height:100vh}*{box-sizing:border-box}
    .dsg-page{min-height:100vh;background:linear-gradient(180deg,#071014 0%,#09161b 50%,#061013 100%);padding:clamp(28px,6vw,84px) clamp(18px,5vw,72px)}
    .dsg-shell{max-width:1120px;margin:0 auto}
    .dsg-badge{display:inline-flex;align-items:center;border:1px solid rgba(103,232,190,.28);background:rgba(34,197,94,.07);color:#9af0cf;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
    .dsg-h1{font-size:clamp(42px,8vw,82px);line-height:.98;letter-spacing:-.055em;margin:26px 0 20px;max-width:920px}
    .dsg-lead{font-size:clamp(18px,2.4vw,24px);line-height:1.55;color:#b9cbc6;max-width:790px;margin:0}
    .dsg-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px;align-items:center}
    .dsg-cta{display:inline-flex;align-items:center;justify-content:center;padding:15px 22px;border-radius:14px;text-decoration:none;background:#6ee7b7;color:#06251c;font-weight:850;font-size:16px;box-shadow:0 12px 40px rgba(52,211,153,.18)}
    .dsg-note{color:#8ea39d;font-size:14px}
    .dsg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:54px}
    .dsg-card{padding:22px;border-radius:18px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);min-height:150px}
    .dsg-card h3{font-size:15px;margin:0 0 9px;color:#dff8ef}.dsg-card p{color:#9fb4ae;line-height:1.6;font-size:15px;margin:0}
    .dsg-section{margin-top:72px;padding-top:28px;border-top:1px solid rgba(255,255,255,.08)}
    .dsg-section h2{font-size:clamp(28px,4vw,42px);letter-spacing:-.035em;margin:0 0 18px}
    .dsg-steps{display:grid;gap:10px;margin-top:24px}.dsg-step{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:15px 0}
    .dsg-num{width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(110,231,183,.1);border:1px solid rgba(110,231,183,.24);color:#8df0cb;font-weight:850}
    .dsg-step strong{display:block;margin-bottom:5px}.dsg-step span{color:#9fb4ae;line-height:1.55}
    .dsg-price{margin-top:72px;padding:clamp(24px,5vw,48px);border-radius:26px;border:1px solid rgba(110,231,183,.22);background:linear-gradient(135deg,rgba(16,185,129,.12),rgba(255,255,255,.035))}
    .dsg-price-row{display:flex;flex-wrap:wrap;gap:16px;align-items:baseline}.dsg-amount{font-size:clamp(42px,7vw,68px);font-weight:900;letter-spacing:-.05em}.dsg-per{color:#9fb4ae;font-size:17px}
    .dsg-price p{font-size:17px;line-height:1.55;color:#b9cbc6;max-width:760px}
    .dsg-boundary{margin-top:26px;padding:18px;border-radius:16px;background:rgba(245,158,11,.07);border:1px solid rgba(245,158,11,.18);color:#d7cab0;line-height:1.62;font-size:14px}
    .dsg-footer{margin-top:54px;color:#70877f;font-size:13px;line-height:1.6}
    @media(max-width:560px){.dsg-actions{align-items:stretch}.dsg-cta{width:100%}.dsg-note{width:100%;text-align:center}}
  `
  document.head.appendChild(style)

  document.body.innerHTML = `
    <main class="dsg-page" data-dsg-page="encoding-proof-v1">
      <div class="dsg-shell">
        <span class="dsg-badge">DSG ONE · Deterministic Proof Gate</span>
        <h1 class="dsg-h1">Verify the encoding before you trust the optimum.</h1>
        <p class="dsg-lead">DSG Encoding Proof Gate validates finite QUBO and Ising encodings before optimization or execution, returning a deterministic PASS / REVIEW / BLOCK decision with a proof ID and encoding hash.</p>
        <div class="dsg-actions"><a class="dsg-cta" href="${checkout}">Start Pro · 14-day trial</a><span class="dsg-note">$99/month after trial · existing DSG billing</span></div>

        <section class="dsg-grid" aria-label="Encoding Proof capabilities">
          <article class="dsg-card"><h3>Structure validation</h3><p>Checks encoding type, finite variable structure, bounds, coefficient format, and consistency.</p></article>
          <article class="dsg-card"><h3>Deterministic evidence</h3><p>Returns a stable proof identifier and encoding hash suitable for audit and replay workflows.</p></article>
          <article class="dsg-card"><h3>Governed access</h3><p>Authenticated, metered, rate-limited, and connected to the existing DSG entitlement ledger.</p></article>
          <article class="dsg-card"><h3>Fail-closed result</h3><p>Invalid or unsupported conditions do not get silently promoted to PASS.</p></article>
        </section>

        <section class="dsg-section">
          <h2>One verified flow</h2>
          <div class="dsg-steps">
            <div class="dsg-step"><div class="dsg-num">1</div><div><strong>Submit</strong><span>Send a QUBO or Ising encoding through the authenticated DSG API.</span></div></div>
            <div class="dsg-step"><div class="dsg-num">2</div><div><strong>Gate</strong><span>DSG checks entitlement, quota, request limits, and encoding structure.</span></div></div>
            <div class="dsg-step"><div class="dsg-num">3</div><div><strong>Prove</strong><span>The deterministic proof engine produces PASS / REVIEW / BLOCK plus evidence hashes.</span></div></div>
            <div class="dsg-step"><div class="dsg-num">4</div><div><strong>Audit</strong><span>Usage and proof evidence are written into the existing DSG metering and audit pipeline.</span></div></div>
          </div>
        </section>

        <section class="dsg-price">
          <span class="dsg-badge">Pro</span>
          <div class="dsg-price-row"><div class="dsg-amount">$99</div><div class="dsg-per">/ month · 14-day trial</div></div>
          <p>Uses the existing DSG Pro subscription and entitlement pipeline. No separate billing account or duplicate product path.</p>
          <div class="dsg-actions"><a class="dsg-cta" href="${checkout}">Start with Encoding Proof</a></div>
          <div class="dsg-boundary"><strong>Proof boundary:</strong> Encoding Proof validates the encoded finite QUBO/Ising model. It does not by itself prove that an original natural-language problem was formalized semantically correctly, and it is not a claim that quantum hardware was used.</div>
        </section>

        <footer class="dsg-footer">DSG ONE · Framer frontend → DSG Control Plane on Render → Stripe entitlement → deterministic proof evidence.</footer>
      </div>
    </main>`
}

const browserCode = `(${renderEncodingProof.toString()})(${JSON.stringify(checkoutUrl)});`
const customHtml = `<script ${MARKER}>${browserCode}</script>`

let framer
try {
  framer = await connect(projectUrl, apiKey)

  const changed = await framer.getChangedPaths()
  const unpublished = typeof framer.getUnpublishedPageChanges === 'function'
    ? await framer.getUnpublishedPageChanges()
    : []
  const pageExists = changed.added.includes('/encoding-proof') ||
    changed.modified.includes('/encoding-proof') ||
    unpublished.some(change => change.path === '/encoding-proof')

  if (!pageExists) {
    throw new Error(`encoding_proof_page_change_missing:${JSON.stringify(changed)}`)
  }

  const before = await framer.getCustomCode()
  const bodyEnd = before?.bodyEnd
  if (bodyEnd?.disabled) {
    throw new Error('framer_body_end_custom_code_disabled')
  }
  if (bodyEnd?.html && !String(bodyEnd.html).includes(MARKER)) {
    throw new Error('framer_body_end_custom_code_conflict')
  }

  await framer.setCustomCode({ html: customHtml, location: 'bodyEnd' })

  const after = await framer.getCustomCode()
  if (!after?.bodyEnd?.html || !String(after.bodyEnd.html).includes(MARKER)) {
    throw new Error('framer_custom_code_verification_failed')
  }
  if (after.bodyEnd.disabled) {
    throw new Error('framer_custom_code_disabled_after_set')
  }

  const published = await framer.publish()
  const hosts = await framer.deploy(published.deployment.id)
  const publishInfo = await framer.getPublishInfo()

  console.log('FRAMER_ENCODING_PAGE_DEPLOYED', JSON.stringify({
    ok: true,
    changedBeforePublish: changed,
    deploymentId: published.deployment.id,
    previewHostnames: published.hostnames,
    hosts,
    publishInfo,
    customCode: { bodyEndInstalled: true, disabled: false },
  }))
} finally {
  if (framer) await framer.disconnect()
}
