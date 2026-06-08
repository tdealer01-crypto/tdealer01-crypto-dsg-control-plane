# DSG Safe DOM Mirror IP and License Strategy

## Purpose

This document defines how DSG Safe DOM Mirror can be shared for review and adoption without giving away unrestricted commercial rights.

This is not legal advice. It is an engineering and product strategy note that must be reviewed by a qualified lawyer before final publication.

## Decision

DSG Safe DOM Mirror should not be described as open source if the business goal is:

```text
Let people inspect, test, and contribute.
Do not allow resale, hosted competing services, or commercial production use without permission.
```

That goal is better described as:

```text
source-available + commercial license
```

## Why not default open source

Open-source licenses generally allow use, modification, distribution, and commercial use under the license terms. That is useful for adoption, but it does not match the goal of preventing others from building a competing hosted service from the same code.

## Recommended model

```text
DSG Safe DOM Mirror reference design     -> source-available
DSG Safe DOM Mirror demo executor        -> source-available
DSG Cloud / Enterprise control plane     -> commercial / proprietary
DSG brand, name, logo                    -> trademark reserved
Enterprise policies and hosted services  -> commercial license only
```

## What others may do

Allowed under a DSG source-available license:

- Read the source.
- Study the design.
- Run local demos.
- Test non-production use.
- Submit pull requests.
- Build internal proofs of concept.

## What requires commercial permission

Commercial license required for:

- Production commercial use.
- Hosted/SaaS use for third parties.
- Resale.
- White-labeling.
- Competing managed service.
- Enterprise deployment for customers.
- Removing or hiding copyright / license notices.
- Using DSG name, logo, or marks as if endorsed.

## License files to add later

Proposed files for a future licensing PR:

```text
LICENSE
COMMERCIAL_LICENSE.md
TRADEMARK.md
NOTICE
SECURITY.md
CONTRIBUTING.md
```

## Suggested README wording

```text
DSG Safe DOM Mirror is source-available, not open source.
You may inspect, test, and contribute to the code.
Commercial production use, resale, hosted competing services, and white-labeling require a DSG commercial license.
The DSG name, logo, and marks are reserved.
```

## Suggested header

```text
Copyright (c) 2026 Thanawat Suparongsuwan / DSG.
Source-available under the DSG Source Available License.
Commercial production use requires a separate DSG commercial license.
```

## Risk if no license is defined

Without explicit license terms:

- Users may not know what they can legally do.
- Contributors may be unclear about rights assignment.
- Commercial misuse is harder to challenge cleanly.
- Brand misuse is easier.
- The project may look less enterprise-ready.

## Enforcement reality

A license does not physically prevent copying. It creates a legal and operational enforcement basis.

Possible enforcement actions when misuse is found:

- Ask for compliance.
- Send cease-and-desist notice.
- File marketplace or hosting takedown where appropriate.
- Enforce trademark policy for brand misuse.
- Require commercial license for production use.

## DSG recommendation

For Safe DOM Mirror:

```text
Use source-available terms for reference code.
Keep hosted DSG control plane proprietary.
Reserve DSG trademark and brand.
Offer commercial license for production and enterprise use.
```

## Truth boundary

Do not claim:

```text
Open source prevents others from using the design.
```

Correct statement:

```text
A source-available commercial license can allow inspection and testing while restricting production commercial use, resale, and hosted competing services.
```
