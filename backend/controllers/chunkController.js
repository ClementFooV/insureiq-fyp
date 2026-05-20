require('dotenv').config();
const TextPolish = require('../helpers/textPolishHelper.js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

class ChunkController {
    constructor(pool) {
        this.pool = pool;
        this.polish = TextPolish.polish;
        this.f32ToBuf = TextPolish.f32ToBuf;
        this.bufToF32 = TextPolish.bufToF32;
        this.cosine = TextPolish.cosine;
        this.firstH1 = TextPolish.firstH1;
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

    chunkMarkdown(md, target = 900, overlap = 120) {
        const STYLE_POLISH_LOCAL = /^(true|1)$/i.test(process.env.STYLE_POLISH_LOCAL || "true");
        if (STYLE_POLISH_LOCAL) md = this.polish(md);

        // Split by double newline first
        let rawParas = (md || "").split(/\n{2,}/);
        let paras = [];

        // If a single paragraph is still too big, split it by sentence (. or \n)
        for (const r of rawParas) {
            if (r.length <= target) {
                paras.push(r);
            } else {
                const sentences = r.match(/[^.!?\n]+[.!?\n]+/g) || [r];
                let temp = "";
                for (const s of sentences) {
                    if ((temp + s).length > target && temp.length > 0) {
                        paras.push(temp.trim());
                        temp = s;
                    } else {
                        temp += s;
                    }
                }
                if (temp.trim()) paras.push(temp.trim());
            }
        }

        const out = [];
        let cur = "";

        for (const p of paras) {
            if ((cur + "\n\n" + p).length > target && cur.length > 0) {
                out.push(cur.trim());
                cur = p;
            } else {
                cur = cur ? cur + "\n\n" + p : p;
            }
        }
        if (cur.trim()) out.push(cur.trim());

        const withOverlap = [];
        for (let i = 0; i < out.length; i++) {
            const prevTail = i > 0 ? out[i - 1].slice(-overlap) : "";
            withOverlap.push((prevTail ? prevTail + "\n\n" : "") + out[i]);
        }
        return withOverlap;
    }

    async ingestMarkdown({ title, markdown, chunk_target, chunk_overlap }) {
        const safeMd = String(markdown || "").trim();
        if (!safeMd) throw new Error("markdown required");

        const safeTitle = (
            String(title || "").trim() ||
            this.firstH1(safeMd) ||
            `Markdown ${Date.now()}`
        ).slice(0, 255);

        const target = chunk_target || parseInt(process.env.chunk_target, 10) || 900;
        const overlap = chunk_overlap !== undefined ? chunk_overlap : parseInt(process.env.chunk_overlap, 10) || 120;

        const chunks = this.chunkMarkdown(safeMd, target, overlap);
        if (!chunks.length) throw new Error("no chunks generated");

        // 1) prepare embeddings first
        const preparedRows = [];
        for (const chunk of chunks) {
            const content = `Doc: ${safeTitle}\n\n${chunk}`;
            const emb = await this.embed(content);

            preparedRows.push({
                content,
                embedding: this.f32ToBuf(emb),
            });
        }

        // 2) save document + chunks in transaction
        const conn = await this.pool.getConnection();

        try {
            await conn.beginTransaction();

            const [docResult] = await conn.query(
                `INSERT INTO documents (title, raw_content) VALUES (?, ?)`,
                [safeTitle, safeMd]
            );

            const docId = docResult.insertId;

            for (const row of preparedRows) {
                await conn.query(
                    `INSERT INTO chunks (doc_id, content, embedding) VALUES (?,?,?)`,
                    [docId, row.content, row.embedding]
                );
            }

            await conn.commit();

            return {
                ok: true,
                doc_id: docId,
                title: safeTitle,
                chunks: chunks.length,
            };
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    async ingestFromDir(dir) {
        const abs = path.resolve(dir);
        const files = fs.readdirSync(abs).filter((f) => f.toLowerCase().endsWith(".md"));
        const done = [];

        for (const f of files) {
            const p = path.join(abs, f);
            const raw = fs.readFileSync(p, "utf8");
            const title = this.firstH1(raw) || path.basename(f, path.extname(f)).replace(/_/g, " ").trim();

            const out = await this.ingestMarkdown({
                title,
                markdown: raw
            });

            done.push({ file: f, doc_id: out.doc_id });
        }

        return { ok: true, files: done, count: done.length };
    }



    clientMarkdown = async (req, res) => {
        try {
            let markdown = String(req.body?.markdown || "");
            const filename = String(req.body?.filename || "").trim();
            const directory = String(req.body?.directory || "").trim();
            let title = String(req.body?.title || "").trim();

            // If a directory is provided, ingest the entire directory
            if (directory) {
                const dirPath = path.join(process.cwd(), directory);
                if (!fs.existsSync(dirPath)) {
                    return res.status(404).json({ error: `Directory [${directory}] not found` });
                }
                const result = await this.ingestFromDir(dirPath);
                return res.json(result);
            }

            // If filename is provided, read it from the /data folder
            if (filename && !markdown) {
                const safePath = path.join(process.cwd(), "data", filename);
                if (!fs.existsSync(safePath)) {
                    return res.status(404).json({ error: `File [${filename}] not found in /data folder` });
                }
                markdown = fs.readFileSync(safePath, 'utf8');
                if (!title) title = filename.replace(/\.md$/i, '').replace(/_/g, ' ');
            }

            const chunk_target = req.body?.chunk_target
                ? Math.max(300, Math.min(parseInt(req.body.chunk_target, 10), 2000))
                : undefined;

            const chunk_overlap = req.body?.chunk_overlap
                ? Math.max(0, Math.min(parseInt(req.body.chunk_overlap, 10), 300))
                : undefined;

            if (!markdown.trim()) {
                return res.status(400).json({ error: "markdown, filename, OR directory required" });
            }

            const out = await this.ingestMarkdown({
                title,
                markdown,
                chunk_target,
                chunk_overlap,
            });

            return res.json({
                ok: true,
                ...out,
            });
        } catch (e) {
            console.error("[API /client/markdown] Error:", e);
            return res.status(500).json({ error: String(e) });
        }
    }

    // ── GET all documents (for Admin Knowledge Base listing) ──
    getAllDocuments = async (req, res) => {
        try {
            const [rows] = await this.pool.query(
                `SELECT d.id, d.title, d.raw_content, d.created_at,
                        (SELECT COUNT(*) FROM chunks c WHERE c.doc_id = d.id) AS chunk_count
                 FROM documents d ORDER BY d.created_at DESC`
            );
            return res.json({ ok: true, documents: rows });
        } catch (e) {
            console.error('[API GET /client/markdown] Error:', e);
            return res.status(500).json({ error: String(e) });
        }
    }

    // ── UPDATE a document (delete old chunks, re-embed new content) ──
    updateDocument = async (req, res) => {
        try {
            const docId = parseInt(req.params.id, 10);
            const markdown = String(req.body?.markdown || '').trim();
            let title = String(req.body?.title || '').trim();

            if (!markdown) {
                return res.status(400).json({ error: 'markdown content required' });
            }

            // Check document exists
            const [existing] = await this.pool.query('SELECT id, title FROM documents WHERE id = ?', [docId]);
            if (!existing.length) {
                return res.status(404).json({ error: 'Document not found' });
            }

            if (!title) title = existing[0].title;

            const safeMd = markdown;
            const target = parseInt(process.env.chunk_target, 10) || 900;
            const overlap = parseInt(process.env.chunk_overlap, 10) || 120;

            const chunks = this.chunkMarkdown(safeMd, target, overlap);
            if (!chunks.length) return res.status(400).json({ error: 'no chunks generated from content' });

            // Prepare new embeddings
            const preparedRows = [];
            for (const chunk of chunks) {
                const content = `Doc: ${title}\n\n${chunk}`;
                const emb = await this.embed(content);
                preparedRows.push({
                    content,
                    embedding: this.f32ToBuf(emb),
                });
            }

            // Transaction: delete old chunks, update doc, insert new chunks
            const conn = await this.pool.getConnection();
            try {
                await conn.beginTransaction();

                await conn.query('DELETE FROM chunks WHERE doc_id = ?', [docId]);
                await conn.query('UPDATE documents SET title = ?, raw_content = ? WHERE id = ?', [title, safeMd, docId]);

                for (const row of preparedRows) {
                    await conn.query(
                        'INSERT INTO chunks (doc_id, content, embedding) VALUES (?,?,?)',
                        [docId, row.content, row.embedding]
                    );
                }

                await conn.commit();
                return res.json({ ok: true, doc_id: docId, title, chunks: chunks.length });
            } catch (e) {
                await conn.rollback();
                throw e;
            } finally {
                conn.release();
            }
        } catch (e) {
            console.error('[API PUT /client/markdown/:id] Error:', e);
            return res.status(500).json({ error: String(e) });
        }
    }

    // ── DELETE a document (CASCADE removes chunks automatically) ──
    deleteDocument = async (req, res) => {
        try {
            const docId = parseInt(req.params.id, 10);
            const [result] = await this.pool.query('DELETE FROM documents WHERE id = ?', [docId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Document not found' });
            }

            return res.json({ ok: true, deleted: docId });
        } catch (e) {
            console.error('[API DELETE /client/markdown/:id] Error:', e);
            return res.status(500).json({ error: String(e) });
        }
    }
}

module.exports = (pool) => new ChunkController(pool);
