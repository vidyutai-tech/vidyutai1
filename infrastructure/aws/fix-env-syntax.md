# Fix .env File Syntax Error

## The Problem
Line 126 has invalid syntax: `KUUXZx"`

## Quick Fix (on EC2)

Run this command to remove the problematic line:

```bash
sed -i '126d' ~/vidyutai/.env
```

Or edit manually:

```bash
nano ~/vidyutai/.env
```

Then:
1. Go to line 126 (Ctrl+_ then type 126)
2. Delete the line that says `KUUXZx"`
3. Save (Ctrl+O, Enter, Ctrl+X)

## Verify Fix

```bash
docker-compose -f docker-compose.prod.yml config 2>&1 | head -5
```

If no errors, the file is fixed!

