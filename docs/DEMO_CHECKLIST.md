# SchoolTrust AI - Demo Checklist

## Before presenting

- [ ] Registration ID entered in the SRS cover page.
- [ ] Live demo and GitHub links updated if available.
- [ ] Supabase SQL executed successfully.
- [ ] n8n workflow imported without missing nodes.
- [ ] Required environment values or encrypted credentials configured.
- [ ] At least four approved knowledge entries published through the administrator webhook.
- [ ] Manual quality-test branch executed.
- [ ] Workflow activated and production webhooks used in web/config.js.
- [ ] Parent assistant tested in English and Urdu.
- [ ] One verified answer, one clarification and one escalation captured.
- [ ] Administrator dashboard loads live metrics.
- [ ] Knowledge-gap approval tested.
- [ ] SRS PDF and workflow JSON open correctly on a different computer.

## Required demonstration sequence

1. Ask the annual-fund question and show both student categories.
2. Ask a question with missing approved information, such as transport fees.
3. Show the safe escalation and new knowledge gap.
4. Open the administrator dashboard.
5. Approve the missing information with an effective date.
6. Run the manual regression branch in n8n.
7. Ask the same question again and show that the answer is now verified.

## Do not claim

- Do not say that the system is production-certified.
- Do not say that AI independently approves school policy.
- Do not claim that private student data is connected.
- Do not call it a self-training model. It is an administrator-controlled knowledge-improvement workflow.
