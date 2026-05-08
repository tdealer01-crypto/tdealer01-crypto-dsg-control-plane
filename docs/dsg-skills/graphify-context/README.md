# DSG Graphify Context Skill

## Purpose

Create a repo/context graph before planning or execution.

This skill helps the studio avoid guessing by turning files, routes, components, APIs, claims, and evidence into a structured graph.

## Use cases

- Inspect repo structure before changing code.
- Map routes to components and API endpoints.
- Separate facts from inferred claims.
- Attach evidence IDs to plan and execution stages.
- Detect missing proof before allowing production claims.

## Context graph pipeline

```txt
scan files
classify nodes
classify edges
attach evidence
list claims
mark missing proof
feed plan pane
```

## Node examples

- route
- component
- API endpoint
- runtime service
- database migration
- evidence artifact
- claim

## Truth boundary

A graph node is not proof by itself. It must reference real files, API responses, logs, screenshots, or visible UI state before being used as evidence.
