# Claude Code — Best Practices for Writing Skills

> Official source: [platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

## Core Principles

### 1. Be Concise

The context window is a shared resource. Every token in your Skill competes with conversation history and other Skills.

**Default assumption**: Claude is already very intelligent. Only add context it doesn't already have.

Questions to ask yourself:
- "Does Claude really need this explanation?"
- "Can I assume Claude already knows this?"
- "Does this paragraph justify its token cost?"

**Good** (~50 tokens):

````markdown
## Extract PDF Text

Use pdfplumber for extraction:

```python
import pdfplumber
with pdfplumber.open("file.pdf") as pdf:
    text = pdf.pages[0].extract_text()
```
````

**Bad** (~150 tokens):

```markdown
## Extract PDF Text

PDF (Portable Document Format) is a common format that contains
text, images, and other content. To extract text, you need a library.
There are many, but pdfplumber is recommended because it is easy to use...
```

### 2. Adjust Degrees of Freedom

| Freedom | When | Example |
|:--------|:-----|:--------|
| **High** (text instructions) | Multiple valid approaches, decisions depend on context | Code review, analysis |
| **Medium** (pseudocode/parameterized scripts) | A preferred pattern exists, variation acceptable | Report generation |
| **Low** (specific scripts) | Fragile operations, consistency critical | DB migrations |

**Analogy**: Imagine Claude as a robot on a path:
- **Narrow bridge with cliffs** → Exact instructions (low freedom)
- **Open field with no danger** → General direction (high freedom)

### 3. Test with All Models

| Model | Consideration |
|:------|:-------------|
| Claude Haiku | Does the Skill provide enough guidance? |
| Claude Sonnet | Is the Skill clear and efficient? |
| Claude Opus | Does the Skill avoid over-explaining? |

## SKILL.md Structure

### Naming

Use the gerund form (verb + -ing):

- `processing-pdfs`, `analyzing-spreadsheets`, `testing-code`
- Acceptable: `pdf-processing`, `process-pdfs`
- Avoid: `helper`, `utils`, `tools`, `documents`

### Effective Descriptions

Always write **in the third person**. The description is injected into the system prompt.

- **Good**: `"Processes Excel files and generates reports"`
- **Bad**: `"I can help you process Excel files"`

Include **what** the Skill does **and when** to use it:

```yaml
description: Extract text and tables from PDF files, fill forms, merge documents.
  Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

### Progressive Disclosure

`SKILL.md` serves as a table of contents. Claude loads additional files on demand.

**Rule**: Keep `SKILL.md` under 500 lines. Move details into separate files.

**Keep references one level deep**:

```markdown
# SKILL.md

**Basic usage**: [instructions here]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
**Examples**: See [examples.md](examples.md)
```

**Bad** (too deep):

```markdown
# SKILL.md → advanced.md → details.md → actual info
```

### Table of Contents for Long Files

For reference files > 100 lines, include a table of contents at the top.

## Common Patterns

### Template Pattern

For strict requirements (API responses, data formats):

````markdown
## Report Structure

ALWAYS use this exact structure:

```markdown
# [Analysis Title]

## Executive Summary
[One paragraph overview]

## Key Findings
- Finding 1 with data
- Finding 2 with data

## Recommendations
1. Actionable recommendation
```
````

### Examples Pattern

Provide input/output pairs:

````markdown
## Commit Format

**Example 1:**
Input: Adding JWT authentication
Output:
```
feat(auth): implement JWT-based authentication

Add login endpoint and token validation middleware
```
````

### Conditional Workflow Pattern

```markdown
## Document Modification

1. Determine the type:
   **Creation?** → Follow "Creation Workflow"
   **Editing?** → Follow "Editing Workflow"

2. Creation Workflow:
   - Use docx-js
   - Build from scratch
   - Export as .docx

3. Editing Workflow:
   - Decompress the document
   - Modify the XML
   - Validate after each change
   - Repackage
```

### Feedback Loop Pattern

```markdown
## Editing Process

1. Make the changes
2. **Validate immediately**: `python scripts/validate.py output/`
3. If validation fails:
   - Read the error message
   - Fix the issues
   - Rerun validation
4. **Only continue when validation passes**
5. Rebuild the deliverable
```

### Domain Organization Pattern

```
bigquery-skill/
├── SKILL.md (overview + navigation)
└── reference/
    ├── finance.md (revenue metrics)
    ├── sales.md (pipeline)
    ├── product.md (API usage)
    └── marketing.md (campaigns)
```

## Utility Scripts

Advantages of pre-made scripts vs generated code:
- More reliable
- Save tokens (no code in context)
- Save time (no generation)
- Ensure consistency

**Important**: Specify whether Claude should **execute** or **read** the script:
- "Run `analyze.py` to extract the fields" (execute)
- "See `analyze.py` for the extraction algorithm" (read as reference)

### Handling Errors in Scripts

```python
def process_file(path):
    """Traite un fichier, le crée s'il n'existe pas."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        print(f"Fichier {path} non trouvé, création par défaut")
        with open(path, "w") as f:
            f.write("")
        return ""
```

### Documenting Constants

```python
# Les requêtes HTTP complètent typiquement en 30 secondes
REQUEST_TIMEOUT = 30

# Trois retries équilibrent fiabilité et vitesse
MAX_RETRIES = 3
```

## Iterative Development

### Recommended Process

1. **Complete a task without a Skill** — note the information provided manually
2. **Identify the reusable pattern** — what context would be useful for similar tasks?
3. **Ask Claude A to create the Skill** — Claude natively understands the format
4. **Check conciseness** — remove superfluous explanations
5. **Test with Claude B** (fresh instance with the Skill loaded)
6. **Iterate** — observe behavior, adjust

### Observe How Claude Navigates

Watch for:
- Unexpected exploration paths
- Missing connections between files
- Overloading of certain sections
- Ignored content

## Anti-patterns to Avoid

| Anti-pattern | Fix |
|:-------------|:----|
| Windows paths (`scripts\helper.py`) | Always use `/` (`scripts/helper.py`) |
| Too many options ("use pypdf, or pdfplumber, or PyMuPDF...") | Provide a default with a targeted alternative |
| Temporal information ("before August 2025, use...") | "Legacy patterns" section in a `<details>` |
| Inconsistent terminology | Choose a term and stick with it |
| References too deep (SKILL.md → A → B → info) | Keep references 1 level deep |

## Pre-sharing Checklist

### Quality
- [ ] Specific description with keywords
- [ ] Description includes "what" and "when"
- [ ] `SKILL.md` < 500 lines
- [ ] Details in separate files if needed
- [ ] No temporal information
- [ ] Consistent terminology
- [ ] Concrete examples
- [ ] References 1 level deep
- [ ] Progressive disclosure used

### Code and Scripts
- [ ] Scripts handle errors explicitly
- [ ] No magic constants
- [ ] Required packages listed
- [ ] Validation steps for critical operations

### Tests
- [ ] At least 3 evaluation scenarios
- [ ] Tested with Haiku, Sonnet, and Opus
- [ ] Tested with real use cases

## Sources

- [Skill authoring best practices — Claude API Docs](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)
- [Agent Skills Overview](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview)
