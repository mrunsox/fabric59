

## Add Queue Callback Automation + Abandon Rate Reduction Engine to Outline

Insert two new categories into `src/data/buildMap.ts` between "ANI Block List" (line 311) and "Platform Utilities" (line 312).

### New Categories (9 items total)

**Queue Callback Automation (4 items)**
| Item | Description |
|---|---|
| Callback Queue SOAP Setup | Five9 SOAP calls to enable callback on skill groups, create callback IVR modules, and configure callback-to-skill routing |
| High-Volume IVR Logic Builder | UI to configure IVR If/Then logic comparing Calls_In_Queue or Longest_Wait_Time against thresholds, with menu branching for hold vs. callback |
| Dynamic Queue Threshold Manager | Admin UI + Five9 modifyUserVariable API to adjust high-volume thresholds (gv_MaxQueueThreshold) without editing IVR scripts directly |
| Callback Announcement Config | Configure Skill Transfer announcement sequences including estimated wait time, repeat intervals, and mid-hold callback reminders via digit mapping |

**Abandon Rate Reduction Engine (5 items)**
| Item | Description |
|---|---|
| Skill Callback Audit Scanner | Edge function calling getSkillsInfo via SOAP, checks every active skill for enableCallback status, flags non-compliant skills |
| IVR Optimization Analyzer | AI-assisted (Gemini) analysis of IVR script definitions via getIVRScripts -- checks for high-volume branching, callback modules, wait-time announcements |
| Auto-Remediation Engine | Automated SOAP calls (modifySkill, modifyIVRScript) to enable callback on flagged skills and inject missing IVR modules |
| Generic Callback Template | Pre-built IVR callback flow template (high-volume If/Then, announcement, menu, digit mapping) applied by auto-remediation to deficient campaigns |
| Abandon Rate Dashboard | Admin UI showing per-skill callback audit status, IVR compliance scores, remediation history, and before/after abandon rate metrics |

### File Change

Single edit to `src/data/buildMap.ts` -- insert both category blocks at line 312, before the "Platform Utilities" block.

