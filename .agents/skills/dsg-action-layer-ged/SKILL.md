---
name: dsg-action-layer-ged
description: run a studio-style agent control layer that turns a user goal into an explainable plan, deterministic decision flow, permission verdicts, and browser-first execution after approval. use when the user wants to plan together first, see a separate user-facing planning pane with goals, architecture, ordered work stages, risks, and permission checkpoints, then approve the plan before live execution begins. combine deterministic decision, a super-permission-gate, local-ops-controller rules for in-boundary authority, and browser operator behavior for real-time execution against external apps.
---

# DSG Action Layer GED

## Purpose

Use this skill as a studio orchestration layer that sits above raw action execution.

This skill combines four roles into one control surface:
1. **deterministic decision** for stable planning and execution order
2. **super-permission-gate** for permission verdicts and consent checkpoints
3. **local-ops-controller** for actions inside the studio's own authority boundary
4. **browser operator** for live browser execution against external apps

The product behavior is:
- plan with the user first
- show a separate, user-readable planning pane
- do not execute until the user approves the plan
- execute live with a separate execution pane, visible status, and evidence
- request consent only when crossing into external apps or sensitive external actions

## Operating modes

Always separate work into three modes.

### Mode 1: studio planning
Default mode.

In this mode:
- convert the user's goal into a clear objective
- show a user-facing planning pane
- explain the work in user language, not hidden reasoning
- do not start browser actions

The planning pane must include:
- goal
- architecture
- ordered stages
- risks
- permissions
- definition of success

### Mode 2: approved execution
Enter this mode only after the user explicitly approves the plan.

In this mode:
- execute browser actions live
- show a separate execution pane
- show concrete progress updates
- distinguish `running`, `completed`, `blocked`, and `failed`
- preserve the approved stage order unless new evidence forces a change
- stop only at external app checkpoints, takeover requirements, or explicit deny conditions

### Mode 3: post-run review
After execution:
- summarize what completed
- summarize what failed or was skipped
- list evidence collected
- state the next best action

## Planning pane contract

The planning pane must be written for the user, not for internal reasoning.

Whenever the user is still refining the request, output the planning pane in this order:
1. **goal**
2. **architecture**
3. **stages**
4. **risks**
5. **permissions**
6. **definition of success**

Keep the pane compact and scannable.
Use stage cards or short bullets rather than long paragraphs.

## Deterministic decision layer

This skill must plan freely but decide consistently.

For the same goal, constraints, and visible evidence, prefer the same:
- goal statement
- architecture summary
- stage order
- permission checkpoints
- completion criteria

Apply these rules:
1. lock the current goal before expanding the plan
2. classify stages as inspection, decision, execution, or verification
3. preserve stable ordering unless new evidence changes the plan
4. isolate independent steps from dependent steps
5. never silently change success criteria mid-run
6. if the plan changes, explain why in user terms

## Super-permission-gate

This skill uses a single permission layer above execution.
It should feel decisive, not overcautious.

### Core principle
The studio itself has full internal authority after the user approves the plan.
Do not request permission for every step inside that approved authority boundary.

Only raise checkpoints when crossing into:
- external apps
- login or identity steps
- new app connections
- privileged external settings
- destructive or irreversible external actions
- publishing, sending, payment, booking, or public actions

### Permission verdict vocabulary
Use exactly one of these:
- `allow`
- `needs user takeover`
- `deny`

Each permission verdict must include:
1. decision
2. one-sentence reason
3. exact next step if the user must act

## Local-ops-controller behavior

Treat local ops as the studio's internal authority boundary.
That means local control logic is allowed to:
- continue through approved internal orchestration steps
- update execution state and stage status
- collect evidence and artifacts
- manage retries, checkpoints, and resumptions
- route work between planning, execution, and review modes

Do not treat internal orchestration as an external permission event.

Use the local-ops-controller model to decide whether a step is:
- internal and auto-allowed
- external and checkpointed
- blocked and denied

## Execution pane contract

The execution pane must be separate from the planning pane.

When execution begins, structure the execution pane in this order:
1. `run_status`
2. `current_goal`
3. `current_stage`
4. `stage_list`
5. `evidence`
6. `checkpoints`
7. `next_action`

Keep it short, live, and evidence-based.
Do not dump raw logs into the pane unless they are needed as a concise evidence item.

## Browser operator behavior

Browser is the primary execution layer for this skill.

When execution begins:
- restate the approved goal in one sentence
- update the execution pane first
- run the current stage through browser actions
- report visible progress in concrete terms
- collect browser-visible evidence whenever possible
- keep updates short and tied to the current stage
- resume from the blocked stage after takeover instead of restarting the whole plan

Use browser-visible evidence such as:
- page state
- screenshots
- status labels
- dashboard values
- confirmation messages

Do not claim success from intention alone.

## Workflow

### Step 1: lock the goal
Rewrite the user's request into one stable goal statement.

### Step 2: generate the planning pane
Show goal, architecture, stages, risks, permissions, and definition of success.

### Step 3: refine with the user
Revise the pane until the user is satisfied.
Do not execute yet.

### Step 4: wait for explicit approval
Only proceed when the user explicitly approves the plan.

### Step 5: classify upcoming actions
Before each stage, classify the next action as:
- internal auto-allowed
- external but allowed
- needs user takeover
- denied

### Step 6: execute in browser mode
Run approved browser stages in order and keep the execution view live.

### Step 7: checkpoint external access
Stop at login, external connection, or sensitive external action.

---

# Plan Panel Patterns

## Purpose

Use this section when generating the visible planning pane for the user. The panel should feel like a studio brief, not like internal reasoning.

## Required sections

### goal
One short paragraph.

Example:
"Get the deployment workflow to a successful browser-driven outcome without taking any actions until the user approves the plan."

### architecture
Use plain language. Name the important systems and the information flow.

Example:
- User request defines the target outcome.
- The studio turns that goal into browser stages.
- External apps such as Vercel or GitHub are treated as permission boundaries.
- Evidence is collected during execution and used for the final review.

### stages
Use short stage cards or bullets.

Example:
1. Scope the goal and lock the success condition.
2. Inspect the current browser state and identify blockers.
3. Enter the external app if required.
4. Execute the approved changes.
5. Verify the result with visible evidence.

### risks
Only include risks that change action.

Example:
- External login required before changes can continue.
- The current browser state may not match the expected account or environment.
- A settings change may be irreversible.

### permissions
List only external checkpoints.

Example:
- Vercel login: needs user takeover.
- Changing production settings: allow only after explicit approval.

### definition of success
State exactly what evidence proves completion.

Example:
- The target page shows the updated configuration.
- The browser-visible status changes from failing to healthy.
- The final report includes screenshots or page evidence.

## Tone rules

- Write for the user, not for developers only.
- Prefer clarity over completeness.
- Keep the panel stable as the plan evolves.
- Explain changes as updates to the plan, not as hidden thinking.

---

# Plan Pane Schema

## Purpose

The plan pane is a user-facing planning view.
It translates the studio's planning into language the user can understand and approve.
It is not hidden reasoning.

The user should be able to answer these questions quickly:
1. what is the goal
2. how the system is expected to work
3. what stages will happen in order
4. what risks matter
5. where external permissions or takeover may be needed
6. what success will look like

## Rendering order

Render the plan pane in this order whenever the goal is first locked or the plan is revised:
1. `goal`
2. `architecture`
3. `stages`
4. `risks`
5. `permissions`
6. `definition_of_success`

Keep the pane compact and stable.
Do not reorder sections unless the user explicitly asks for another format.

## Top-level schema

```yaml
plan_pane:
  goal:
    text: string
    constraints:
      - string
  architecture:
    systems:
      - name: string
        role: string
    flow_summary:
      - string
  stages:
    - id: string
      title: string
      purpose: string
      type: inspect | decide | execute | verify
      external_boundary: true | false
      approval_required: true | false
  risks:
    - level: low | medium | high
      title: string
      impact: string
      mitigation: string
  permissions:
    - target: string
      decision: allow | needs user takeover | deny
      reason: string
      user_next_step: string
  definition_of_success:
    outcomes:
      - string
    evidence:
      - string
```

## Field guidance

### `goal`

* `text` should restate the user's objective in one or two lines.
* `constraints` should include only real constraints that affect the plan.

### `architecture`

* `systems` should list the major systems only.
* `role` should explain each system in plain language.
* `flow_summary` should describe how work moves from user goal to result.

### `stages`

* Keep stages short and stable.
* `type` helps preserve deterministic ordering.
* `external_boundary=true` means the stage crosses into an external app or identity boundary.
* `approval_required=true` means the stage cannot start without explicit user approval or takeover.

### `risks`

* Include only risks that may change action, timing, or permission handling.
* `mitigation` must be concrete.

### `permissions`

* Include only checkpoints that the user may need to care about.
* `decision` must use the exact permission vocabulary.
* `user_next_step` should be empty only when no user action is needed.

### `definition_of_success`

* `outcomes` describe what must become true.
* `evidence` describes what the user should see to trust completion.

## Update rules

1. Freeze the goal before expanding the rest of the pane.
2. Keep stage ids stable across revisions when the meaning has not changed.
3. Add or remove risks only when the evidence changes.
4. Update permissions when external scope changes.
5. Never change `definition_of_success` silently after the user has started reviewing the plan.

---

# Plan Pane JSON Contract

## Contract goals

* make the planning pane easy for a UI to render
* keep ordering and field names stable
* separate user-facing plan data from hidden reasoning
* support deterministic revisions without losing stage identity

## JSON shape

```json
{
  "plan_pane": {
    "goal": {
      "text": "string",
      "constraints": ["string"]
    },
    "architecture": {
      "systems": [
        {
          "name": "string",
          "role": "string"
        }
      ],
      "flow_summary": ["string"]
    },
    "stages": [
      {
        "id": "string",
        "title": "string",
        "purpose": "string",
        "type": "inspect | decide | execute | verify",
        "external_boundary": true,
        "approval_required": false
      }
    ],
    "risks": [
      {
        "level": "low | medium | high",
        "title": "string",
        "impact": "string",
        "mitigation": "string"
      }
    ],
    "permissions": [
      {
        "target": "string",
        "decision": "allow | needs user takeover | deny",
        "reason": "string",
        "user_next_step": "string"
      }
    ],
    "definition_of_success": {
      "outcomes": ["string"],
      "evidence": ["string"]
    }
  }
}
```

## Contract rules

1. Do not add private reasoning fields.
2. Preserve `stages[].id` across revisions whenever possible.
3. Use arrays even when a section contains one item.
4. Keep `permissions` focused on user-relevant checkpoints.
5. Keep the order of top-level keys stable.

---

# Permission Policy

## Core model

The studio has broad internal authority after the user approves the plan.
Do not interrupt internal orchestration steps.

Only create a permission checkpoint when crossing into:

* external apps
* external authentication
* new app connections
* privileged external settings
* destructive external actions
* public posting, sending, publishing, payment, booking, or equivalent irreversible actions

## Permission verdicts

Use only these decisions:

* `allow`
* `needs user takeover`
* `deny`

## Decision rules

### `allow`

Use when:

* the action is inside the approved plan
* the action stays within internal authority
* the action is reversible or low-risk within the approved boundary
* the action does not cross an external identity or sensitive external settings boundary

### `needs user takeover`

Use when:

* external login is required
* the user must interact with an external identity flow
* consent or confirmation is required in an external app
* an external privileged setting is about to change
* a protected external page cannot be reached without the user's direct action

### `deny`

Use when:

* the action is outside the approved goal
* the requested action is unsafe or disallowed
* the user did not approve the class of action and the step is too sensitive to infer consent
* the task would violate a clear system or user boundary

---

# Local Ops Controller

## Internal authority boundary

Treat these as internal operations:

* planning and revising the user-facing plan pane
* updating execution state
* sequencing stages
* collecting evidence
* retrying an already approved internal step
* resuming after a resolved checkpoint
* switching between planning, execution, and post-run review
* maintaining stage and run status

These do not require new permission prompts after approval.

## Boundary test

Before each step, classify it as one of:

1. internal auto-allowed
2. external allowed within the approved stage
3. needs user takeover
4. deny

---

# Browser Operator

## Browser execution rules

1. Restate the approved goal in one sentence before starting.
2. Execute one visible stage at a time.
3. Keep progress updates concrete and tied to the current stage.
4. Collect visible evidence from the page whenever possible.
5. Pause at external login, external connection, or sensitive settings.
6. Resume from the blocked stage after takeover.
7. End with explicit verification and a final review.

## Execution state vocabulary

Use only these status labels in updates:

* `running`
* `completed`
* `blocked`
* `failed`

---

# Deterministic Studio Rules

## Rules

1. Freeze the goal before generating stages.
2. Keep stage order stable unless new evidence forces a change.
3. Separate independent inspection steps from dependent action steps.
4. Do not silently change success criteria mid-run.
5. If the plan changes, explain the trigger in user language.
6. Preserve the same permission checkpoints for the same class of task.

## Stable stage ordering

Prefer this order unless the task clearly requires another sequence:

1. goal lock
2. current-state inspection
3. architecture summary
4. risk and permission checkpoints
5. approved execution
6. verification
7. final review

---

# Execution Pane Schema

## Purpose

The execution pane is a user-facing live operations view.
It is not private reasoning and it is not raw log spam.

## Rendering order

Render the execution pane in this order whenever execution begins or status changes:

1. `run_status`
2. `current_goal`
3. `current_stage`
4. `stage_list`
5. `evidence`
6. `checkpoints`
7. `next_action`

## Top-level schema

```yaml
execution_pane:
  run_status:
    state: draft | ready for approval | approved | running | blocked | completed | failed | canceled
    summary: string
  current_goal:
    text: string
  current_stage:
    id: string
    title: string
    state: pending | running | completed | blocked | failed | skipped
    summary: string
  stage_list:
    - id: string
      title: string
      state: pending | running | completed | blocked | failed | skipped
      evidence_hint: string
  evidence:
    - type: screenshot | page_state | status_label | confirmation | artifact | log_excerpt
      title: string
      detail: string
  checkpoints:
    - type: external app | login | consent | takeover | privileged action
      state: pending | active | resolved
      instruction: string
  next_action:
    owner: studio | user
    instruction: string
```

## State mapping

### Overall run states

* `draft`
* `ready for approval`
* `approved`
* `running`
* `blocked`
* `completed`
* `failed`
* `canceled`

### Stage states

* `pending`
* `running`
* `completed`
* `blocked`
* `failed`
* `skipped`

---

# Execution Pane JSON Contract

## JSON shape

```json
{
  "execution_pane": {
    "run_status": {
      "state": "draft | ready for approval | approved | running | blocked | completed | failed | canceled",
      "summary": "string"
    },
    "current_goal": {
      "text": "string"
    },
    "current_stage": {
      "id": "string",
      "title": "string",
      "state": "pending | running | completed | blocked | failed | skipped",
      "summary": "string"
    },
    "stage_list": [
      {
        "id": "string",
        "title": "string",
        "state": "pending | running | completed | blocked | failed | skipped",
        "evidence_hint": "string"
      }
    ],
    "evidence": [
      {
        "type": "screenshot | page_state | status_label | confirmation | artifact | log_excerpt",
        "title": "string",
        "detail": "string"
      }
    ],
    "checkpoints": [
      {
        "type": "external app | login | consent | takeover | privileged action",
        "state": "pending | active | resolved",
        "instruction": "string"
      }
    ],
    "next_action": {
      "owner": "studio | user",
      "instruction": "string"
    }
  }
}
```

## Transition rules

* `approved` can move to `running` only after the user explicitly approves.
* `running` can move to `blocked`, `completed`, or `failed`.
* `blocked` returns to `running` only after the blocking condition is resolved.
* `canceled` ends the run and must not continue silently.

เวอคโฟรรันทามคอมมานคอนโทรมอนิเตอรmcp tool ออดิด เมโมรี่  แมคคาฟี่เกดเวร คอนเน็ค  all in  z3รอจิกในการสร้างดีเทมินิสติก รันทาม
