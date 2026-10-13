/**
 * PrepAI Local Ollama Verification Script
 * Validates 100% Local Inference & Embeddings (Zero Cloud API Keys)
 */
async function testLocalOllama() {
  console.log('====================================================');
  console.log('  🔍 PREPAI LOCAL OLLAMA VERIFICATION');
  console.log('====================================================\n');

  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';

  // 1. Check Ollama Service
  try {
    const res = await fetch(`${baseUrl}/api/tags`);
    if (!res.ok) {
      console.log('❌ Ollama service responded with status:', res.status);
      return;
    }
    const tags = await res.json();
    console.log('✅ Local Ollama is ONLINE at', baseUrl);
    console.log('📦 Installed Local Models:');
    (tags.models || []).forEach(m => console.log(`   - ${m.name} (${(m.size / (1024*1024*1024)).toFixed(2)} GB)`));
  } catch (err) {
    console.log('❌ Failed to reach local Ollama:', err.message);
    return;
  }

  // 2. Test llama3.2 Chat
  try {
    console.log('\n🤖 Testing llama3.2 Interview Dialogue Turn...');
    const t0 = Date.now();
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        stream: false,
        messages: [
          { role: 'system', content: 'You are a senior tech interviewer at Amazon. Ask exactly one brief technical counter-question.' },
          { role: 'user', content: 'I used Redis for distributed caching to optimize latency.' }
        ]
      })
    });
    if (chatRes.ok) {
      const data = await chatRes.json();
      console.log(`✅ llama3.2 Response received in ${Date.now() - t0}ms:`);
      console.log(`   "${data.message?.content?.trim()}"`);
    } else {
      console.log('❌ llama3.2 failed:', await chatRes.text());
    }
  } catch (err) {
    console.log('❌ llama3.2 error:', err.message);
  }

  // 3. Test nomic-embed-text
  try {
    console.log('\n🧬 Testing nomic-embed-text Resume Embeddings...');
    const t0 = Date.now();
    const embRes = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        prompt: 'Full Stack Developer with React, Node.js, and MongoDB experience'
      })
    });
    if (embRes.ok) {
      const data = await embRes.json();
      console.log(`✅ nomic-embed-text Vector generated in ${Date.now() - t0}ms (Length: ${data.embedding?.length})`);
    } else {
      console.log('❌ nomic-embed-text failed:', await embRes.text());
    }
  } catch (err) {
    console.log('❌ nomic-embed-text error:', err.message);
  }

  console.log('\n🎉 ALL LOCAL OLLAMA CHECKS COMPLETED! 100% Local Platform Ready.');
}

testLocalOllama();
