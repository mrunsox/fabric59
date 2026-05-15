import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase A regression lock — Fabric59 campaign authoring must not leak Five9
 * IVR/voice-prompt plumbing. The campaign-intake source is the boundary file.
 *
 * If you find yourself adding any of these strings back to CampaignIntakePage,
 * stop: those concepts belong in the Five9 admin surface, not in Fabric59
 * campaign authoring.
 */
describe("campaign boundary purge (Phase A)", () => {
  const intakeSrc = readFileSync(
    resolve(__dirname, "../../pages/admin/CampaignIntakePage.tsx"),
    "utf8",
  );

  const FORBIDDEN = [
    "IVR Greeting",
    "Whisper",
    "Hold Music",
    "VM Greeting",
    "Transfer Display Number",
    "useFive9Prompts",
    "PromptSelector",
    "useUploadVmGreeting",
    "ivrGreetingPrompt",
    "whisperPrompt",
    "holdMusicPrompt",
    "vmGreetingPrompt",
    "vmGreetingFileUrl",
    "transferDisplayNumber",
  ];

  for (const term of FORBIDDEN) {
    it(`CampaignIntakePage must not contain "${term}"`, () => {
      expect(intakeSrc).not.toContain(term);
    });
  }
});
