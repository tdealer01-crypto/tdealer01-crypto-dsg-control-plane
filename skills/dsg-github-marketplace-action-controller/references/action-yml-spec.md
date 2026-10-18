# action.yml review checklist

This checklist supports static packaging review. It is not an executable integration or a promise that a DSG gate exists.

Check that:

- The action has a clear name and description.
- Inputs and outputs are documented, typed, and used consistently.
- The runtime and entrypoint match files present in the package.
- The action does not print credentials or sensitive payloads.
- Workflow permissions follow least privilege.
- External actions and dependencies follow repository pinning policy.
- The distribution artifact is built and committed when required by the selected runtime.
- Tests validate the actual package on the proposed commit.

Do not add an endpoint or secret input unless a separately deployed service, authentication method, and user-authorized integration are documented and verified. Do not use an example URL or secret name as evidence of configuration.
