# SchoolTrust AI — n8n Cloud Setup

Use `n8n/SchoolTrust_AI_n8n_Cloud.json`. Do not use the self-hosted workflow on n8n Cloud.

## 1. Create the Supabase credential

1. In n8n, open **Credentials** and select **Add credential**.
2. Search for **Supabase API**.
3. Name it exactly `SchoolTrust Supabase`.
4. Host: `https://uklalbmvfmdkgqqbsnrk.supabase.co`
5. In Supabase, open **Project Settings → API Keys**.
6. Copy the secret key or legacy `service_role` key into **Secret Key**.
7. Save and test the credential.

Never use the public `anon` key for this server-side workflow.

## 2. Create the OpenAI credential

1. Create an API key at `https://platform.openai.com/api-keys`.
2. In n8n, add an **OpenAI API** credential.
3. Name it exactly `SchoolTrust OpenAI`.
4. Paste the API key. Leave Organisation ID empty unless the account requires it.
5. Save the credential.

An API key requires API billing or available API credit. A ChatGPT subscription alone does not include API credit.

## 3. Create the administrator Header Auth credential

1. In n8n, add a **Header Auth** credential.
2. Name it exactly `SchoolTrust Admin Header`.
3. Header name: `x-admin-token`
4. Header value: create a random demo token of at least 24 characters.
5. Save the credential and keep the token available for `web/config.js`.

This is a capstone demo control. A production system must replace the browser-held token with authenticated administrator sessions.

## 4. Import the Cloud workflow

1. Return to **Workflows**.
2. Import `SchoolTrust_AI_n8n_Cloud.json`.
3. Open one Supabase HTTP Request node and confirm it shows `SchoolTrust Supabase`.
4. Open one OpenAI HTTP Request node and confirm it shows `SchoolTrust OpenAI`.
5. Open each administrator webhook and confirm it shows `SchoolTrust Admin Header`.
6. If a credential is unselected, select the matching saved credential.
7. Do not publish yet.

## 5. First controlled test

1. Open **Manual Quality Test**.
2. Select **Execute step**.
3. Confirm that the Supabase test list is returned.
4. If the OpenAI account has API credit, continue through the regression branch.
5. Then test the parent webhook with the workflow in test mode.

Do not publish until the credential checks and one parent-question test succeed.
