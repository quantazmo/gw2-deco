# GW2 Decoration Editor

GW2 Decoration Editor is a browser-based tool for loading, editing, and exporting Guild Wars 2 homestead decoration layouts.

The project uses a clean architecture split into UI, application, domain, and infrastructure layers to keep business logic testable and independent from browser concerns.

## Project Summary

- Load homestead layouts from XML
- Organize decorations into layers
- Create, move, and remove decorations
- Navigate maps with pan and zoom
- Undo and redo editing actions
- Export updated layouts back to XML

## Tech Stack

- JavaScript (ES modules)
- Browser UI with static assets
- Jest for unit/integration testing
- Playwright for end-to-end testing

## Repository Layout

```text
src/
  application/      # Commands, handlers, app services
  domain/           # Core entities and business rules
  infrastructure/   # Repositories, adapters, API integration
  ui/               # UI components and state wiring

tests/              # Unit, integration, and UI-oriented tests
e2e/                # Playwright end-to-end tests
docs/               # Architecture and feature documentation
```

## Quick Start

### 1. Prerequisites

- Node.js 18+ (recommended)
- npm
- A modern browser (Chrome, Edge, Firefox, Safari)

### 2. Install dependencies

```bash
npm install
```

### 3. Run the app locally

Serve the repository root as a static site, then open it in a browser.

Option A (Python):

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Option B (VS Code):

- Open the project in VS Code
- Use a static server extension such as Live Server
- Launch from the workspace root

## Running Tests

```bash
npm test
```

Watch mode:

```bash
npm run test:watch
```

Coverage:

```bash
npm run test:coverage
```

End-to-end tests:

```bash
npx playwright test
```

## Documentation

- [Architecture](docs/architecture.md)
- [Domain Model](docs/domain-model.md)
- [Coordinate Systems](docs/coordinate-systems.md)
- [API Guide](docs/api-guide.md)
- [Adding Features](docs/adding-features.md)

## License

This project is licensed under the GNU General Public License v3.0 or later.
See [LICENSE](LICENSE).
