# Calc V1 Contract Cases (Draft)

## Required request validation

1. Missing requestId returns VALIDATION_ERROR.
2. Missing module returns VALIDATION_ERROR.
3. Missing code returns VALIDATION_ERROR.
4. Missing version returns VALIDATION_ERROR.
5. Missing inputs returns VALIDATION_ERROR.

## Success envelope baseline

1. status=ok present.
2. requestId echoes input.
3. module/code/version echo input.
4. results/checks/steps/warnings/reportPayload/detailingPayload present.
