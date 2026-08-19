import { useState } from "react";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function askQuestion() {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      setAnswer("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "60px auto", padding: 20 }}>
      <h1>🔥 Prox Welder Expert</h1>

      <p>Ask anything about the Vulcan OmniPro 220.</p>

      <textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="e.g. What's the duty cycle for MIG welding at 200A on 240V?"
        rows={5}
        style={{ width: "100%", padding: 12 }}
      />

      <button
        onClick={askQuestion}
        disabled={loading}
        style={{ marginTop: 12, padding: "10px 20px" }}
      >
        {loading ? "Thinking..." : "Ask Expert"}
      </button>

      {answer && (
        <div style={{ marginTop: 30 }}>
          <h2>Answer</h2>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;