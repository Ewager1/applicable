# Applicable

A lightweight local tool for turning a pasted resume into a professionally formatted PDF.

Paste a complete resume, submit it, and download a PDF using one consistent template. Section order is fixed, while jobs appear in the order supplied in the source text. All wording comes from the pasted resume.

## Project status

The first PDF-rendering proof is implemented. It demonstrates the fixed template, automatic pagination, PDF download, and exact PDF preview using synthetic resumes. The paste-and-validate application is still being built.

See [proof setup, verification, and rendering decisions](proof/README.md). Local development requires Node.js 22 or newer and npm. The proof runs with `npm ci` followed by `npm run proof:serve`.

## Planned experience

- One expanding text box with a submit button above it.
- Simple feedback for missing or empty required content.
- One carefully tuned PDF template with automatic pagination.
- Local processing without accounts, AI services, or a database.
- A preview of the generated PDF if it can be provided reliably without complicating the interface.

## Development documents

- [Project specification](docs/project-spec.md)
- [Development plan](docs/project-plan.md)
- [Agent instructions](AGENTS.md)
- [Agent workflow](docs/agent-workflow.md)

The initial release will be downloadable and runnable locally. Installation and usage instructions will be added once the runtime and PDF generation approach have been verified.

## Project tracking

- [GitHub repository](https://github.com/Ewager1/applicable)
- [Applicable project board](https://github.com/users/Ewager1/projects/6)
