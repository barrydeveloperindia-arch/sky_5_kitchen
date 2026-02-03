# Antigraviti Automation System

This module implements the requested Global Command Completion Hook, ensuring every executed command is:
1.  **Logged to a Database** (simulated via JSON for now).
2.  **Saved as a JSON Log** in the `logs/` directory.
3.  **Automatically Committed & Pushed** to GitHub.
4.  **Fail-safe protected**: If GitHub is down, failures are recorded for retry.

## structure
- `command_monitor.js`: The core logic containing `onCommandComplete`, `saveToDatabase`, and `pushToGithub`.
- `config.json`: Configuration to lock/unlock auto modes.
- `test_flow.js`: A demonstration script to verify the workflow.

## How to Use

Wrap your operational logic using the `execute` helper:

```javascript
import { execute } from './command_monitor.js';

await execute('Update_Task', async () => {
    // Your business logic
    return { status: 'Updated', id: 123 };
});
```

## Setup Requirements

1.  **Git Remote**: Ensure your repository has a remote origin set.
    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
    ```
2.  **GitHub Token**: Set `GITHUB_TOKEN` in your `.env` file for authentication (if using HTTPS with token).
3.  **Dependencies**: Ensure `simple-git` is installed (`npm install simple-git`).

## Database
Currently mocks a database using local JSON files (`automation/db.json` and `automation/db_failed.json`). Update `DB` object in `command_monitor.js` to connect to MongoDB/Firebase/MySQL as needed.
