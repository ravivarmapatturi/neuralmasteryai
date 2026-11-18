# Agents batch 2 scorecard

Pages: Agentic Coding Assistants, Multi-Agent Systems, Browser Automation Agents, Computer-Use and GUI Agents.

| Page | Printed output values used | Standard sections | Static result |
| --- | --- | --- | --- |
| Agentic Coding Assistants | Initial assertion `-1800 != 180`; corrected test `OK` | Why, PenFlow, output-trace Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| Multi-Agent Systems | Majority accuracy at N=1,15,45 with independent and shared errors: 0.60/0.60, 0.79/0.74, 0.91/0.76 | Why, PenFlow, simulation Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| Browser Automation Agents | Input index 1; Search index 2; 3 laptops from $499; injected hidden instruction | Why, two PenFlows, output-trace Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |
| Computer-Use and GUI Agents | 1280×800: 1,334 tokens; 30 frames: 40,020; mapped click lands on Pay $1,240 and requires confirmation | Why, two PenFlows, numeric Worksheet, Worked example, Try it yourself, Common mistakes, When not to use it | Passed |

Verification: notebook (4 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed on the combined worktree. Full Vitest, browser, and build remain deferred under the low-memory rule. Existing output was retained and labeled `output` where it is a program trace.
