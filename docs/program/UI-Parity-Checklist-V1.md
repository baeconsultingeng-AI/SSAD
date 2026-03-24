# UI Parity Checklist - Version 1 (BS-Only)

Use this checklist at each migration increment to ensure no visible UI drift from the Claude-designed baseline.

## A. Global Checks

1. Fonts, color palette, and spacing are unchanged.
2. Screen transition behavior is unchanged.
3. Desktop, tablet, and mobile responsive behavior is unchanged.
4. Bottom/side navigation behavior is unchanged where applicable.

## B. Screen Checks

1. Workspace
- Agent cards present and behavior unchanged.
- Recent calculations area behavior unchanged.

2. AI Chat
- Phase stepper behavior preserved.
- Prompt suggestion panel behavior preserved.
- Confirm and design progression preserved.

3. Results
- Verdict header and metric cards unchanged.
- Compliance checks rendering unchanged.

4. Report
- Letterhead and sections structure unchanged.
- Export/save action behavior unchanged.

5. Detailing
- Drawing rendering and labels unchanged.
- Detailing PDF action behavior unchanged.

6. Projects
- Project grouping and calc item listing behavior unchanged.
- Create/select/delete behaviors unchanged.

7. Settings
- Settings sections and interactions unchanged.

8. Upgrade
- Plan status and comparison behavior unchanged.

9. Auth
- Register/login tabs and validation behavior unchanged.

## C. Critical Workflow Checks

1. Auth -> Workspace entry flow works.
2. Workspace -> AI -> Confirm -> Calculate -> Result works.
3. Result -> Report -> Detailing works.
4. Save output -> Projects retrieval works.
5. Locked sub-type -> Upgrade flow works.

## D. Deterministic Boundary Checks

1. AI extraction does not replace deterministic calculation authority.
2. Calculation result displayed in UI is sourced from deterministic engine path.
3. Reporting uses deterministic calculation output values.

## E. Regression Evidence Required

For each migration increment, capture:

1. Before and after screenshots for key screens on desktop/tablet/mobile.
2. Short pass/fail note for each section in this checklist.
3. Defect list for any parity drift with remediation owner.
