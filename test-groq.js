// Test Groq API Key
const GROQ_API_KEY = "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";

async function testGroqAPI() {
    console.log("Testing Groq API...");
    console.log("API Key:", GROQ_API_KEY.substring(0, 10) + "...");

    try {
        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        {
                            role: "user",
                            content: "Say 'Hello World' in one word",
                        },
                    ],
                    max_tokens: 10,
                }),
            }
        );

        const data = await response.json();

        console.log("Response status:", response.status);
        console.log("Response data:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            throw new Error(data.error?.message || `API request failed with status ${response.status}`);
        }

        const text = data.choices?.[0]?.message?.content;
        console.log("\n✅ SUCCESS! Generated text:", text);

        return text;
    } catch (error) {
        console.error("\n❌ ERROR:", error.message);
        console.error("Full error:", error);
        throw error;
    }
}

// Run the test
testGroqAPI()
    .then(result => console.log("\nTest completed successfully!"))
    .catch(error => console.error("\nTest failed!"));
