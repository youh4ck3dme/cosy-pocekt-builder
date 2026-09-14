# Security findings

## GitGuardian generic-password finding

GitGuardian incident `37242986` points to historical commit `c90b1f7f` and
`src/lib/wordpress-validation.server.ts`. The flagged code validates that a
WordPress URL does not contain credentials; it does not contain a credential
value or use a secret. The current implementation reconstructs the URL from
protocol, host, path, and query, explicitly dropping username and password.

This is documented as a false positive. No secret rotation is required for
this finding, and history is not rewritten. If the repository owner confirms a
credential was ever exposed in the flagged history, rotate it first and handle
history remediation as a separate, explicitly approved operation.
