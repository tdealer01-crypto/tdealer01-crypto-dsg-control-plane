import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { connect } from "framer-api"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectUrl = process.env.FRAMER_PROJECT_URL
const apiKey = process.env.FRAMER_API_KEY
const deployProduction = process.env.FRAMER_DEPLOY_PRODUCTION === "1"
const checkoutUrl = process.env.DSG_ENCODING_PROOF_CHECKOUT_URL || "https://tdealer01-crypto-dsg-control-plane.vercel.app/framer/encoding-proof/checkout"
const docsUrl = process.env.DSG_ENCODING_PROOF_DOCS_URL || "https://tdealer01-crypto-dsg-control-plane.vercel.app/docs"

if (!projectUrl) throw new Error("Missing FRAMER_PROJECT_URL")
if (!apiKey) throw new Error("Missing FRAMER_API_KEY")

const source = await fs.readFile(path.join(__dirname, "EncodingProofProduct.tsx"), "utf8")
const framer = await connect(projectUrl, apiKey)

try {
  const info = await framer.getProjectInfo()
  console.log(`[framer] project: ${info.name}`)

  let codeFile = await framer.getCodeFile("EncodingProofProduct.tsx")
  if (codeFile) {
    codeFile = await codeFile.setFileContent(source)
    console.log("[framer] updated EncodingProofProduct.tsx")
  } else {
    codeFile = await framer.createCodeFile("EncodingProofProduct.tsx", source)
    console.log("[framer] created EncodingProofProduct.tsx")
  }

  const diagnostics = await codeFile.typecheck()
  if (Array.isArray(diagnostics) && diagnostics.length > 0) {
    console.log("[framer] typecheck diagnostics:", diagnostics)
  }

  const componentExport = codeFile.exports.find((item) => item.type === "component" && item.isDefaultExport)
  if (!componentExport?.insertURL) {
    throw new Error("Framer did not expose an insertURL for EncodingProofProduct")
  }

  const pages = await framer.getNodesWithType("WebPageNode")
  let page = pages.find((node) => node.path === "/encoding-proof")
  if (!page) {
    page = await framer.createWebPage("/encoding-proof")
    console.log("[framer] created /encoding-proof")
  }

  await page.select()
  const instances = await page.getNodesWithType("ComponentInstanceNode")
  const existing = instances.find((node) => node.componentName === "EncodingProofProduct")
  const controls = { checkoutUrl, docsUrl, priceLabel: "$99 / month" }

  if (existing) {
    await existing.setAttributes({ controls, width: "1200px", height: "1100px" })
    console.log("[framer] updated EncodingProofProduct instance")
  } else {
    await framer.addComponentInstance({
      url: componentExport.insertURL,
      attributes: { width: "1200px", height: "1100px", controls },
    })
    console.log("[framer] inserted EncodingProofProduct instance")
  }

  const changed = await framer.getChangedPaths()
  console.log("[framer] changed paths:", changed)

  const published = await framer.publish()
  console.log("[framer] preview deployment:", published.deployment.id)

  if (deployProduction) {
    await framer.deploy(published.deployment.id)
    console.log("[framer] promoted deployment to production")
  } else {
    console.log("[framer] production deploy skipped (set FRAMER_DEPLOY_PRODUCTION=1 after DSG release gates are green)")
  }
} finally {
  await framer.disconnect()
}
