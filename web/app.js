(() => {
  "use strict";

  const config = window.SCHOOLTRUST_CONFIG || {};
  const state = {
    sessionId: "browser-" + Date.now().toString(36),
    dashboard: null,
    busy: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const configured = () => Boolean(config.apiBaseUrl && !config.apiBaseUrl.includes("YOUR-N8N-DOMAIN"));
  const endpoint = (name) => String(config.apiBaseUrl || "").replace(/\/$/, "") + (config.endpoints?.[name] || "");

  function toast(message, type = "success") {
    const el = $("#toast");
    el.textContent = message;
    el.className = "toast show" + (type === "error" ? " error" : "");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.className = "toast"; }, 3600);
  }

  function setConnection(live) {
    $("#connectionDot").classList.toggle("live", live);
    $("#connectionLabel").textContent = live ? "Workflow connected" : "Setup required";
    $("#setupBanner").classList.toggle("hidden", live);
  }

  function showView(name) {
    $$(".view").forEach(view => view.classList.toggle("active", view.id === "view-" + name));
    $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === name));
    const view = $("#view-" + name);
    $("#viewTitle").textContent = view?.dataset.title || "SchoolTrust AI";
    $("#sidebar").classList.remove("open");
    history.replaceState(null, "", "#" + name);
  }

  function addMessage(role, text, status) {
    const stream = $("#chatStream");
    const wrapper = document.createElement("div");
    wrapper.className = "message " + role;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (status && role === "assistant") {
      const label = document.createElement("span");
      label.className = "status-label " + status;
      label.textContent = status === "verified" ? "Verified answer" : status === "clarification" ? "Clarification required" : "Sent for review";
      bubble.appendChild(label);
      bubble.appendChild(document.createElement("br"));
    }
    bubble.appendChild(document.createTextNode(text));
    wrapper.appendChild(bubble);
    const meta = document.createElement("span");
    meta.textContent = role === "user" ? "You" : "SchoolTrust AI";
    wrapper.appendChild(meta);
    stream.appendChild(wrapper);
    stream.scrollTop = stream.scrollHeight;
    return wrapper;
  }

  function addTyping() {
    const stream = $("#chatStream");
    const wrapper = document.createElement("div");
    wrapper.className = "message assistant typing";
    wrapper.innerHTML = '<div class="bubble"><i></i><i></i><i></i></div><span>Checking approved sources</span>';
    stream.appendChild(wrapper);
    stream.scrollTop = stream.scrollHeight;
    return wrapper;
  }

  async function askQuestion(question) {
    if (state.busy) return;
    if (!configured()) {
      toast("Connect your n8n URL in web/config.js first.", "error");
      return;
    }
    state.busy = true;
    $("#chatForm button").disabled = true;
    addMessage("user", question);
    const typing = addTyping();
    try {
      const response = await fetch(endpoint("ask"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, session_id: state.sessionId })
      });
      if (!response.ok) throw new Error("Workflow returned HTTP " + response.status);
      const result = await response.json();
      typing.remove();
      addMessage("assistant", result.answer || "No answer was returned.", result.status || "escalated");
      setConnection(true);
    } catch (error) {
      typing.remove();
      addMessage("assistant", "The workflow could not be reached. Check the n8n production webhook URL and workflow activation.", "escalated");
      setConnection(false);
      toast(error.message, "error");
    } finally {
      state.busy = false;
      $("#chatForm button").disabled = false;
    }
  }

  async function loadDashboard() {
    if (!configured()) {
      setConnection(false);
      toast("Add the n8n production URL in web/config.js.", "error");
      return;
    }
    try {
      const response = await fetch(endpoint("dashboard"), {
        headers: { "x-admin-token": config.adminToken || "" }
      });
      if (!response.ok) throw new Error("Dashboard endpoint returned HTTP " + response.status);
      const payload = await response.json();
      state.dashboard = payload.data || payload;
      renderDashboard(state.dashboard);
      setConnection(true);
      toast("Live dashboard data loaded.");
    } catch (error) {
      setConnection(false);
      toast(error.message, "error");
    }
  }

  function renderDashboard(data) {
    const metrics = data.metrics || {};
    $("#metricKnowledge").textContent = metrics.approvedKnowledge ?? 0;
    $("#metricGaps").textContent = metrics.openGaps ?? 0;
    $("#metricVerified").textContent = metrics.verifiedAnswers ?? 0;
    $("#metricPassRate").textContent = (metrics.latestTestPassRate ?? 0) + "%";
    $("#gapNavCount").textContent = metrics.openGaps ?? 0;
    renderGaps(data.gaps || []);
    renderTests(data.evaluations || []);
  }

  function renderGaps(gaps) {
    const list = $("#gapList");
    $("#gapSummary").textContent = gaps.length + " unresolved question" + (gaps.length === 1 ? "" : "s");
    if (!gaps.length) {
      list.innerHTML = '<div class="empty-state"><span>✓</span><strong>No open knowledge gaps</strong><p>All recorded questions have been reviewed.</p></div>';
      return;
    }
    list.innerHTML = "";
    gaps.forEach(gap => {
      const row = document.createElement("article");
      row.className = "gap-row";
      row.innerHTML =
        '<div><p class="row-title"></p><div class="row-meta"><span class="topic"></span><span class="occurrences"></span><span class="reason"></span></div></div>' +
        '<span class="priority"></span><button class="review-button">Review and approve</button>';
      $(".row-title", row).textContent = gap.question;
      $(".topic", row).textContent = "Topic: " + (gap.normalized_topic || "general");
      $(".occurrences", row).textContent = "Asked " + (gap.occurrence_count || 1) + " time(s)";
      $(".reason", row).textContent = gap.reason || "Insufficient approved information";
      $(".priority", row).textContent = gap.priority || "medium";
      $(".priority", row).classList.add(gap.priority || "medium");
      $(".review-button", row).addEventListener("click", () => openApproval(gap));
      list.appendChild(row);
    });
  }

  function renderTests(tests) {
    const list = $("#testList");
    if (!tests.length) {
      list.innerHTML = '<div class="empty-state"><span>✓</span><strong>No evaluation results</strong><p>Run the manual quality-test branch in n8n.</p></div>';
      return;
    }
    list.innerHTML = "";
    tests.forEach(test => {
      const row = document.createElement("article");
      row.className = "test-row";
      row.innerHTML =
        '<div><p class="row-title"></p><div class="row-meta"><span class="category"></span><span class="notes"></span></div></div>' +
        '<strong class="score"></strong><span class="result-pill"></span>';
      $(".row-title", row).textContent = test.test_name || "Regression test";
      $(".category", row).textContent = "Category: " + (test.category || "general");
      $(".notes", row).textContent = test.notes || "";
      $(".score", row).textContent = Math.round(Number(test.score || 0) * 100) + "%";
      $(".result-pill", row).textContent = test.passed ? "Passed" : "Failed";
      $(".result-pill", row).classList.add(test.passed ? "pass" : "fail");
      list.appendChild(row);
    });
  }

  function openApproval(gap) {
    $("#gapId").value = gap.id || "";
    $("#documentTitle").value = (gap.normalized_topic || "School") + " Information";
    $("#category").value = gap.normalized_topic || "general";
    $("#approvedContent").value = "";
    $("#approvalDialog").showModal();
  }

  async function submitApproval(event) {
    event.preventDefault();
    if (!configured()) {
      toast("Connect the n8n workflow first.", "error");
      return;
    }
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(endpoint("approve"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": config.adminToken || ""
        },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error("Approval endpoint returned HTTP " + response.status);
      $("#approvalDialog").close();
      toast("Approved knowledge published. Run quality tests next.");
      await loadDashboard();
    } catch (error) {
      toast(error.message, "error");
    }
  }

  $$(".nav-item").forEach(item => item.addEventListener("click", () => showView(item.dataset.view)));
  $$("[data-view-target]").forEach(item => item.addEventListener("click", () => showView(item.dataset.viewTarget)));
  $("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#refreshButton").addEventListener("click", loadDashboard);
  $("#loadDashboardButton").addEventListener("click", loadDashboard);
  $("#approvalForm").addEventListener("submit", submitApproval);
  $("#chatForm").addEventListener("submit", event => {
    event.preventDefault();
    const input = $("#questionInput");
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    askQuestion(question);
  });
  $("#questionInput").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("#chatForm").requestSubmit();
    }
  });
  $$(".prompt-chips button").forEach(button => button.addEventListener("click", () => askQuestion(button.dataset.question)));

  const initial = location.hash.replace("#", "") || "assistant";
  showView($("#view-" + initial) ? initial : "assistant");
  setConnection(configured());
})();
