# SchoolTrust AI

SchoolTrust AI is a verified parent-support and knowledge-improvement system for schools. It answers from administrator-approved information, applies stronger rules to fees, dates and policies, escalates uncertainty, records knowledge gaps, and retests critical questions after an approved update.

## Capstone classification

Selected project: **Enterprise AI RAG Customer Support Platform**

Case study: **Umeed Education System, Lahore**

Student: **Moeen Ahmad Butt**

## What is included

- docs/SchoolTrust_AI_SRS.pdf - submission-ready SRS containing the required sections.
- docs/SchoolTrust_AI_SRS.docx - editable SRS source.
- n8n/SchoolTrust_AI_Verified_Parent_Support.json - importable n8n workflow.
- n8n/SchoolTrust_AI_n8n_Cloud.json - credential-based edition for n8n Cloud; use this file for the hosted n8n service.
- database/supabase_schema.sql - pgvector database, security rules, RPC functions and regression-test seed.
- web/ - responsive parent assistant and administrator dashboard.
- data/approved_knowledge.csv - reviewed starter records. They are deliberately marked draft.
- data/regression_tests.csv - critical answer-quality tests.
- docs/Setup_and_Deployment_Guide.pdf - exact setup order.
- docs/Demo_Presentation_Script.pdf - short assessor demonstration script.

## System modules

1. **Verified Q&A:** receives a question, classifies the topic, retrieves active approved information, generates a controlled answer and applies deterministic guardrails.
2. **Knowledge-gap recovery:** safely escalates unsupported questions, groups repeated gaps and records their business priority.
3. **Administrator approval:** publishes reviewed information with effective dates, version metadata and an audit record.
4. **Regression evaluation:** retests critical questions and stores pass rate, score and missing facts.

## Minimum deployment order

1. Create or select a Supabase project.
2. Review and run database/supabase_schema.sql.
3. Import the n8n JSON.
4. Configure the required n8n environment values listed in environment-variables.example.txt.
5. Execute the administrator approval webhook for each reviewed knowledge entry so its embedding is created.
6. Run the manual quality-test trigger.
7. Activate the n8n workflow.
8. Edit web/config.js with the production webhook base URL and demo administrator token.
9. Deploy the web folder or embed the parent assistant into the school website.

For n8n Cloud, follow `docs/N8N_CLOUD_SETUP.md`. The Cloud workflow stores Supabase, OpenAI and administrator secrets in encrypted n8n credentials and contains no `$env` references.

## Security boundary

The web interface never contains the Supabase service-role key or AI API key. Those secrets stay in n8n. The included administrator token is a prototype control for the assessed demo; a production deployment must replace it with authenticated user sessions and role-based access.

## Honest project status

This package is a functional capstone foundation. It still requires the owner's Supabase, OpenAI and n8n credentials and administrator review of school facts before a live demonstration. The project does not claim access to private student records, automatic policy authority or fully autonomous knowledge publication.
