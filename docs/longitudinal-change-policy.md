# Longitudinal Personal Change Policy

Related issue: #144

`src/lib/longitudinal-change.ts` compares one already-separated training
metric with its own historical samples. It uses a median baseline and a
median-absolute-deviation scale with a reviewed, metric-specific floor.

The contract requires at least three finite baseline samples and three finite
current samples. It returns `insufficient_data` otherwise. Accuracy and speed
must be passed separately; callers must not pool modules, versions,
difficulties, or metric units.

`normalizedChange` and `uncertainty` are descriptive statistical projections.
They do not measure ability, intelligence, health, diagnosis, effort, or
clinical outcome. A later projection integration requires reviewed strata,
quality, threshold, and version governance.
