const lookupBtn = document.getElementById("lookupBtn");
const repResult = document.getElementById("repResult");
const enhanceBtn = document.getElementById("enhanceBtn");
const enhancedWrapper = document.getElementById("enhancedWrapper");
const enhancedBodyEl = document.getElementById("enhancedBody");
const buildBtn = document.getElementById("buildBtn");
const letterWrapper = document.getElementById("letterWrapper");
const letterPreview = document.getElementById("letterPreview");
const printBtn = document.getElementById("printBtn");

let currentRep = null;

function getLevel() {
  const radios = document.querySelectorAll('input[name="level"]');
  for (const r of radios) {
    if (r.checked) return r.value;
  }
  return "federal";
}

lookupBtn.addEventListener("click", async () => {
  const postal = document.getElementById("postal").value.trim();
  const level = getLevel();

  if (!postal) {
    alert("Enter a postal code.");
    return;
  }

  lookupBtn.disabled = true;
  lookupBtn.textContent = "Looking up...";

  try {
    const resp = await fetch("/api/representative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postalCode: postal, level })
    });

    const data = await resp.json();
    if (!resp.ok) {
      repResult.textContent = data.error || "Lookup failed.";
      currentRep = null;
      return;
    }

    currentRep = data;

    const lines = [];
    lines.push(`${data.name} (${data.elected_office})`);
    if (data.district_name) lines.push(data.district_name);
    if (data.party_name) lines.push(data.party_name);
    if (data.office_postal) lines.push("");
    if (data.office_postal) lines.push(data.office_postal);

    repResult.textContent = lines.join("\n");
  } catch (err) {
    console.error(err);
    repResult.textContent = "Error looking up representative.";
    currentRep = null;
  } finally {
    lookupBtn.disabled = false;
    lookupBtn.textContent = "Find my representative";
  }
});

enhanceBtn.addEventListener("click", async () => {
  if (!currentRep) {
    alert("Look up your representative first.");
    return;
  }

  const rawMessage = document.getElementById("rawMessage").value.trim();
  const topic = document.getElementById("topic").value.trim();
  const level = getLevel();

  if (!rawMessage) {
    alert("Enter your message.");
    return;
  }

  const repRole =
    level === "federal"
      ? "Member of Parliament"
      : "Member of Provincial Parliament";

  enhanceBtn.disabled = true;
  enhanceBtn.textContent = "Enhancing...";

  try {
    const resp = await fetch("/api/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rawMessage,
        repName: currentRep.name,
        repRole,
        districtName: currentRep.district_name,
        topic
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      alert(data.error || "Enhancement failed.");
      return;
    }

    enhancedWrapper.classList.remove("hidden");
    enhancedBodyEl.value = data.enhancedBody || "";
  } catch (err) {
    console.error(err);
    alert("Error enhancing message.");
  } finally {
    enhanceBtn.disabled = false;
    enhanceBtn.textContent = "Enhance with AI";
  }
});

buildBtn.addEventListener("click", () => {
  if (!currentRep) {
    alert("Look up your representative first.");
    return;
  }

  const senderName = document.getElementById("name").value.trim();
  const addr1 = document.getElementById("addr1").value.trim();
  const addr2 = document.getElementById("addr2").value.trim();
  const city = document.getElementById("city").value.trim();
  const province = document.getElementById("province").value.trim();
  const senderPostal = document.getElementById("senderPostal").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const topic = document.getElementById("topic").value.trim();
  const enhancedBody = enhancedBodyEl.value.trim();
  const level = getLevel();

  if (!senderName || !addr1 || !city || !province || !senderPostal) {
    alert("Fill in your name and mailing address.");
    return;
  }

  if (!enhancedBody) {
    alert("Enhance your message first.");
    return;
  }

  const repRole =
    level === "federal"
      ? "Member of Parliament"
      : "Member of Provincial Parliament";

  const today = new Date();
  const date = today.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const senderLines = [
    senderName,
    addr1,
    addr2,
    `${city}, ${province} ${senderPostal}`.trim(),
    email,
    phone
  ]
    .filter(Boolean)
    .join("\n");

  const repLines = [
    currentRep.name,
    repRole,
    currentRep.office_postal || ""
  ]
    .filter(Boolean)
    .join("\n");

  const subjectLine =
    topic && topic.length > 0 ? `Re: ${topic.trim()}\n` : "";

  const salutation = `Dear ${currentRep.name},`;
  const closing = `Sincerely,\n\n${senderName}`;

  const letter = [
    senderLines,
    "",
    date,
    "",
    repLines,
    "",
    subjectLine,
    salutation,
    "",
    enhancedBody,
    "",
    closing
  ]
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");

  letterWrapper.classList.remove("hidden");
  letterPreview.textContent = letter;
});

printBtn.addEventListener("click", () => {
  const letter = letterPreview.textContent || "";
  if (!letter) return;

  const popup = window.open("", "_blank");
  if (!popup) return;

  popup.document.write(
    `<pre style="white-space:pre-wrap;font-family:serif;font-size:12pt;">${letter.replace(
      /&/g,
      "&amp;"
    )
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")}</pre>`
  );
  popup.document.close();
  popup.focus();
  popup.print();
});
