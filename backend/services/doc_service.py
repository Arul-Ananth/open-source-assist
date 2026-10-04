"""Service layer for official documentation catalog and user-tailored recommendation."""

import re
from typing import Any
from backend.schemas.docs import (
    DocCategoryResponse,
    DocDifficulty,
    DocsCatalogResponse,
    DocumentItemResponse,
)

RAW_CATEGORIES: list[dict[str, str]] = [
    {"id": "getting-started", "label": "Getting Started", "description": "Foundations for open source and GitHub newcomers."},
    {"id": "git", "label": "Git", "description": "Core version control workflows, branching, and conflict resolution."},
    {"id": "github", "label": "GitHub", "description": "Repository management, Actions CI/CD, and project health."},
    {"id": "pull-requests", "label": "Pull Requests", "description": "PR creation, reviewing guidelines, and collaboration etiquette."},
    {"id": "community", "label": "Community", "description": "Codes of conduct, governance models, and open source funding."},
    {"id": "writing", "label": "Writing & Docs", "description": "Technical documentation frameworks, Markdown, and semantic versioning."},
    {"id": "programs", "label": "Programs & Events", "description": "Paid internships, fellowships, and student programs like GSoC."},
    {"id": "legal", "label": "Licensing & Legal", "description": "Open source licenses, compliance, and IP considerations."},
    {"id": "help", "label": "Support & Safety", "description": "Troubleshooting, community support, and GitHub status."},
]

RAW_DOCUMENTS: list[dict[str, Any]] = [
    # ---------- Getting Started ----------
    {
        "id": "github-docs-home",
        "title": "GitHub Docs — Home",
        "description": "The official starting point for everything GitHub: guides, references and how-tos.",
        "url": "https://docs.github.com/",
        "category": "getting-started",
        "source": "GitHub",
        "tags": ["github", "official", "docs", "reference"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "hello-world-quickstart",
        "title": "Hello World — GitHub Quickstart",
        "description": "GitHub’s official 10-minute intro: create a repo, branch, commit and open a PR.",
        "url": "https://docs.github.com/en/get-started/start-your-journey/hello-world",
        "category": "getting-started",
        "source": "GitHub",
        "tags": ["quickstart", "beginner", "first-pr", "tutorial"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "github-quickstart-newcomers",
        "title": "GitHub Quickstart for Newcomers",
        "description": "Set up Git, learn the daily workflow (clone → branch → commit → PR) in one guide.",
        "url": "https://docs.github.com/en/get-started/quickstart",
        "category": "getting-started",
        "source": "GitHub",
        "tags": ["setup", "git", "workflow", "beginner"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "set-up-git",
        "title": "Set Up Git",
        "description": "Install and configure Git locally with your identity, SSH keys and default editor.",
        "url": "https://docs.github.com/en/get-started/getting-started-with-git/set-up-git",
        "category": "getting-started",
        "source": "GitHub",
        "tags": ["install", "ssh", "configuration", "setup"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "how-to-contribute-guide",
        "title": "Open Source Guides — How to Contribute",
        "description": "The classic guide on how to contribute to open source by GitHub’s opensource.com team.",
        "url": "https://opensource.guide/how-to-contribute/",
        "category": "getting-started",
        "source": "Open Source Guides",
        "tags": ["contribution", "beginner", "first-issue", "etiquette"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "first-contributions",
        "title": "First Contributions",
        "description": "Hands-on tutorial repo that walks you through your first PR in minutes.",
        "url": "https://github.com/firstcontributions/first-contributions",
        "category": "getting-started",
        "source": "firstcontributions",
        "tags": ["hands-on", "first-pr", "practice", "beginner"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },

    # ---------- Git ----------
    {
        "id": "pro-git-book",
        "title": "Pro Git — The Book",
        "description": "The complete, free, official Git book. Chapters 2–3 cover everything daily work needs.",
        "url": "https://git-scm.com/book/en/v2",
        "category": "git",
        "source": "git-scm.com",
        "tags": ["book", "reference", "branching", "complete"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "git-reference-docs",
        "title": "Git Reference Documentation",
        "description": "Full command reference for every git subcommand, straight from the source.",
        "url": "https://git-scm.com/docs",
        "category": "git",
        "source": "git-scm.com",
        "tags": ["reference", "commands", "manual"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "learn-git-branching",
        "title": "Learn Git Branching",
        "description": "Interactive visual playground — the best way to actually understand branches and rebasing.",
        "url": "https://learngitbranching.js.org/",
        "category": "git",
        "source": "learngitbranching.js.org",
        "tags": ["interactive", "branching", "rebase", "visual"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "resolving-merge-conflict",
        "title": "Resolving a Merge Conflict",
        "description": "Official step-by-step for understanding and resolving merge conflicts on GitHub.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/addressing-merge-conflicts/resolving-a-merge-conflict-using-the-command-line",
        "category": "git",
        "source": "GitHub",
        "tags": ["merge-conflict", "troubleshooting", "command-line"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "undoing-things-git",
        "title": "Undoing Things in Git",
        "description": "Amend, restore, reset and revert — fix mistakes safely at every stage.",
        "url": "https://git-scm.com/book/en/v2/Git-Basics-Undoing-Things",
        "category": "git",
        "source": "git-scm.com",
        "tags": ["undo", "reset", "revert", "fix"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "rewriting-history-git",
        "title": "Rewriting History",
        "description": "Rebase, cherry-pick and amend like a pro — with the caveats for shared branches.",
        "url": "https://git-scm.com/book/en/v2/Git-Tools-Rewriting-History",
        "category": "git",
        "source": "git-scm.com",
        "tags": ["rebase", "amend", "history", "advanced"],
        "target_skill_level": DocDifficulty.ADVANCED,
    },

    # ---------- GitHub platform ----------
    {
        "id": "understanding-github-flow",
        "title": "Understanding the GitHub Flow",
        "description": "The lightweight branch-based workflow used by most open source projects.",
        "url": "https://docs.github.com/en/get-started/using-github/github-flow",
        "category": "github",
        "source": "GitHub",
        "tags": ["workflow", "branching", "best-practice"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "about-issues",
        "title": "About Issues",
        "description": "How to read, triage and use issues effectively — where every contribution starts.",
        "url": "https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues",
        "category": "github",
        "source": "GitHub",
        "tags": ["issues", "triage", "planning"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "github-actions-docs",
        "title": "GitHub Actions — Documentation",
        "description": "Automate builds, tests and releases. Official docs for CI/CD on GitHub.",
        "url": "https://docs.github.com/en/actions",
        "category": "github",
        "source": "GitHub",
        "tags": ["ci", "cd", "automation", "workflows"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "about-readmes",
        "title": "About READMEs",
        "description": "Write a README that makes people want to use (and contribute to) your project.",
        "url": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes",
        "category": "github",
        "source": "GitHub",
        "tags": ["readme", "markdown", "project-setup"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "securing-your-repo",
        "title": "Securing Your Repository",
        "description": "Dependabot, secret scanning and branch protection — the security essentials.",
        "url": "https://docs.github.com/en/code-security",
        "category": "github",
        "source": "GitHub",
        "tags": ["security", "dependabot", "protection"],
        "target_skill_level": DocDifficulty.ADVANCED,
    },

    # ---------- Pull Requests ----------
    {
        "id": "about-pull-requests",
        "title": "About Pull Requests",
        "description": "The core concept explained: what a PR is, how review and merge work.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests",
        "category": "pull-requests",
        "source": "GitHub",
        "tags": ["pr", "review", "merge", "core-concept"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "creating-pull-request",
        "title": "Creating a Pull Request",
        "description": "Official walkthrough for opening a PR from a branch or a fork.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/creating-a-pull-request",
        "category": "pull-requests",
        "source": "GitHub",
        "tags": ["pr", "fork", "workflow", "how-to"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "reviewing-changes-prs",
        "title": "Reviewing Changes in Pull Requests",
        "description": "How to review code politely and effectively — a skill for both sides of the PR.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests",
        "category": "pull-requests",
        "source": "GitHub",
        "tags": ["review", "feedback", "collaboration"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "requesting-pr-review",
        "title": "Requesting a PR Review",
        "description": "How to ask for review, manage reviewers and keep your PR moving.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review",
        "category": "pull-requests",
        "source": "GitHub",
        "tags": ["review", "request", "workflow"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "keeping-branch-in-sync",
        "title": "Keeping Your Branch Up to Date",
        "description": "Sync a fork, rebase onto upstream, and keep PR diffs clean.",
        "url": "https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/keeping-your-branch-in-sync",
        "category": "pull-requests",
        "source": "GitHub",
        "tags": ["sync", "fork", "upstream", "rebase"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },

    # ---------- Community ----------
    {
        "id": "building-welcoming-community",
        "title": "Building a Welcoming Community",
        "description": "Official GitHub guide to building healthy, growing open source communities.",
        "url": "https://docs.github.com/en/communities",
        "category": "community",
        "source": "GitHub",
        "tags": ["community", "moderation", "growing"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "code-of-conduct-adding",
        "title": "Code of Conduct — Adding One",
        "description": "Why every project needs one and how to add it to your repo.",
        "url": "https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-code-of-conduct-to-your-project",
        "category": "community",
        "source": "GitHub",
        "tags": ["code-of-conduct", "safety", "moderation"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "towns-governance-oss",
        "title": "Towns & Governance in Open Source",
        "description": "How real projects make decisions, from benevolent dictators to foundations.",
        "url": "https://opensource.guide/leadership-and-governance/",
        "category": "community",
        "source": "Open Source Guides",
        "tags": ["governance", "leadership", "decisions"],
        "target_skill_level": DocDifficulty.ADVANCED,
    },
    {
        "id": "getting-paid-oss",
        "title": "Getting Paid for Open Source",
        "description": "Sponsorships, grants and funding models for sustainable open source work.",
        "url": "https://opensource.guide/getting-paid/",
        "category": "community",
        "source": "Open Source Guides",
        "tags": ["funding", "sponsors", "sustainability"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "finding-users-project",
        "title": "Finding Users of Your Project",
        "description": "Growing adoption and building a user base around your project.",
        "url": "https://opensource.guide/building-community/",
        "category": "community",
        "source": "Open Source Guides",
        "tags": ["adoption", "growth", "users"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },

    # ---------- Writing & Docs ----------
    {
        "id": "documentation-system-divio",
        "title": "The Documentation System",
        "description": "The famous four-quadrant framework: tutorials, how-tos, reference and explanation.",
        "url": "https://documentation.divio.com/",
        "category": "writing",
        "source": "divio.com",
        "tags": ["docs", "structure", "best-practice", "framework"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "writing-on-github",
        "title": "Writing on GitHub",
        "description": "Markdown formatting, task lists, tables, math and alerts — the full reference.",
        "url": "https://docs.github.com/en/get-started/writing-on-github",
        "category": "writing",
        "source": "GitHub",
        "tags": ["markdown", "formatting", "gfm", "writing"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "starting-open-source-project",
        "title": "Starting an Open Source Project",
        "description": "Checklist for launching your own project the right way.",
        "url": "https://opensource.guide/starting-a-project/",
        "category": "writing",
        "source": "Open Source Guides",
        "tags": ["new-project", "launch", "checklist"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "semantic-versioning",
        "title": "Semantic Versioning",
        "description": "The MAJOR.MINOR.PATCH contract that keeps dependencies from breaking.",
        "url": "https://semver.org/",
        "category": "writing",
        "source": "semver.org",
        "tags": ["versioning", "releases", "spec"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "keep-a-changelog",
        "title": "Keep a Changelog",
        "description": "How to write changelogs humans actually want to read.",
        "url": "https://keepachangelog.com/",
        "category": "writing",
        "source": "keepachangelog.com",
        "tags": ["changelog", "releases", "communication"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "conventional-commits",
        "title": "Conventional Commits",
        "description": "A spec for commit messages that powers automated changelogs and releases.",
        "url": "https://www.conventionalcommits.org/",
        "category": "writing",
        "source": "conventionalcommits.org",
        "tags": ["commits", "spec", "automation"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },

    # ---------- Programs & Events ----------
    {
        "id": "google-summer-of-code",
        "title": "Google Summer of Code",
        "description": "The flagship program paying newcomers to contribute to open source orgs.",
        "url": "https://summerofcode.withgoogle.com/",
        "category": "programs",
        "source": "Google",
        "tags": ["gsoc", "internship", "paid", "program"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },
    {
        "id": "hacktoberfest",
        "title": "Hacktoberfest",
        "description": "DigitalOcean’s month-long open source celebration every October.",
        "url": "https://hacktoberfest.com/",
        "category": "programs",
        "source": "DigitalOcean",
        "tags": ["hacktoberfest", "event", "october", "beginner"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "outreachy",
        "title": "Outreachy",
        "description": "Paid internships in open source for underrepresented groups.",
        "url": "https://www.outreachy.org/",
        "category": "programs",
        "source": "Software Freedom Conservancy",
        "tags": ["internship", "paid", "diversity", "program"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "github-campus-experts",
        "title": "GitHub Campus Experts",
        "description": "Build open source communities on your campus with GitHub’s support.",
        "url": "https://education.github.com/experts",
        "category": "programs",
        "source": "GitHub Education",
        "tags": ["students", "campus", "leadership"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },
    {
        "id": "github-student-pack",
        "title": "GitHub Student Developer Pack",
        "description": "Free tools, credits and services for student developers.",
        "url": "https://education.github.com/pack",
        "category": "programs",
        "source": "GitHub Education",
        "tags": ["students", "free", "tools", "credits"],
        "target_skill_level": DocDifficulty.BEGINNER,
    },

    # ---------- Licensing & Legal ----------
    {
        "id": "choose-an-open-source-license",
        "title": "Choose an Open Source License",
        "description": "The interactive license chooser used by most new projects.",
        "url": "https://choosealicense.com/",
        "category": "legal",
        "source": "GitHub",
        "tags": ["license", "mit", "gpl", "chooser"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "licensing-a-repository",
        "title": "Licensing a Repository",
        "description": "How to place a license file in your repo and what it means legally.",
        "url": "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository",
        "category": "legal",
        "source": "GitHub",
        "tags": ["license", "repository", "legal"],
        "target_skill_level": DocDifficulty.INTERMEDIATE,
    },

    # ---------- Support & Safety ----------
    {
        "id": "github-support",
        "title": "GitHub Support",
        "description": "Official help portal for account, billing and platform issues.",
        "url": "https://support.github.com/",
        "category": "help",
        "source": "GitHub",
        "tags": ["support", "account", "help"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "github-community-forum",
        "title": "GitHub Community Forum",
        "description": "Ask questions and share knowledge with other GitHub users.",
        "url": "https://github.community/",
        "category": "help",
        "source": "GitHub",
        "tags": ["forum", "questions", "community"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "reporting-abuse-spam",
        "title": "Reporting Abuse or Spam",
        "description": "How to report abusive users, repos and content on GitHub.",
        "url": "https://docs.github.com/en/site-policy/github-terms/github-community-guidelines",
        "category": "help",
        "source": "GitHub",
        "tags": ["abuse", "reporting", "safety", "guidelines"],
        "target_skill_level": DocDifficulty.ALL,
    },
    {
        "id": "github-status",
        "title": "GitHub Status",
        "description": "Live status of GitHub services — check here before blaming your internet.",
        "url": "https://www.githubstatus.com/",
        "category": "help",
        "source": "GitHub",
        "tags": ["status", "outage", "uptime"],
        "target_skill_level": DocDifficulty.ALL,
    },
]


def _normalize(text: str) -> str:
    return re.sub(r"[^\w\s]", " ", text.lower()).strip()


class DocService:
    """Service handling official documentation catalog, filtering, and personalized ranking."""

    def get_categories(self) -> list[DocCategoryResponse]:
        return [DocCategoryResponse(**cat) for cat in RAW_CATEGORIES]

    def get_documents(
        self,
        category: str | None = None,
        query: str | None = None,
        user_skill_level: str | None = None,
        user_context: str | None = None,
    ) -> DocsCatalogResponse:
        filtered = list(RAW_DOCUMENTS)

        # 1. Filter by category
        if category and category != "all":
            filtered = [d for d in filtered if d["category"] == category]

        # 2. Extract search terms
        terms: list[str] = []
        if query and query.strip():
            terms = [_normalize(t) for t in query.strip().split() if t.strip()]

        # 3. Context keywords for personalization
        context_keywords: set[str] = set()
        if user_context:
            context_keywords = {
                _normalize(w)
                for w in user_context.split()
                if len(w) > 3
            }

        normalized_level = (user_skill_level or "").strip().lower()

        scored_items: list[tuple[float, dict[str, Any], bool, str | None]] = []

        for doc in filtered:
            score = 0.0
            is_rec = False
            rec_reason: str | None = None

            doc_title = _normalize(doc["title"])
            doc_desc = _normalize(doc["description"])
            doc_source = _normalize(doc["source"])
            doc_tags = [_normalize(t) for t in doc["tags"]]
            doc_level = doc["target_skill_level"].value

            # Search scoring
            if terms:
                for t in terms:
                    if t in doc_title:
                        score += 20.0
                    elif any(t in tag for tag in doc_tags):
                        score += 15.0
                    elif t in doc_source:
                        score += 10.0
                    elif t in doc_desc:
                        score += 5.0
                # If searching and zero match, exclude
                if score == 0.0:
                    continue

            # Personalization scoring based on assessed skill level & user context
            if normalized_level:
                if doc_level == normalized_level:
                    score += 12.0
                    is_rec = True
                    rec_reason = f"Matches your assessed {normalized_level} skill level"
                elif doc_level == "all":
                    score += 4.0

            if context_keywords:
                matched_tags = [t for t in doc_tags if t in context_keywords]
                if matched_tags:
                    score += 15.0 * len(matched_tags)
                    is_rec = True
                    reason_suffix = f"and technical focus ({', '.join(matched_tags)})"
                    rec_reason = f"{rec_reason} {reason_suffix}" if rec_reason else f"Matches your background in {', '.join(matched_tags)}"

            scored_items.append((score, doc, is_rec, rec_reason))

        # Sort: if query or personalization is active, sort by highest score first
        if terms or normalized_level or context_keywords:
            scored_items.sort(key=lambda x: x[0], reverse=True)

        result_items: list[DocumentItemResponse] = []
        for _, raw_doc, is_rec, rec_reason in scored_items:
            result_items.append(
                DocumentItemResponse(
                    id=raw_doc["id"],
                    title=raw_doc["title"],
                    description=raw_doc["description"],
                    url=raw_doc["url"],
                    category=raw_doc["category"],
                    source=raw_doc["source"],
                    tags=raw_doc["tags"],
                    target_skill_level=raw_doc["target_skill_level"],
                    is_recommended=is_rec,
                    recommendation_reason=rec_reason,
                )
            )

        return DocsCatalogResponse(
            categories=self.get_categories(),
            items=result_items,
            total_count=len(result_items),
            user_skill_level=normalized_level or None,
            user_context=user_context or None,
            is_personalized=bool(normalized_level or user_context),
        )


doc_service = DocService()
