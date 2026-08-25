# Integration Ops Notes

## Microsoft 365 Email And Calendar Static Egress

Harriett uses Fixie HTTP/HTTPS proxy egress for Microsoft 365 email and calendar tenant connections when an IT team requires IP allowlisting.

Current Fixie outbound IPs:

```text
52.87.82.133
52.5.155.132
```

Proxy details:

- Proxy type: HTTP/HTTPS
- Region: US East
- Initial plan: tricycle, suitable for testing only
- Production note: use a paid low-volume plan before relying on this for pilot or production traffic

Security note: do not share or commit the Fixie proxy URL, username, password, or token. Only the outbound IP addresses should be shared with a tenant IT team.
