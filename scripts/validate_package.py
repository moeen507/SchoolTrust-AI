import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / "n8n" / "SchoolTrust_AI_Verified_Parent_Support.json"
SCHEMA = ROOT / "database" / "supabase_schema.sql"
WEB = ROOT / "web"

errors = []

try:
    workflow = json.loads(WORKFLOW.read_text(encoding="utf-8"))
except Exception as exc:
    raise SystemExit("Workflow JSON is invalid: " + str(exc))

names = [node.get("name") for node in workflow.get("nodes", [])]
if len(names) != len(set(names)):
    errors.append("Workflow contains duplicate node names.")
if len(names) < 30:
    errors.append("Workflow unexpectedly contains fewer than 30 nodes.")

for source, groups in workflow.get("connections", {}).items():
    if source not in names:
        errors.append("Connection source does not exist: " + source)
    for group in groups.get("main", []):
        for edge in group:
            if edge.get("node") not in names:
                errors.append("Connection target does not exist: " + str(edge.get("node")))

required_nodes = {
    "Parent Question Webhook",
    "Apply Answer Guardrails",
    "Record Knowledge Gap",
    "Administrator Approval Webhook",
    "Daily Quality Test",
    "Score Regression Result",
}
missing_nodes = sorted(required_nodes.difference(names))
if missing_nodes:
    errors.append("Missing required workflow nodes: " + ", ".join(missing_nodes))

schema = SCHEMA.read_text(encoding="utf-8")
for object_name in [
    "knowledge_chunks",
    "conversation_logs",
    "knowledge_gaps",
    "regression_tests",
    "evaluation_results",
    "match_school_knowledge",
    "record_knowledge_gap",
]:
    if object_name not in schema:
        errors.append("Database schema is missing: " + object_name)

html = (WEB / "index.html").read_text(encoding="utf-8")
ids = re.findall(r'\bid="([^"]+)"', html)
if len(ids) != len(set(ids)):
    errors.append("Web interface contains duplicate HTML IDs.")
for asset in ["styles.css", "config.js", "app.js"]:
    if not (WEB / asset).exists():
        errors.append("Missing web asset: " + asset)

if errors:
    print("PACKAGE VALIDATION FAILED")
    for error in errors:
        print("- " + error)
    raise SystemExit(1)

print("PACKAGE VALIDATION PASSED")
print("Workflow nodes:", len(names))
print("Workflow branches: parent Q&A, admin approval, dashboard, regression evaluation")
print("Web interface IDs:", len(ids))
