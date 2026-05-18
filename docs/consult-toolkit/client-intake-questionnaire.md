# Client Intake Questionnaire

Purpose: collect enough information to scope an AI governance readiness assessment and identify where DSG can provide deterministic action governance and audit evidence.

Boundary: this questionnaire is for discovery and readiness planning. It is not legal advice or certification evidence by itself.

## 1. Organization context

| Question | Answer |
|---|---|
| Organization name |  |
| Industry |  |
| Primary contact |  |
| Security/compliance owner |  |
| AI/product owner |  |
| Regulated environment? |  |
| Relevant frameworks | ISO/IEC 42001, NIST AI RMF, internal policy, other |

## 2. AI workflow scope

| Question | Answer |
|---|---|
| What AI systems or agents are in scope? |  |
| What business systems can they affect? |  |
| What tools/APIs can they call? |  |
| Are actions currently logged? |  |
| Are actions currently approved before execution? |  |
| Who can override or approve high-risk actions? |  |

## 3. Action risk

| Question | Answer |
|---|---|
| Can the AI action change customer data? |  |
| Can the AI action move money or trigger payment? |  |
| Can the AI action send email or external communication? |  |
| Can the AI action deploy software? |  |
| Can the AI action call internal admin APIs? |  |
| Can the AI action access sensitive data? |  |

## 4. Evidence and audit needs

| Question | Answer |
|---|---|
| What evidence is needed for review? |  |
| Who reviews AI action logs? |  |
| How long must evidence be retained? |  |
| Is JSON export enough? |  |
| Is PDF reporting required? |  |
| Is signed evidence required? |  |

## 5. DSG pilot fit

| Question | Answer |
|---|---|
| Preferred pilot workflow |  |
| Gateway Mode or Monitor Mode? |  |
| Customer must keep API keys? |  |
| Required approval path |  |
| Required audit export format |  |
| Success criteria |  |

## Recommended next step

Select one controlled workflow for a pilot:

```text
AI action proposal
→ DSG plan-check
→ allow/block/review decision
→ customer execution or DSG Gateway execution
→ audit commit
→ evidence export
```
