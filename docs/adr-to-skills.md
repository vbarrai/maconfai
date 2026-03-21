# ADR to Skills — Transformer des Architecture Decision Records en Skills

## Pourquoi ?

Les **Architecture Decision Records** (ADR) documentent les décisions techniques prises dans un projet : choix de stack, conventions de nommage, patterns adoptés, compromis acceptés. Ces décisions sont exactement le type de contexte dont les agents IA ont besoin pour produire du code cohérent avec un projet.

Aujourd'hui, ces ADR dorment dans un dossier `docs/adr/` et ne sont consultés que par les humains. L'idée est de les **transformer en skills maconfai** pour qu'ils deviennent des instructions actives, automatiquement chargées par les agents IA.

### Bénéfices

- **Source unique de vérité** : les ADR restent la référence humaine ET machine
- **Contexte automatique** : l'agent connaît les décisions du projet sans qu'on les lui répète
- **Multi-agents** : un même repo ADR alimente Claude Code, Cursor, Codex, etc.
- **Versionné** : les skills évoluent avec les ADR via git

## Format ADR standard

Un ADR typique (format [MADR](https://adr.github.io/madr/)) :

```markdown
# ADR-0042: Utiliser PostgreSQL comme base de données principale

## Statut
Accepté

## Contexte
Notre application nécessite une base relationnelle avec support JSON,
transactions ACID, et capacité de montée en charge horizontale.

## Décision
Nous utilisons PostgreSQL 16+ avec les extensions pgvector et pg_trgm.

## Conséquences
- Les requêtes doivent utiliser des prepared statements
- Pas de MySQL/MariaDB — toute migration doit cibler PostgreSQL
- Les migrations utilisent golang-migrate
- Les index GIN sont préférés pour les colonnes JSONB
```

## Stratégies de transformation

### Stratégie 1 — Un skill par ADR

Chaque ADR devient un skill individuel. C'est la stratégie la plus granulaire.

**Structure source (repo ADR) :**

```
adr-repo/
├── skills/
│   ├── adr-0042-postgresql/
│   │   └── SKILL.md
│   ├── adr-0043-rest-api-conventions/
│   │   └── SKILL.md
│   └── adr-0044-error-handling/
│       └── SKILL.md
```

**SKILL.md généré depuis l'ADR-0042 :**

```yaml
---
name: adr-0042-postgresql
description: >
  Architecture decision: PostgreSQL est la base de données principale.
  Applique cette décision pour tout code touchant à la persistance,
  aux migrations, ou aux requêtes SQL.
---
```

```markdown
# ADR-0042: PostgreSQL comme base de données principale

## Règles à suivre

- Utiliser PostgreSQL 16+ exclusivement (pas de MySQL, SQLite en prod)
- Toujours utiliser des prepared statements (jamais de concaténation SQL)
- Utiliser golang-migrate pour les fichiers de migration
- Préférer les index GIN pour les colonnes JSONB
- Utiliser pgvector pour les embeddings vectoriels
- Utiliser pg_trgm pour la recherche full-text simple

## Exemples

### Migration correcte
​```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile JSONB NOT NULL DEFAULT '{}',
    embedding vector(1536)
);
CREATE INDEX idx_users_profile ON users USING GIN (profile);
​```

### Requête avec prepared statement
​```go
row := db.QueryRowContext(ctx, "SELECT id FROM users WHERE email = $1", email)
​```
```

**Quand utiliser** : quand les ADR sont indépendants les uns des autres et que l'agent n'a besoin que du contexte pertinent à sa tâche.

### Stratégie 2 — Un skill par domaine (ADR regroupés)

Plusieurs ADR liés sont fusionnés en un seul skill thématique.

**Structure source :**

```
adr-repo/
├── skills/
│   ├── database-conventions/
│   │   ├── SKILL.md          # Fusionne ADR-0042, ADR-0051, ADR-0067
│   │   └── references/
│   │       ├── adr-0042.md   # ADR original pour traçabilité
│   │       ├── adr-0051.md
│   │       └── adr-0067.md
│   ├── api-conventions/
│   │   ├── SKILL.md          # Fusionne ADR-0043, ADR-0055
│   │   └── references/
│   │       ├── adr-0043.md
│   │       └── adr-0055.md
│   └── error-handling/
│       └── SKILL.md
```

**SKILL.md pour le domaine database :**

```yaml
---
name: database-conventions
description: >
  Conventions base de données du projet. Applique ces règles pour tout
  code lié à PostgreSQL, migrations, requêtes SQL, et schéma de données.
---
```

```markdown
# Conventions Base de Données

Basé sur ADR-0042, ADR-0051, ADR-0067.

## PostgreSQL (ADR-0042)
- PostgreSQL 16+ exclusivement
- Prepared statements obligatoires
- Index GIN pour JSONB, pgvector pour embeddings

## Nommage (ADR-0051)
- Tables : snake_case, pluriel (`users`, `order_items`)
- Colonnes : snake_case, singulier (`created_at`, `user_id`)
- Clés étrangères : `<table_singulier>_id`

## Migrations (ADR-0067)
- Outil : golang-migrate
- Fichier : `migrations/<timestamp>_<description>.up.sql`
- Toute migration doit être réversible (`.down.sql` obligatoire)
- Pas de `DROP COLUMN` sans migration de données préalable
```

**Quand utiliser** : quand les ADR sont nombreux et que les regrouper par domaine donne un contexte plus cohérent à l'agent.

### Stratégie 3 — Hybride avec contrôle d'invocation

Combine les deux stratégies en utilisant le frontmatter pour contrôler quand chaque skill est chargé.

```yaml
---
name: database-conventions
description: >
  Conventions base de données. Chargé automatiquement pour tout code SQL,
  migrations, ou modèles de données.
---
```

```yaml
---
name: adr-0099-deprecated-oracle
description: Décision historique de migration Oracle → PostgreSQL.
disable-model-invocation: true
---
```

Le premier skill est chargé automatiquement par l'agent quand il détecte du code lié aux bases de données. Le second n'est accessible que manuellement (`/adr-0099-deprecated-oracle`) pour consultation historique.

## Écrire un bon `description` depuis un ADR

Le champ `description` est **critique** : c'est lui qui permet à l'agent de décider quand charger le skill. Il faut le transformer depuis le "Contexte" et la "Décision" de l'ADR.

### Mauvais

```yaml
description: ADR sur PostgreSQL
```

L'agent ne sait pas quand l'appliquer.

### Bon

```yaml
description: >
  Architecture decision: PostgreSQL est la base de données principale.
  Applique ces règles pour tout code touchant à la persistance,
  aux migrations, aux requêtes SQL, ou au schéma de données.
```

L'agent comprend le **quoi** (PostgreSQL) et le **quand** (persistance, migrations, SQL).

### Patron de description

```
Architecture decision: <décision en une phrase>.
Applique ces règles pour tout code <domaine d'application>.
```

## Transformer le contenu d'un ADR en instructions

Un ADR est écrit pour des humains qui évaluent des alternatives. Un skill est écrit pour un agent qui doit **exécuter**. La transformation doit :

| ADR (humain)                            | SKILL.md (agent)                              |
|:----------------------------------------|:----------------------------------------------|
| "Nous avons évalué X, Y, Z"            | Supprimer — l'agent n'a pas besoin du raisonnement |
| "Nous choisissons X"                   | "Utiliser X"                                  |
| "Les conséquences sont..."             | "Règles à suivre : ..."                       |
| "Ce choix implique que..."             | "Ne jamais faire Y, toujours faire Z"         |
| Liens vers discussions/tickets          | Supprimer — garder en `references/` si besoin |

### Règles de rédaction

1. **Impératif** : "Utiliser", "Ne jamais", "Toujours", "Préférer"
2. **Concret** : inclure des exemples de code (bon et mauvais)
3. **Actionnable** : chaque point doit pouvoir être vérifié dans un code review
4. **Concis** : un skill ne devrait pas dépasser ~200 lignes
5. **Contextuel** : mentionner les fichiers/dossiers concernés quand c'est possible

## Accompagner les skills d'outils (MCP + Hooks)

Les ADR qui impliquent des outils ou des vérifications peuvent être enrichis avec des MCP servers et des hooks.

### Exemple : ADR qui impose un linter SQL

```
adr-repo/
├── skills/
│   └── database-conventions/
│       ├── SKILL.md
│       └── hooks.json
```

**hooks.json** — lancer sqlfluff après chaque modification de fichier SQL :

```json
{
  "hooks": {
    "sql-lint": {
      "description": "Lint SQL files after edits",
      "claude-code": {
        "PostToolUse": [
          {
            "matcher": "Edit",
            "hooks": [
              {
                "type": "command",
                "command": "sqlfluff lint --dialect postgres $CLAUDE_FILE_PATHS"
              }
            ]
          }
        ]
      }
    }
  }
}
```

### Exemple : ADR qui requiert un service externe

```
adr-repo/
├── skills/
│   └── observability-conventions/
│       ├── SKILL.md
│       └── mcp.json
```

**mcp.json** — exposer un serveur MCP pour interroger les dashboards :

```json
{
  "mcpServers": {
    "grafana": {
      "command": "npx",
      "args": ["-y", "@mcp/grafana-server"],
      "env": {
        "GRAFANA_URL": "${GRAFANA_URL}",
        "GRAFANA_TOKEN": "${GRAFANA_TOKEN}"
      }
    }
  }
}
```

## Workflow d'installation

Une fois le repo ADR structuré en skills :

```bash
# Installer toutes les décisions d'architecture
npx maconfai install github.com/mon-org/adr-repo

# Installer uniquement les conventions base de données
npx maconfai install github.com/mon-org/adr-repo --skills=database-conventions

# Installer pour Cursor uniquement
npx maconfai install github.com/mon-org/adr-repo --agents=cursor

# Mettre à jour après modification d'un ADR
npx maconfai install github.com/mon-org/adr-repo
```

Résultat dans le projet cible :

```
mon-projet/
├── .agents/skills/
│   ├── database-conventions/
│   │   └── SKILL.md
│   └── api-conventions/
│       └── SKILL.md
├── .claude/skills/
│   ├── database-conventions -> ../../.agents/skills/database-conventions
│   └── api-conventions -> ../../.agents/skills/api-conventions
├── .cursor/skills/
│   ├── database-conventions -> ../../.agents/skills/database-conventions
│   └── api-conventions -> ../../.agents/skills/api-conventions
└── ai-lock.json
```

## Script de conversion automatique

Un script simple pour convertir un dossier d'ADR en structure skills :

```bash
#!/bin/bash
# convert-adr-to-skills.sh <adr-dir> <output-dir>
ADR_DIR="${1:-.}"
OUTPUT_DIR="${2:-skills}"

mkdir -p "$OUTPUT_DIR"

for adr_file in "$ADR_DIR"/*.md; do
  [ -f "$adr_file" ] || continue

  # Extraire le nom depuis le fichier (ex: 0042-use-postgresql.md → adr-0042-use-postgresql)
  basename=$(basename "$adr_file" .md)
  skill_name="adr-${basename}"
  skill_dir="$OUTPUT_DIR/$skill_name"

  mkdir -p "$skill_dir/references"

  # Copier l'ADR original en référence
  cp "$adr_file" "$skill_dir/references/"

  # Extraire le titre (première ligne commençant par #)
  title=$(grep -m1 '^#' "$adr_file" | sed 's/^#\+\s*//')

  # Générer un SKILL.md squelette
  cat > "$skill_dir/SKILL.md" << EOF
---
name: $skill_name
description: |
  Architecture decision: $title.
  TODO: Compléter avec le domaine d'application de cette décision.
---

# $title

TODO: Transformer les conséquences de l'ADR en règles impératives.

Voir l'ADR original dans references/.
EOF

  echo "Created $skill_dir/SKILL.md"
done
```

## Gérer le cycle de vie

### ADR Accepté → Skill actif

```yaml
---
name: adr-0042-postgresql
description: Conventions PostgreSQL pour la persistance.
---
```

### ADR Déprécié → Skill en consultation seule

```yaml
---
name: adr-0012-mongodb
description: "[DÉPRÉCIÉ] Ancien choix MongoDB, remplacé par ADR-0042."
disable-model-invocation: true
---
```

### ADR Remplacé → Suppression du skill

Utiliser `npx maconfai uninstall` pour retirer le skill, ou simplement supprimer le dossier du repo source.

## Résumé

| Étape | Action |
|:------|:-------|
| 1. Structure | Organiser le repo ADR avec un dossier `skills/` |
| 2. Conversion | Transformer chaque ADR (ou groupe) en `SKILL.md` |
| 3. Description | Écrire un `description` qui décrit quand appliquer la décision |
| 4. Instructions | Réécrire le contenu en règles impératives et actionnables |
| 5. Enrichissement | Ajouter `mcp.json` / `hooks.json` si l'ADR implique des outils |
| 6. Installation | `npx maconfai install` depuis n'importe quel projet |
| 7. Maintenance | Mettre à jour les skills quand les ADR évoluent |
