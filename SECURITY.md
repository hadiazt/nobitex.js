# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Use
[GitHub private vulnerability reporting](https://github.com/hadiazt/nobitex.js/security/advisories/new)
instead. You will receive a response within a few days.

Never include real tokens, API keys, private keys or account details in reports, issues or pull
requests. If you exposed a Nobitex token, log out (which revokes it) or delete the API key in the
Nobitex panel immediately.

## Supported versions

Only the latest `1.x` release receives security fixes.

## Handling credentials with this SDK

- Load credentials from the environment or a secret manager (`NobitexClient.fromEnv()`); never
  commit them. `.env` files are git-ignored.
- Prefer API keys over tokens: grant only the permissions you need (`READ`, `TRADE`, `WITHDRAW`),
  restrict them to your server's IP addresses and set an expiry date.
- For high-value accounts, keep the Ed25519 private key in a KMS/HSM and pass a custom `sign`
  function instead of the raw key.
- The SDK stores credentials in private class fields; they are never included in errors, hooks,
  `JSON.stringify` or `console.log` output.
