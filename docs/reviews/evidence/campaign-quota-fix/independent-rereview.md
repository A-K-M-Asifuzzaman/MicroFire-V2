# Fresh-context quota re-review

Reviewed exact clean 47e1ffac8b0b664349eb28e88c001153cfdecc0c after initial 0aa987f19f89833c7b49cdb75fe3268ead5090af. One separate-context Security Review agent performed analysis and actual-source PostgreSQL reproduction, without implementation edits.

Initial review confirmed original F1 fixed but found a new idle global-row holder risk. Final follow-up found no remaining concrete finding in the reviewed quota changes. Both F1 and the idle-holder issue are resolved under the local PostgreSQL model.

Independent probe: original 2000 attack240/1760, fresh200/global241; two-pool global race1997 admits3/rejects27, final2000, only3 address rows; lost COMMIT acknowledgement503/no cookie/charge retained, retry200/new charge; enrollment abusive5/fresh total6; visitor race120/30; suspended holder auto-ended about3s, rollback, fresh200/global1, frozen503, failed pool0, no test-side client error listener or uncaught crash.

The reserve-local deadline bounds idle locks. The temporary production leased-client listener covers errors through rollback and is removed before failed-lease discard. Fixed address/global lock ordering and no nested business locks remain intact. Brief contention during recovery can still return503.

Conditional local quota acceptance applies to final47e1ffa only. External Astra approval, exact consumer review, stable common realm/keys and canonical trusted gateway addresses, owner authorization and actual protected hosting/database acceptance remain release gates. Hosted staging BLOCKED / NOT RUN; loopback has no durable restart anti-rollback. No provider/deployment/public-load checks were attempted.
