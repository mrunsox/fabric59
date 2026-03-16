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
      extractedText = await extractPdfText(fileData);
    } else {
      extractedText = await fileData.text();
    }

    return new Response(JSON.stringify({ text: extractedText, fileName: filePath.split("/").pop() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function extractDocxText(blob: Blob): Promise<string> {
  // DOCX is a ZIP containing word/document.xml
  // Use the built-in DecompressionStream approach
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);

  // Simple ZIP parser to find word/document.xml
  const entries = parseZipEntries(uint8);
  const docEntry = entries.find(
    (e) => e.name === "word/document.xml"
  );

  if (!docEntry) {
    return "[Could not find document.xml in DOCX file]";
  }

  const xmlText = new TextDecoder().decode(docEntry.data);
  // Strip XML tags, keeping text content from <w:t> elements
  const textParts: string[] = [];
  const regex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let match;
  while ((match = regex.exec(xmlText)) !== null) {
    textParts.push(match[1]);
  }

  // Also detect paragraph breaks
  const fullXml = xmlText;
  let result = "";
  const paragraphs = fullXml.split(/<\/w:p>/);
  for (const para of paragraphs) {
    const parts: string[] = [];
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = tRegex.exec(para)) !== null) {
      parts.push(m[1]);
    }
    if (parts.length > 0) {
      result += parts.join("") + "\n";
    }
  }

  return result.trim() || "[No text content found in document]";
}

async function extractPdfText(blob: Blob): Promise<string> {
  // Basic PDF text extraction - look for text between BT/ET operators
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const rawText = new TextDecoder("latin1").decode(bytes);

  const textParts: string[] = [];

  // Extract text from Tj and TJ operators
  const tjRegex = /\(([^)]*)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(rawText)) !== null) {
    textParts.push(match[1]);
  }

  // Try TJ arrays
  const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
  while ((match = tjArrayRegex.exec(rawText)) !== null) {
    const inner = match[1];
    const strRegex = /\(([^)]*)\)/g;
    let m;
    while ((m = strRegex.exec(inner)) !== null) {
      textParts.push(m[1]);
    }
  }

  if (textParts.length === 0) {
    return "[Could not extract text from PDF. The file may be image-based or encrypted. Try a .docx or .txt file instead.]";
  }

  return textParts.join(" ").replace(/\\\\n/g, "\n").trim();
}

// Minimal ZIP parser for DOCX files
interface ZipEntry {
  name: string;
  data: Uint8Array;
}

function parseZipEntries(data: Uint8Array): ZipEntry[] {
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < data.length - 4) {
    const sig =
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24);

    if (sig !== 0x04034b50) break; // Local file header signature

    const compressionMethod = data[offset + 8] | (data[offset + 9] << 8);
    const compressedSize =
      data[offset + 18] |
      (data[offset + 19] << 8) |
      (data[offset + 20] << 16) |
      (data[offset + 21] << 24);
    const uncompressedSize =
      data[offset + 22] |
      (data[offset + 23] << 8) |
      (data[offset + 24] << 16) |
      (data[offset + 25] << 24);
    const nameLength = data[offset + 26] | (data[offset + 27] << 8);
    const extraLength = data[offset + 28] | (data[offset + 29] << 8);

    const name = new TextDecoder().decode(
      data.slice(offset + 30, offset + 30 + nameLength)
    );
    const dataStart = offset + 30 + nameLength + extraLength;
    const rawData = data.slice(dataStart, dataStart + compressedSize);

    if (compressionMethod === 0) {
      // Stored (no compression)
      entries.push({ name, data: rawData });
    } else if (compressionMethod === 8) {
      // Deflate
      try {
        const ds = new DecompressionStream("raw");
        const writer = ds.writable.getWriter();
        const reader = ds.readable.getReader();

        // We need to handle this synchronously-ish, so collect via promise
        const chunks: Uint8Array[] = [];
        const readAll = async () => {
          writer.write(rawData);
          writer.close();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
          }
          const totalLen = chunks.reduce((s, c) => s + c.length, 0);
          const result = new Uint8Array(totalLen);
          let pos = 0;
          for (const chunk of chunks) {
            result.set(chunk, pos);
            pos += chunk.length;
          }
          return result;
        };

        // Since we're in an async context already, we can await
        // But parseZipEntries is sync — we'll handle DOCX extraction differently
        // For now, store compressed data and decompress later
        entries.push({ name, data: rawData, compressed: true, uncompressedSize } as any);
      } catch {
        entries.push({ name, data: rawData });
      }
    }

    offset = dataStart + compressedSize;
  }

  return entries;
}

// Override extractDocxText to handle async decompression
const _origExtractDocx = extractDocxText;

// Replace with async-aware version
async function extractDocxTextAsync(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  const entries = parseZipEntries(uint8);

  let docEntry = entries.find((e) => e.name === "word/document.xml");
  if (!docEntry) return "[Could not find document.xml in DOCX file]";

  let xmlBytes: Uint8Array;
  if ((docEntry as any).compressed) {
    // Decompress
    const ds = new DecompressionStream("raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    writer.write(docEntry.data);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    xmlBytes = new Uint8Array(totalLen);
    let pos = 0;
    for (const chunk of chunks) {
      xmlBytes.set(chunk, pos);
      pos += chunk.length;
    }
  } else {
    xmlBytes = docEntry.data;
  }

  const fullXml = new TextDecoder().decode(xmlBytes);
  let result = "";
  const paragraphs = fullXml.split(/<\/w:p>/);
  for (const para of paragraphs) {
    const parts: string[] = [];
    const tRegex = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
    let m;
    while ((m = tRegex.exec(para)) !== null) {
      parts.push(m[1]);
    }
    if (parts.length > 0) {
      result += parts.join("") + "\n";
    }
  }

  return result.trim() || "[No text content found in document]";
}

// Monkey-patch
(globalThis as any).__extractDocxText = extractDocxTextAsync;
