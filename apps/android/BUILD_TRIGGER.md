# Android Agent build trigger

This file intentionally lives under `apps/android/**` so the existing Android Agent workflow runs for the `dsg/hermes-nous-owner-full-apk` branch/PR.

Requested build target:

```text
DSG Android APK
→ local Hermes runtime sandbox plan
→ Nous / model provider
→ DSG Gate
→ Android Owner Executor
```

This commit does not claim the Hermes runtime is implemented yet; it only triggers the current Android debug APK build workflow for the existing APK baseline.
