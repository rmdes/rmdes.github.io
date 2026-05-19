# rmdes.github.io

Personal landing page and curated project portfolio served at <https://rmdes.github.io/>.

## Adding a project to the portfolio

Edit `repos.json` and add an entry under `projects`:

    {
      "repo": "your-repo-name",
      "title": "Display Name",
      "tagline": "One-line description.",
      "site": "https://rmdes.github.io/your-repo-name/",
      "tags": ["tag-one", "tag-two"]
    }

- `repo`, `title`, `tagline` are required.
- `site` is optional. If absent, the card links to the GitHub repo instead.
- `tags` is optional.

Array order = display order.

## Stack

Plain HTML + CSS + vanilla JS. No build, no dependencies. Auto-deployed by GitHub Pages on push to `main`.

Stars / language / last-update on each card are fetched live from the GitHub REST API at page load. Cards degrade gracefully (live row hidden) if the API is rate-limited.

## Project pages

Each featured project owns its own GitHub Pages deploy at `https://rmdes.github.io/<repo-name>/`. The portfolio just links to them.
