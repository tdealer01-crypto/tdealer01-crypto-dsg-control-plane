#!/bin/bash

# DSG MCP Servers Build Script
# Builds all MCP servers for deployment

set -e

echo "🔨 Building DSG MCP Servers..."
echo "================================"

BUILD_DIR="build/mcp"
mkdir -p "$BUILD_DIR"

# Build Context Discovery
echo "📦 Building dsg-context-discovery..."
npm run mcp:build:context-discovery
echo "✅ dsg-context-discovery built"

# Build RCA Analyzer
echo "📦 Building dsg-rca-analyzer..."
npm run mcp:build:rca-analyzer
echo "✅ dsg-rca-analyzer built"

# Build GTM Pipeline
echo "📦 Building dsg-gtm-pipeline-server..."
npm run mcp:build:gtm-pipeline
echo "✅ dsg-gtm-pipeline-server built"

echo ""
echo "================================"
echo "✨ All MCP servers built successfully!"
echo ""
echo "Output directory: $BUILD_DIR"
ls -lh "$BUILD_DIR/"*
echo ""
echo "Next steps:"
echo "1. npm run build      # Build Next.js app"
echo "2. npm run test       # Run tests"
echo "3. npm run deploy:preview  # Deploy to Vercel"
