"""Create the n8n Cloud edition from the validated self-hosted workflow.

The Cloud edition keeps secrets in n8n credentials instead of using $env.
The Supabase project URL is public configuration and is intentionally fixed for
this student's deployment.
"""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "n8n" / "SchoolTrust_AI_Verified_Parent_Support.json"
OUTPUT = ROOT / "n8n" / "SchoolTrust_AI_n8n_Cloud.json"
SUPABASE_URL = "https://uklalbmvfmdkgqqbsnrk.supabase.co"

ADMIN_WEBHOOKS = {
    "Administrator Approval Webhook",
    "Administrator Dashboard Webhook",
}


def remove_secret_headers(parameters):
    header_parameters = parameters.get("headerParameters", {}).get("parameters", [])
    parameters.setdefault("headerParameters", {})["parameters"] = [
        header
        for header in header_parameters
        if str(header.get("name", "")).lower() not in {"authorization", "apikey"}
    ]


def convert_http_node(node):
    parameters = node["parameters"]
    if "api.openai.com" in parameters.get("url", ""):
        parameters["authentication"] = "predefinedCredentialType"
        parameters["nodeCredentialType"] = "openAiApi"
        remove_secret_headers(parameters)
        node["credentials"] = {"openAiApi": {"name": "SchoolTrust OpenAI"}}
    else:
        parameters["url"] = parameters["url"].replace(
            "$env.SUPABASE_URL", repr(SUPABASE_URL)
        )
        parameters["authentication"] = "predefinedCredentialType"
        parameters["nodeCredentialType"] = "supabaseApi"
        remove_secret_headers(parameters)
        node["credentials"] = {"supabaseApi": {"name": "SchoolTrust Supabase"}}

    for key, value in list(parameters.items()):
        if isinstance(value, str):
            value = value.replace(
                "$env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'",
                "'text-embedding-3-small'",
            )
            value = value.replace(
                "$env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini'",
                "'gpt-4.1-mini'",
            )
            parameters[key] = value


def convert_admin_webhook(node):
    node["parameters"]["authentication"] = "headerAuth"
    node["credentials"] = {
        "httpHeaderAuth": {"name": "SchoolTrust Admin Header"}
    }


def remove_code_token_check(node):
    code = node["parameters"]["jsCode"]
    code = code.replace(
        "const headers = $json.headers || {};\n"
        "const supplied = headers['x-admin-token'] || headers['X-Admin-Token'];\n"
        "if (!supplied || supplied !== $env.SCHOOLTRUST_ADMIN_TOKEN) throw new Error('Unauthorized administrator request.');\n",
        "",
    )
    node["parameters"]["jsCode"] = code


def main():
    workflow = json.loads(SOURCE.read_text(encoding="utf-8"))
    workflow["name"] = "SchoolTrust AI - Verified Parent Support (n8n Cloud)"

    for node in workflow["nodes"]:
        if node["type"] == "n8n-nodes-base.httpRequest":
            convert_http_node(node)
        if node["name"] in ADMIN_WEBHOOKS:
            convert_admin_webhook(node)
        if node["name"] in {
            "Validate Administrator Approval",
            "Verify Dashboard Access",
        }:
            remove_code_token_check(node)

    serialized = json.dumps(workflow, indent=2, ensure_ascii=False) + "\n"
    if "$env." in serialized:
        raise RuntimeError("Cloud workflow still contains an environment reference")
    if SUPABASE_URL not in serialized:
        raise RuntimeError("Cloud workflow is missing the configured Supabase URL")

    OUTPUT.write_text(serialized, encoding="utf-8")
    print(OUTPUT)


if __name__ == "__main__":
    main()
