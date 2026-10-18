# GitHub Action GO / NO-GO review

| Check | GO evidence | Otherwise |
|---|---|---|
| Package structure | Manifest and entrypoint match the files in the commit | NO-GO |
| Permissions | Workflow permissions are explicit and least-privilege | NO-GO |
| Secret handling | No credentials leak through source, logs, outputs, or artifacts | NO-GO |
| Tests | Relevant checks completed on the exact commit | UNVERIFIED if not run |
| Governance service | Actual configured service and decision evidence are available | UNVERIFIED if absent |
| Approval | Required reviewer approval is recorded by the responsible system | UNVERIFIED if absent |

A static example, green local lint, or drafted workflow does not prove a remote gate or provider execution. Do not translate missing or unsupported evidence into GO.
