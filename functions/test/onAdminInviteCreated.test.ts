import { describe, it, expect } from "vitest";
import { buildInviteEmail, buildMailDoc, escapeHtml } from "../src/onAdminInviteCreated.js";

describe("escapeHtml", () => {
  it("escapes the HTML-significant characters", () => {
    expect(escapeHtml(`<b>&"'`)).toBe("&lt;b&gt;&amp;&quot;&#39;");
  });
});

describe("buildInviteEmail", () => {
  it("names the inviter when one is provided", () => {
    const { subject, html } = buildInviteEmail("new@dr.org", "chief@dr.org");
    expect(subject).toContain("invited");
    expect(html).toContain("chief@dr.org has invited you");
    expect(html).toContain("new@dr.org");
  });

  it("falls back to a generic header when the inviter is unknown", () => {
    const { html } = buildInviteEmail("new@dr.org", "");
    expect(html).toContain("You've been invited");
  });

  it("escapes an email that contains markup", () => {
    const { html } = buildInviteEmail("<script>@x.org", "");
    expect(html).not.toContain("<script>@x.org");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildMailDoc", () => {
  it("produces the Trigger Email extension contract { to, message:{subject,html} }", () => {
    const doc = buildMailDoc({ email: "new@dr.org", createdByEmail: "chief@dr.org" }, "new@dr.org");
    expect(doc.to).toBe("new@dr.org");
    expect(typeof doc.message.subject).toBe("string");
    expect(typeof doc.message.html).toBe("string");
    expect(Object.keys(doc)).toEqual(["to", "message"]);
    expect(Object.keys(doc.message).sort()).toEqual(["html", "subject"]);
  });

  it("falls back to the doc-id emailKey when the email field is absent", () => {
    const doc = buildMailDoc({ createdByEmail: "chief@dr.org" }, "keyed@dr.org");
    expect(doc.to).toBe("keyed@dr.org");
  });
});
