---
name: code-review
description: Copilot will help me to do a code review of the code for me to commit.
---

# Code Review Skill

## Purpose

Automate code review for all modified files, highlighting best practices, strengths, weaknesses, and areas for improvement.

## How to Use

1. Identify all modified files in your pull request or commit.
2. For each file, review the code for:

   - Code style and formatting
   - Readability and maintainability
   - Proper use of patterns and best practices
   - Security and performance considerations
   - Adequate documentation and comments

3. For each file, provide feedback in three sections:
   - **What was good:** List positive aspects and best practices followed.
   - **What was bad:** Point out issues, anti-patterns, or mistakes.
   - **What could be improved:** Suggest actionable improvements.

## Example Review Structure

```
### File: src/example.js

**What was good:**
- Clear variable names
- Functions are small and focused

**What was bad:**
- Missing error handling in fetchData()

**What could be improved:**
- Add unit tests for edge cases
- Use async/await instead of .then()

** Summary:**
Overall analysis with a table of strengths and weaknesses, and a final recommendation for approval or changes needed.
```

## Best Practices Checklist

- Follow project coding standards (e.g., ESLint, Prettier)
- Use meaningful names for variables, functions, and classes
- Keep functions small and single-purpose
- Write clear, concise comments where necessary
- Avoid code duplication
- Handle errors gracefully
- Write and update tests for new/changed code
- Always presents me code examples, of what is bad and what could improve

## Automation (Optional)

- Use a GitHub Action or bot to trigger this review automatically on pull requests.
- Integrate with tools like ESLint, Prettier, or SonarQube for automated checks.
