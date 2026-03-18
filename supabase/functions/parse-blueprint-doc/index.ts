import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, bucket } = await req.json();
    if (!filePath || !bucket) {
      return new Response(JSON.stringify({ error: "filePath and bucket required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(filePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: `Download failed: ${downloadError?.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    let extractedText = "";

    if (ext === "txt" || ext === "md") {
      extractedText = await fileData.text();
    } else if (ext === "docx") {
      extractedText = await extractDocxText(fileData);
    } else if (ext === "pdf") {
      extractedText = await extractPdfWithAI(fileData);
    } else {
      extractedText = await fileData.text();
    }

    return new Response(
      JSON.stringify({ text: extractedText, fileName: filePath.split("/").pop() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/* ── PDF extraction via Lovable AI (multimodal) ──────────────────── */

async function extractPdfWithAI(blob: Blob): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return "[PDF extraction unavailable: LOVABLE_API_KEY not configured]";
  }

  // Convert PDF blob to base64 for multimodal input
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a document text extractor. Extract ALL text content from the provided PDF document. " +
            "Preserve the structure: headings, bullet points, numbered lists, tables (as markdown tables), and paragraphs. " +
            "Do NOT summarize or interpret — output the raw text content exactly as it appears. " +
            "If there are multiple pages, separate them with a blank line.",
        },
        {
          role: "user",
          content: [
            {
              type: "file",
              file: {
                filename: "document.pdf",
                file_data: `data:application/pdf;base64,${base64}`,
              },
            },
            {
              type: "text",
              text: "Extract all text content from this PDF document. Return only the extracted text, no commentary.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("AI PDF extraction failed:", response.status, errText);
    // Fall back to basic regex extraction
    return extractPdfTextBasic(await blob.arrayBuffer());
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || "";
  return text.trim() || "[No text content extracted from PDF]";
}

/* ── Basic PDF extraction (fallback) ─────────────────────────────── */

function extractPdfTextBasic(buf: ArrayBuffer): string {
  const raw = new TextDecoder("latin1").decode(new Uint8Array(buf));
  const parts: string[] = [];
  let m;
  const tj = /\(([^)]*)\)\s*Tj/g;
  while ((m = tj.exec(raw)) !== null) parts.push(m[1]);
  const tja = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tja.exec(raw)) !== null) {
    const inner = m[1];
    const sr = /\(([^)]*)\)/g;
    let s;
    while ((s = sr.exec(inner)) !== null) parts.push(s[1]);
  }
  if (!parts.length) return "[Could not extract text from PDF. The file may be image-based or encrypted.]";
  return parts.join(" ").replace(/\\n/g, "\n").trim();
}

/* ── DOCX extraction ─────────────────────────────────────────────── */

async function extractDocxText(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const entries = findZipEntries(bytes);
  const docEntry = entries.find((e) => e.name === "word/document.xml");
  if (!docEntry) return "[Could not find document.xml in DOCX file]";

  let xmlBytes: Uint8Array;
  if (docEntry.compressed) {
    xmlBytes = await inflate(docEntry.data);
  } else {
    xmlBytes = docEntry.data;
  }

  const xml = new TextDecoder().decode(xmlBytes);
  const lines: string[] = [];
  for (const para of xml.split(/<\/w:p>/)) {
    const parts: string[] = [];
    const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = re.exec(para)) !== null) parts.push(m[1]);
    if (parts.length) lines.push(parts.join(""));
  }
  return lines.join("\n").trim() || "[No text content found]";
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(data);
  writer.close();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { out.set(c, pos); pos += c.length; }
  return out;
}

interface ZipEntry { name: string; data: Uint8Array; compressed: boolean }

function findZipEntries(data: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset < data.length - 4) {
    const sig = data[offset] | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24);
    if (sig !== 0x04034b50) break;
    const method = data[offset+8] | (data[offset+9]<<8);
    const compSize = data[offset+18] | (data[offset+19]<<8) | (data[offset+20]<<16) | (data[offset+21]<<24);
    const nameLen = data[offset+26] | (data[offset+27]<<8);
    const extraLen = data[offset+28] | (data[offset+29]<<8);
    const name = new TextDecoder().decode(data.slice(offset+30, offset+30+nameLen));
    const dataStart = offset + 30 + nameLen + extraLen;
    entries.push({ name, data: data.slice(dataStart, dataStart+compSize), compressed: method === 8 });
    offset = dataStart + compSize;
  }
  return entries;
}
