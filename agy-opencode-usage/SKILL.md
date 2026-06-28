---
name: agy-opencode-usage
description: >
  Best practices for using the OpenCode junior developer agent in a senior-junior architect pair-programming relationship.
  Covers context isolation, instruction intermediation, git checkpointing, testing, and handling interactive prompts.
  Trigger this skill whenever you need to orchestrate OpenCode tasks, write prompt instructions, clean up accidental cross-repo edits,
  or manage session lifecycles.
---

# OpenCode Usage & Orchestration Guidelines

## Overview

This skill establishes the best practices for the **Senior Architect (agy/KG or agy/CG)** to guide, isolate, and orchestrate the **Junior Developer (OpenCode)**. Adhering to these guidelines prevents cross-repository pollution, ensures clean rollback capabilities, and maintains architectural control.

**Keywords**: OpenCode, senior-junior pairing, developer orchestration, context isolation, prompt intermediation, git checkpoints, rollback, interactive prompts.

---

## Core Guidelines

### 1. Context & Instruction Intermediation
*   **Do Not Leak Raw Multi-Party Logs**: Never pass raw multi-party coordination logs (e.g., `kg-cg-chat.md`) directly to OpenCode. OpenCode will misinterpret cross-team tasks (like CipherGenii's `C1`–`C3` and KnowledgeGenii's `K1`–`K2`) and attempt to implement changes in the wrong codebase.
*   **Act as the Translator**: You (the Senior Architect) must parse the high-level goals and translate them into a single-scoped, focused, step-by-step instruction file (e.g., `/tmp/instruction.txt`) that targets *only* the current repository.

### 2. Workspace & Repo Isolation
*   **Enforce Repository Boundaries**: OpenCode operates via a terminal shell and has the ability to run `cd ..` and write to sibling directories.
*   **Explicit Workspaces**: Explicitly instruct OpenCode at the start of its prompts to work *only* in the designated repository path (e.g., `/Users/markv/Code/KnowledgeGenii-2`).
*   **Workspace Checks**: If OpenCode attempts to run `git` or file commands on other directories, stop the task immediately.

### 3. Mandatory Pre-Task Checkpoint Commit
*   Before launching any OpenCode run (using `runner.py` or the OpenCode CLI), **always** stage and commit all active work.
*   Use a clear commit message like:
    ```bash
    git add . && git commit -m "chore: checkpoint before OpenCode [Feature Name]"
    ```
*   This establishes a safe recovery point. If OpenCode makes incorrect changes or leaks writes into sibling repos, you can revert instantly without losing prior architectural work.

### 4. Reverting Leaked Cross-Writes
If OpenCode leaks changes into a sibling repository:
1.  **Kill the Task**: Immediately terminate the running client script (e.g., via `manage_task` or Ctrl+C) to prevent further writes.
2.  **Inspect Status**: Run `git status` in the affected sibling repo to identify modified or untracked files.
3.  **Restore Clean State**: Run:
    ```bash
    git -C /path/to/sibling-repo restore <modified-files>
    rm -f /path/to/sibling-repo/<untracked-files>
    ```

### 5. Managing Interactive Prompts
*   When OpenCode completes its instructions or gets stuck, it will present a modal question (e.g., *"What should I work on next?"*).
*   **Verification First**: Verify that the changes it made on disk are correct and that all local tests pass.
*   **Instruct to Stand Down**: If the current task block is done, instruct OpenCode to **"Wait / other"** or type `"Wait for instructions"`. This stops the background loop and prevents it from looking for other tasks that could cause context drift.
