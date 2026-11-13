# Fresh-context security reviewer findings

Reviewer: /root/security_review, one separate-context internal Security Review agent. No implementation-chat context was inherited. This is not external Astra approval.

Reviewed faecf92b18528a18486d2106c050130e95e4bc0c against d324ff0. No code changes made.

| Severity | Location (file:line) | Finding |
|---|---|---|
| P2 / Medium availability | apps/web/lib/public-campaign.ts:165 | Per-address rejected requests continue consuming the shared global quota, allowing one anonymous address to deny campaign access to fresh visitors. |

The reviewer reproduced the production handler control flow with a SQL counter stub. Root then executed the reviewer-supplied probe against actual PostgreSQL: 240 requests returned404, 1760 returned429, and a fresh address returned429; global hits2001. This is an availability tradeoff in the total-attempt global circuit breaker, not a numerical quota bypass or authorization compromise. Resolve the admission policy or verify adequate upstream protection before public use.

No concrete cross-owner access, CSRF bypass, public checkpoint rollback, answer-key leak or secret exposure was found in the examined implementation. Local restart recovery can restore an older signed receipt and rebind ownership; it is explicitly disclosed, not durable anti-rollback. Port-shared cookies can be clobbered for denial of service even though the separate proof prevents cookie-only authorization.

Verdicts: loopback CONDITIONAL; public implementation CONDITIONAL; production FAIL / NOT APPROVED. Physical loopback binding, explicit local recovery scope acceptance, public quota mitigation and actual provider/database/consumer acceptance remain required. No external release approval is issued.
