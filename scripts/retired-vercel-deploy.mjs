#!/usr/bin/env node

console.error('BLOCK: Vercel deployment is retired. DSG production authority is governed Azure App Service + ACR.');
console.error('A forward Azure deployment must present a persisted Control Plane ALLOW receipt and bind the exact approved SHA/image digest.');
process.exitCode = 1;
