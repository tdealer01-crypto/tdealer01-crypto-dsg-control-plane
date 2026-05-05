#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const secret = process.env.DSG_CALLBACK_SECRET;
const callbackUrl = process.env.DSG_BUILD_PROOF_CALLBACK_URL;

if (!secret) throw new Error('DSG_CALLBACK_SECRET_REQUIRED');
if (!callbackUrl) throw new Error('DSG_BUILD_PROOF_CALLBACK_URL_REQUIRED');

const rawBody = await readFile('.dsg-build-proof/build-proof.json', 'utf8');
const signature = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

const response = await fetch(callbackUrl, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-dsg-signature': signature,
  },
  body: rawBody,
});

if (!response.ok) {
  const text = await response.text();
  throw new Error(`DSG_BUILD_PROOF_CALLBACK_FAILED_${response.status}:${text}`);
}

console.log('DSG build proof callback uploaded.');
