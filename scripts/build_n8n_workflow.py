import json
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "n8n" / "SchoolTrust_AI_Verified_Parent_Support.json"


def uid(name):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "schooltrust-ai/" + name))


def node(name, type_name, version, position, parameters):
    return {
        "parameters": parameters,
        "id": uid(name),
        "name": name,
        "type": type_name,
        "typeVersion": version,
        "position": position,
    }


def webhook(name, path, position, method="POST"):
    result = node(name, "n8n-nodes-base.webhook", 2.1, position, {
        "httpMethod": method,
        "path": path,
        "responseMode": "responseNode",
        "options": {"allowedOrigins": "*"},
    })
    result["webhookId"] = uid("webhook/" + path)
    return result


def code(name, position, js, mode="runOnceForEachItem"):
    return node(name, "n8n-nodes-base.code", 2, position, {
        "mode": mode,
        "jsCode": js,
    })


def http(name, position, method, url, json_body=None, options=None):
    params = {
        "method": method,
        "url": url,
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "={{ 'Bearer ' + $env.SUPABASE_SERVICE_ROLE_KEY }}"},
                {"name": "apikey", "value": "={{ $env.SUPABASE_SERVICE_ROLE_KEY }}"},
                {"name": "Content-Type", "value": "application/json"},
                {"name": "Prefer", "value": "return=representation"},
            ]
        },
        "options": options or {},
    }
    if json_body is not None:
        params.update({
            "sendBody": True,
            "contentType": "raw",
            "rawContentType": "application/json",
            "body": json_body,
        })
    return node(name, "n8n-nodes-base.httpRequest", 4.2, position, params)


def openai(name, position, endpoint, body):
    return node(name, "n8n-nodes-base.httpRequest", 4.2, position, {
        "method": "POST",
        "url": "https://api.openai.com/v1/" + endpoint,
        "sendHeaders": True,
        "headerParameters": {
            "parameters": [
                {"name": "Authorization", "value": "={{ 'Bearer ' + $env.OPENAI_API_KEY }}"},
                {"name": "Content-Type", "value": "application/json"},
            ]
        },
        "sendBody": True,
        "contentType": "raw",
        "rawContentType": "application/json",
        "body": body,
        "options": {"timeout": 60000},
    })


def respond(name, position, body):
    return node(name, "n8n-nodes-base.respondToWebhook", 1.4, position, {
        "respondWith": "json",
        "responseBody": body,
        "options": {"responseCode": 200},
    })


NODES = []

NODES.extend([
    webhook("Parent Question Webhook", "schooltrust-ask", [-1900, -520]),
    code("Validate Parent Question", [-1660, -520], r"""
const body = $json.body ?? $json;
const question = String(body.question ?? '').trim();
if (question.length < 3 || question.length > 1000) {
  throw new Error('Question must contain between 3 and 1000 characters.');
}
const q = question.toLowerCase();
const criticalTerms = ['fee', 'fund', 'charges', 'payment', 'timing', 'time', 'date', 'admission', 'policy', 'transport', 'result'];
const critical_topic = criticalTerms.some(term => q.includes(term));
let topic = 'general';
if (/fee|fund|charge|payment/.test(q)) topic = 'fees';
else if (/admission|document|class|grade/.test(q)) topic = 'admissions';
else if (/time|timing|schedule|date|vacation|holiday/.test(q)) topic = 'timings';
else if (/contact|phone|email|address|campus/.test(q)) topic = 'contact';
else if (/transport|van|bus/.test(q)) topic = 'transport';
const detected_language = /[\u0600-\u06FF]/.test(question) ? 'ur' : 'en';
return {
  session_id: String(body.session_id || ('web-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8))),
  user_contact: body.user_contact ? String(body.user_contact).slice(0, 150) : null,
  question,
  detected_language,
  critical_topic,
  topic,
  received_at: new Date().toISOString()
};
"""),
    openai(
        "Create Question Embedding",
        [-1420, -520],
        "embeddings",
        "={{ JSON.stringify({ model: $env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: $('Validate Parent Question').item.json.question }) }}"
    ),
    http(
        "Retrieve Approved Knowledge",
        [-1180, -520],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/rpc/match_school_knowledge' }}",
        "={{ JSON.stringify({ query_embedding: $json.data[0].embedding, match_threshold: $('Validate Parent Question').item.json.critical_topic ? 0.72 : 0.65, match_count: 6 }) }}"
    ),
    code("Build Verified RAG Prompt", [-940, -520], r"""
const request = $('Validate Parent Question').item.json;
const matches = Array.isArray($json) ? $json : ($json.body ?? []);
const active = matches.filter(m => m && m.id && m.content);
const sources = active.map((m, i) => ({
  source_number: i + 1,
  id: m.id,
  title: m.document_title,
  category: m.category,
  version: m.version_no,
  effective_from: m.effective_from,
  expires_at: m.expires_at,
  similarity: m.similarity,
  content: m.content
}));
const context = sources.length
  ? sources.map(s => '[SOURCE ' + s.source_number + ' | ID ' + s.id + ' | ' + s.title + ' | version ' + s.version + ']\n' + s.content).join('\n\n')
  : 'NO APPROVED SOURCE WAS RETRIEVED.';
const system = [
  'You are SchoolTrust AI, a verified parent-support assistant.',
  'Use only the APPROVED SOURCES supplied below. Never use general knowledge to fill missing school facts.',
  'Critical topics include fees, dates, timings, admissions, payments, results, transport and policies.',
  '',
  'Return one JSON object only with:',
  'answer_mode: "verified", "clarification", or "escalated"',
  'answer: concise parent-facing answer in the question language',
  'confidence: number from 0 to 1',
  'source_ids: array of source UUID strings actually used',
  'reason: short internal reason',
  '',
  'Rules:',
  '1. If the sources fully support one current answer, use verified.',
  '2. If two categories or cases have different valid answers, ask a precise clarification or state both categories.',
  '3. If sources conflict, are incomplete, appear stale, or do not answer the question, use escalated.',
  '4. Do not invent a fee, date, timing, policy, address or availability.',
  '5. For Urdu questions, answer in clear Urdu. For English questions, answer in English.',
  '6. Do not mention embeddings, confidence thresholds or internal workflow details.'
].join('\n');
const user = 'QUESTION: ' + request.question + '\nTOPIC: ' + request.topic + '\nCRITICAL: ' + request.critical_topic + '\n\nAPPROVED SOURCES:\n' + context;
return { ...request, retrieved_sources: sources, source_count: sources.length, system_prompt: system, user_prompt: user };
"""),
    openai(
        "Generate Controlled Answer",
        [-700, -520],
        "chat/completions",
        "={{ JSON.stringify({ model: $env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini', temperature: 0.1, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: $json.system_prompt }, { role: 'user', content: $json.user_prompt }] }) }}"
    ),
    code("Apply Answer Guardrails", [-460, -520], r"""
const prepared = $('Build Verified RAG Prompt').item.json;
let parsed = {};
try {
  const raw = $json.choices?.[0]?.message?.content ?? '{}';
  parsed = JSON.parse(raw);
} catch (error) {
  parsed = { answer_mode: 'escalated', answer: '', confidence: 0, source_ids: [], reason: 'Model output was not valid JSON.' };
}
const allowedIds = new Set(prepared.retrieved_sources.map(s => String(s.id)));
const source_ids = Array.isArray(parsed.source_ids)
  ? parsed.source_ids.map(String).filter(id => allowedIds.has(id))
  : [];
const confidence = Math.max(0, Math.min(1, Number(parsed.confidence || 0)));
const threshold = prepared.critical_topic ? 0.82 : 0.72;
let answer_status = parsed.answer_mode;
if (!['verified', 'clarification', 'escalated'].includes(answer_status)) answer_status = 'escalated';
if (answer_status === 'verified' && (prepared.source_count === 0 || source_ids.length === 0 || confidence < threshold)) {
  answer_status = 'escalated';
}
let answer = String(parsed.answer || '').trim();
if (answer_status === 'escalated' || !answer) {
  answer = prepared.detected_language === 'ur'
    ? 'اس سوال کی تصدیق شدہ معلومات اس وقت دستیاب نہیں ہیں۔ آپ کا سوال سکول انتظامیہ کے جائزے کے لیے بھیج دیا گیا ہے۔'
    : 'Verified information for this question is not currently available. Your question has been sent to the school administration for review.';
}
return {
  session_id: prepared.session_id,
  user_contact: prepared.user_contact,
  question: prepared.question,
  detected_language: prepared.detected_language,
  topic: prepared.topic,
  critical_topic: prepared.critical_topic,
  answer,
  answer_status,
  confidence,
  source_ids,
  reason: String(parsed.reason || 'Guardrail decision'),
  normalized_topic: prepared.topic,
  priority: prepared.critical_topic ? 'high' : 'medium',
  answered_at: new Date().toISOString()
};
"""),
    node("Is Verified Answer", "n8n-nodes-base.if", 2.2, [-220, -520], {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{
                "id": uid("condition/is-verified"),
                "leftValue": "={{ $json.answer_status }}",
                "rightValue": "verified",
                "operator": {"type": "string", "operation": "equals"},
            }],
            "combinator": "and",
        },
        "options": {},
    }),
    http(
        "Log Verified Conversation",
        [20, -660],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/conversation_logs' }}",
        "={{ JSON.stringify({ session_id: $json.session_id, user_contact: $json.user_contact, question: $json.question, detected_language: $json.detected_language, topic: $json.topic, critical_topic: $json.critical_topic, answer: $json.answer, answer_status: 'verified', confidence: $json.confidence, source_ids: $json.source_ids }) }}",
        {"response": {"response": {"neverError": True}}}
    ),
    respond(
        "Return Verified Answer",
        [260, -660],
        "={{ { success: true, status: 'verified', answer: $('Apply Answer Guardrails').item.json.answer, confidence: $('Apply Answer Guardrails').item.json.confidence, source_ids: $('Apply Answer Guardrails').item.json.source_ids, session_id: $('Apply Answer Guardrails').item.json.session_id } }}"
    ),
    node("Needs Clarification", "n8n-nodes-base.if", 2.2, [20, -420], {
        "conditions": {
            "options": {"caseSensitive": True, "leftValue": "", "typeValidation": "strict", "version": 2},
            "conditions": [{
                "id": uid("condition/is-clarification"),
                "leftValue": "={{ $json.answer_status }}",
                "rightValue": "clarification",
                "operator": {"type": "string", "operation": "equals"},
            }],
            "combinator": "and",
        },
        "options": {},
    }),
    http(
        "Log Clarification",
        [260, -420],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/conversation_logs' }}",
        "={{ JSON.stringify({ session_id: $json.session_id, user_contact: $json.user_contact, question: $json.question, detected_language: $json.detected_language, topic: $json.topic, critical_topic: $json.critical_topic, answer: $json.answer, answer_status: 'clarification', confidence: $json.confidence, source_ids: $json.source_ids }) }}",
        {"response": {"response": {"neverError": True}}}
    ),
    respond(
        "Return Clarification",
        [500, -420],
        "={{ { success: true, status: 'clarification', answer: $('Apply Answer Guardrails').item.json.answer, session_id: $('Apply Answer Guardrails').item.json.session_id } }}"
    ),
    http(
        "Record Knowledge Gap",
        [260, -220],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/rpc/record_knowledge_gap' }}",
        "={{ JSON.stringify({ p_session_id: $json.session_id, p_user_contact: $json.user_contact, p_question: $json.question, p_topic: $json.normalized_topic, p_reason: $json.reason, p_priority: $json.priority }) }}"
    ),
    http(
        "Log Escalated Conversation",
        [500, -220],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/conversation_logs' }}",
        "={{ JSON.stringify({ session_id: $('Apply Answer Guardrails').item.json.session_id, user_contact: $('Apply Answer Guardrails').item.json.user_contact, question: $('Apply Answer Guardrails').item.json.question, detected_language: $('Apply Answer Guardrails').item.json.detected_language, topic: $('Apply Answer Guardrails').item.json.topic, critical_topic: $('Apply Answer Guardrails').item.json.critical_topic, answer: $('Apply Answer Guardrails').item.json.answer, answer_status: 'escalated', confidence: $('Apply Answer Guardrails').item.json.confidence, source_ids: $('Apply Answer Guardrails').item.json.source_ids }) }}",
        {"response": {"response": {"neverError": True}}}
    ),
    respond(
        "Return Safe Escalation",
        [740, -220],
        "={{ { success: true, status: 'escalated', answer: $('Apply Answer Guardrails').item.json.answer, gap_created: true, session_id: $('Apply Answer Guardrails').item.json.session_id } }}"
    ),
])

NODES.extend([
    webhook("Administrator Approval Webhook", "schooltrust-admin-approve", [-1900, 220]),
    code("Validate Administrator Approval", [-1660, 220], r"""
const headers = $json.headers || {};
const supplied = headers['x-admin-token'] || headers['X-Admin-Token'];
if (!supplied || supplied !== $env.SCHOOLTRUST_ADMIN_TOKEN) throw new Error('Unauthorized administrator request.');
const b = $json.body || {};
for (const field of ['document_title', 'category', 'content', 'actor']) {
  if (!String(b[field] || '').trim()) throw new Error('Missing required field: ' + field);
}
if (String(b.content).trim().length < 20) throw new Error('Approved content must contain at least 20 characters.');
return {
  gap_id: b.gap_id || null,
  document_title: String(b.document_title).trim(),
  category: String(b.category).trim().toLowerCase(),
  content: String(b.content).trim(),
  source_url: b.source_url || null,
  version_no: Number(b.version_no || 1),
  effective_from: b.effective_from || null,
  expires_at: b.expires_at || null,
  actor: String(b.actor).trim()
};
"""),
    openai(
        "Embed Approved Knowledge",
        [-1420, 220],
        "embeddings",
        "={{ JSON.stringify({ model: $env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: $('Validate Administrator Approval').item.json.content }) }}"
    ),
    http(
        "Publish Approved Knowledge",
        [-1180, 220],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/knowledge_chunks' }}",
        "={{ JSON.stringify({ document_title: $('Validate Administrator Approval').item.json.document_title, category: $('Validate Administrator Approval').item.json.category, content: $('Validate Administrator Approval').item.json.content, source_url: $('Validate Administrator Approval').item.json.source_url, version_no: $('Validate Administrator Approval').item.json.version_no, status: 'approved', effective_from: $('Validate Administrator Approval').item.json.effective_from, expires_at: $('Validate Administrator Approval').item.json.expires_at, embedding: $json.data[0].embedding, approved_by: $('Validate Administrator Approval').item.json.actor, approved_at: new Date().toISOString() }) }}",
        {"response": {"response": {"responseFormat": "json"}}}
    ),
    code("Prepare Approval Audit", [-940, 220], r"""
const approved = $('Validate Administrator Approval').item.json;
const inserted = Array.isArray($json) ? $json[0] : $json;
return { ...approved, knowledge_id: inserted?.id || null };
"""),
    http(
        "Resolve Related Gap",
        [-700, 220],
        "PATCH",
        "={{ $env.SUPABASE_URL + '/rest/v1/knowledge_gaps?id=eq.' + ($json.gap_id || '00000000-0000-0000-0000-000000000000') }}",
        "={{ JSON.stringify({ status: 'resolved', resolution_notes: 'Approved knowledge published by ' + $json.actor, resolved_knowledge_id: $json.knowledge_id, resolved_at: new Date().toISOString() }) }}",
        {"response": {"response": {"neverError": True}}}
    ),
    http(
        "Log Administrator Action",
        [-460, 220],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/admin_actions' }}",
        "={{ JSON.stringify({ actor: $('Prepare Approval Audit').item.json.actor, action_type: 'publish_knowledge', entity_type: 'knowledge_chunk', entity_id: $('Prepare Approval Audit').item.json.knowledge_id, details: { gap_id: $('Prepare Approval Audit').item.json.gap_id, category: $('Prepare Approval Audit').item.json.category, title: $('Prepare Approval Audit').item.json.document_title } }) }}",
        {"response": {"response": {"neverError": True}}}
    ),
    respond(
        "Return Approval Confirmation",
        [-220, 220],
        "={{ { success: true, status: 'approved', knowledge_id: $('Prepare Approval Audit').item.json.knowledge_id, message: 'Knowledge published. Run the quality test branch before final deployment.' } }}"
    ),

    webhook("Administrator Dashboard Webhook", "schooltrust-admin-data", [-1900, 620], "GET"),
    code("Verify Dashboard Access", [-1660, 620], r"""
const headers = $json.headers || {};
const supplied = headers['x-admin-token'] || headers['X-Admin-Token'];
if (!supplied || supplied !== $env.SCHOOLTRUST_ADMIN_TOKEN) throw new Error('Unauthorized administrator request.');
return { authorized: true };
"""),
    http(
        "Load Dashboard Data",
        [-1420, 620],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/rpc/schooltrust_admin_dashboard' }}",
        "{}"
    ),
    respond("Return Dashboard Data", [-1180, 620], "={{ { success: true, data: $json } }}"),

    node("Daily Quality Test", "n8n-nodes-base.scheduleTrigger", 1.2, [-1900, 1020], {
        "rule": {"interval": [{"field": "days", "daysInterval": 1, "triggerAtHour": 6}]}
    }),
    node("Manual Quality Test", "n8n-nodes-base.manualTrigger", 1, [-1900, 1160], {}),
    http(
        "Fetch Active Regression Tests",
        [-1660, 1080],
        "GET",
        "={{ $env.SUPABASE_URL + '/rest/v1/regression_tests?is_active=eq.true&select=*' }}"
    ),
    code("Split Regression Tests", [-1420, 1080], r"""
const incoming = $input.all();
if (incoming.length > 1) return incoming;
const value = incoming[0]?.json;
const rows = Array.isArray(value) ? value : (Array.isArray(value?.data) ? value.data : []);
return rows.map(row => ({ json: row }));
""", mode="runOnceForAllItems"),
    openai(
        "Embed Regression Question",
        [-1180, 1080],
        "embeddings",
        "={{ JSON.stringify({ model: $env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small', input: $('Split Regression Tests').item.json.question }) }}"
    ),
    http(
        "Retrieve Test Knowledge",
        [-940, 1080],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/rpc/match_school_knowledge' }}",
        "={{ JSON.stringify({ query_embedding: $json.data[0].embedding, match_threshold: 0.65, match_count: 6 }) }}"
    ),
    code("Build Regression Prompt", [-700, 1080], r"""
const test = $('Split Regression Tests').item.json;
const matches = Array.isArray($json) ? $json : [];
const context = matches.length ? matches.map((m, i) => '[' + (i + 1) + '] ' + m.content).join('\n') : 'NO APPROVED KNOWLEDGE';
return {
  ...test,
  context,
  evaluation_prompt: 'Answer the question using only the approved knowledge. If the answer is missing, say that verified information is unavailable.\nQUESTION: ' + test.question + '\nAPPROVED KNOWLEDGE:\n' + context
};
"""),
    openai(
        "Generate Regression Answer",
        [-460, 1080],
        "chat/completions",
        "={{ JSON.stringify({ model: $env.OPENAI_CHAT_MODEL || 'gpt-4.1-mini', temperature: 0, messages: [{ role: 'system', content: 'You are evaluating a school support knowledge base. Use only supplied approved knowledge.' }, { role: 'user', content: $json.evaluation_prompt }] }) }}"
    ),
    code("Score Regression Result", [-220, 1080], r"""
const test = $('Build Regression Prompt').item.json;
const answer = String($json.choices?.[0]?.message?.content || '');
const normalize = s => String(s).toLowerCase().replace(/[,.-]/g, '').replace(/\s+/g, ' ').trim();
const normalizedAnswer = normalize(answer);
const expected = Array.isArray(test.expected_facts) ? test.expected_facts : [];
const missing = expected.filter(fact => !normalizedAnswer.includes(normalize(fact)));
const score = expected.length ? (expected.length - missing.length) / expected.length : 0;
return {
  regression_test_id: test.id,
  generated_answer: answer,
  passed: missing.length === 0,
  score,
  missing_facts: missing,
  notes: missing.length ? ('Missing ' + missing.length + ' expected fact(s).') : 'All expected facts were present.'
};
"""),
    http(
        "Store Evaluation Result",
        [20, 1080],
        "POST",
        "={{ $env.SUPABASE_URL + '/rest/v1/evaluation_results' }}",
        "={{ JSON.stringify($json) }}",
        {"response": {"response": {"neverError": True}}}
    ),
])

CONNECTIONS = {}


def connect(source, target, output=0):
    CONNECTIONS.setdefault(source, {"main": []})
    while len(CONNECTIONS[source]["main"]) <= output:
        CONNECTIONS[source]["main"].append([])
    CONNECTIONS[source]["main"][output].append({"node": target, "type": "main", "index": 0})


for source, target in [
    ("Parent Question Webhook", "Validate Parent Question"),
    ("Validate Parent Question", "Create Question Embedding"),
    ("Create Question Embedding", "Retrieve Approved Knowledge"),
    ("Retrieve Approved Knowledge", "Build Verified RAG Prompt"),
    ("Build Verified RAG Prompt", "Generate Controlled Answer"),
    ("Generate Controlled Answer", "Apply Answer Guardrails"),
    ("Apply Answer Guardrails", "Is Verified Answer"),
    ("Log Verified Conversation", "Return Verified Answer"),
    ("Log Clarification", "Return Clarification"),
    ("Record Knowledge Gap", "Log Escalated Conversation"),
    ("Log Escalated Conversation", "Return Safe Escalation"),
    ("Administrator Approval Webhook", "Validate Administrator Approval"),
    ("Validate Administrator Approval", "Embed Approved Knowledge"),
    ("Embed Approved Knowledge", "Publish Approved Knowledge"),
    ("Publish Approved Knowledge", "Prepare Approval Audit"),
    ("Prepare Approval Audit", "Resolve Related Gap"),
    ("Resolve Related Gap", "Log Administrator Action"),
    ("Log Administrator Action", "Return Approval Confirmation"),
    ("Administrator Dashboard Webhook", "Verify Dashboard Access"),
    ("Verify Dashboard Access", "Load Dashboard Data"),
    ("Load Dashboard Data", "Return Dashboard Data"),
    ("Daily Quality Test", "Fetch Active Regression Tests"),
    ("Manual Quality Test", "Fetch Active Regression Tests"),
    ("Fetch Active Regression Tests", "Split Regression Tests"),
    ("Split Regression Tests", "Embed Regression Question"),
    ("Embed Regression Question", "Retrieve Test Knowledge"),
    ("Retrieve Test Knowledge", "Build Regression Prompt"),
    ("Build Regression Prompt", "Generate Regression Answer"),
    ("Generate Regression Answer", "Score Regression Result"),
    ("Score Regression Result", "Store Evaluation Result"),
]:
    connect(source, target)

connect("Is Verified Answer", "Log Verified Conversation", 0)
connect("Is Verified Answer", "Needs Clarification", 1)
connect("Needs Clarification", "Log Clarification", 0)
connect("Needs Clarification", "Record Knowledge Gap", 1)

WORKFLOW = {
    "name": "SchoolTrust AI - Verified Parent Support and Knowledge Improvement",
    "nodes": NODES,
    "pinData": {},
    "connections": CONNECTIONS,
    "active": False,
    "settings": {
        "executionOrder": "v1",
        "saveManualExecutions": True,
        "saveExecutionProgress": True,
        "saveDataErrorExecution": "all",
        "saveDataSuccessExecution": "all",
    },
    "versionId": uid("workflow-version-1"),
    "meta": {
        "templateCredsSetupCompleted": False,
        "instanceId": "REPLACE_AFTER_IMPORT"
    },
    "tags": [
        {"id": uid("tag-schooltrust"), "name": "SchoolTrust AI"},
        {"id": uid("tag-capstone"), "name": "Capstone Project"}
    ],
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(WORKFLOW, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(OUT)
