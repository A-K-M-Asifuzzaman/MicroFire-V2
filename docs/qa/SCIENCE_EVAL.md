# Science verification and future evaluation

P0 sample N=1: B20 in NASA NTRS 20210011385. PDF hash matched upstream; physical page 112/printed page 104 visually reviewed. Automated source-cell trace checks calibrated oxygen, observation text, locator, missing pressure and raw flow. Negative checks reject missing/dangling citations, invalid oxygen, fictional observations, duplicate passport entries and direct lunar extrapolation. This is an agent-audited fixture, not independent scientific validation.

No retrieval Recall@k/MRR, answer support rate, participant comprehension or impact metric is reported: ranking/AI and a gold set do not exist yet.

P1 evaluation design: freeze independent reviewer-labelled questions and expected records before tuning. Include exact lookup, flow/oxygen mismatches, multi-factor confounding, missing pressure, out-of-corpus lunar queries and adversarial source instructions. Baseline rank = documented weighted matched-condition relevance with explicit missing/mismatch terms; select weights only with stated rationale and separate tuning/evaluation sets. Report corpus version, n, query labels, Recall@k, MRR, supported-citation count, false promotions and abstentions including failure examples. Data completeness must not act as scientific certainty. Public metrics require reproducible outputs and human review of entailment.
