# CORS snippet for next.config.js

Insert the following snippet inside your existing `next.config.js` config object (merge, do not overwrite if you already have headers configured):

```js
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app'
        },
        { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,POST,PUT,DELETE' },
        { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
      ],
    },
  ];
}
```

Note:

* Only add CORS if you plan to support external clients. Use `APP_URL` / `NEXT_PUBLIC_APP_URL` as the allow-origin.
* Keep explicit allowlist; do not use `*` in production.
