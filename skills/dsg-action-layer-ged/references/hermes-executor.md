# Hermes executor: design reference only

This file is retained as a historical design note. No Hermes executor, credential broker, or hosted execution path is included or activated by this plugin.

Do not invoke a presumed Hermes tool, claim credential leasing, or ask the user to provide secrets. Do not treat diagrams or examples from older revisions as an implementation contract.

For a real action, use only an explicitly configured provider tool whose route and permission are visible in the current session. Follow its documented discovery, payload binding, approval, execution, and verification steps. If no such tool is available, return a plan and mark execution UNVERIFIED.

The approved architecture boundary is documented in docs/architecture/dsg-os-spacetime-boundary.md: Spacetime owns execution and governance; DSG OS provides the user-facing workspace and local verification surface.
