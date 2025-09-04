//when served through server.ts
import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";

describe("RAG Agent", () => {
  it("should return an answer with citations", async () => {
    const response = await fetch(`${BASE_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "What did Buffett say about insurance in 1992?" }),
    });

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.answer).toContain("Direct Answer");
  });
});
