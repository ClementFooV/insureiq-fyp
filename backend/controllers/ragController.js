require('dotenv').config();
const TextPolish = require('../helpers/textPolishHelper.js');
const fetch = require('node-fetch');
const dns = require('node:dns');
dns.setDefaultResultOrder('ipv4first');


let rerankerTokenizer = null;
let rerankerModel = null;
let rerankerDisabled = false;

// Constants from previous env logic
const TOP_K = 5;
const RERANK_MODEL = "Xenova/bge-reranker-base";
const STYLE_POLISH_LOCAL = true;

async function loadRerankerIfPossible() {
    if (rerankerDisabled) return false;
    if (rerankerTokenizer && rerankerModel) return true;

    try {
        // dynamic import for ES module
        const mod = await import("@huggingface/transformers");
        const { AutoTokenizer, AutoModelForSequenceClassification } = mod;

        console.log(`[Reranker] Loading ${RERANK_MODEL}...`);
        rerankerTokenizer = await AutoTokenizer.from_pretrained(RERANK_MODEL);
        rerankerModel = await AutoModelForSequenceClassification.from_pretrained(RERANK_MODEL, { quantized: false });
        console.log("[Reranker] Loaded.");
        return true;
    } catch (e) {
        console.warn("[Reranker] Disabled (failed to load):", String(e));
        rerankerDisabled = true;
        return false;
    }
}

function sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
}

async function rerank(queryText, candidates) {
    if (!candidates || candidates.length === 0) return [];
    const ok = await loadRerankerIfPossible();
    if (!ok) return candidates;

    const inputs = await rerankerTokenizer(candidates.map(() => queryText), {
        text_pair: candidates.map((c) => c.content),
        padding: true,
        truncation: true,
        max_length: 512,
    });

    const outputs = await rerankerModel(inputs);
    const logits = outputs.logits.data;

    return candidates
        .map((cand, idx) => ({ ...cand, rerank_score: sigmoid(logits[idx]) }))
        .sort((a, b) => b.rerank_score - a.rerank_score);
}

class RagController {
    constructor(pool) {
        this.pool = pool;
        this.bufToF32 = TextPolish.bufToF32;
        this.cosine = TextPolish.cosine;
        this.normalizeQuery = TextPolish.normalizeQuery;
    }

    async embed(text) {
        const apiKey = process.env.GEMINI_API_KEY;
        const model = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                content: { parts: [{ text }] }
            })
        });

        if (!res.ok) throw new Error(`Gemini embed failed: ${res.status}`);
        const data = await res.json();
        const vec = data.embedding?.values;
        if (!vec) throw new Error("Gemini returned no embedding values");
        return Float32Array.from(vec);
    }

    async geminiTranslate(text) {
        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const payload = {
            contents: [{ parts: [{ text: `Translate the following to English for search purposes. If it is already in English, output the exact original text. Output ONLY the translation.\nText: ${text}` }] }],
            generationConfig: { temperature: 0.0, maxOutputTokens: 120 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    async retrieve(userQuery, limit = TOP_K) {
        let normalized = this.normalizeQuery(userQuery);
        let translatedQuery = null;

        const t = await this.geminiTranslate(normalized);
        if (t && t.trim() && t.trim().toLowerCase() !== normalized.toLowerCase()) {
            translatedQuery = t.trim();
            normalized = translatedQuery;
        }

        const qEmb = await this.embed(normalized);

        // Fetch ALL chunks with their BM25 score (No filtering out zero-matches!)
        const [rows] = await this.pool.query(
            `SELECT id, doc_id, content, embedding,
                    MATCH(content) AGAINST (? IN NATURAL LANGUAGE MODE) AS bm25
               FROM chunks`,
            [normalized]
        );

        if (!rows.length) return { hits: [], translatedQuery };

        // Normalize BM25 score so we can mathematically combine it with Cosine (0 to 1 scales)
        const maxBm25 = Math.max(...rows.map(r => r.bm25)) || 1;

        let full = rows.map((r) => {
            let embF32;
            try {
                embF32 = this.bufToF32(r.embedding);
            } catch {
                embF32 = new Float32Array(768).fill(0);
            }
            
            // Vector does its own search mark
            const cosineScore = this.cosine(qEmb, embF32);
            
            // BM25 does its own search mark
            const normalizedBm25 = r.bm25 / maxBm25;
            
            // COMBINE THE MARKS! (E.g. 70% connection meaning, 30% exact keyword match)
            const combinedScore = (cosineScore * 0.7) + (normalizedBm25 * 0.3);

            return { id: r.id, doc_id: r.doc_id, content: r.content, score: combinedScore };
        });

        full.sort((a, b) => b.score - a.score);
        const top15 = full.slice(0, 15);
        const reranked = await rerank(normalized, top15);
        const out = reranked.slice(0, limit);

        return { hits: out, translatedQuery };
    }

    async generateAnswer(contextText, userQuery) {
        const apiKey = process.env.GEMINI_API_KEY;
        const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const systemInstruction = "You are a friendly AI assistant for an insurance platform called InsureIQ. You must ONLY answer questions using the provided Context Information below. Do not use your own general knowledge or training data under any circumstances. If the answer is not found in the provided context, respond with: 'I don't have information about that in my knowledge base. Please contact our support team for further assistance.' Strictly refuse any questions that are completely unrelated to insurance or InsureIQ by saying you can only assist with InsureIQ and insurance related topics.";

        const prompt = `Context Information:\n${contextText}\n\nUser Question:\n${userQuery}\n\nAnswer:`;

        const payload = {
            system_instruction: { parts: { text: systemInstruction } },
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, topK: 40, topP: 0.95 }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Gemini API Error: ${err}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't generate an answer.";
    }

    ask = async (req, res) => {
        try {
            const userQuery = req.body?.query;

            if (!userQuery) {
                return res.status(400).json({ error: "Missing 'query' field" });
            }

            // 1. Fully accurate BM25 -> Cosine -> Reranker Pipeline
            const { hits, translatedQuery } = await this.retrieve(userQuery, TOP_K);

            let contextText = "No relevant context found in database.";
            if (hits && hits.length > 0) {
                contextText = hits.map(c => c.content).join("\n\n---\n\n");
            }

            // 2. Generate final answer with Gemini
            const answer = await this.generateAnswer(contextText, userQuery);

            return res.json({
                ok: true,
                answer: answer,
                sources: hits,
                translatedQuery
            });

        } catch (error) {
            console.error("[RAG Ask Error]", error);
            res.status(500).json({ error: String(error) });
        }
    }
}

module.exports = (pool) => new RagController(pool);