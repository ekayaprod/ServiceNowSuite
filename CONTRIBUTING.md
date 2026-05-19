# Contributing to ServiceNow Bookmarklet Suite

## Project Structure
This project is a **single-page application** (`index.html`) using modular JavaScript generators.

## Development Workflow
1.  **Testing Environment**: Tests are managed via `package.json`.
2.  **Dependencies**: Run `npm ci` to install test dependencies.
3.  **Run Locally**: Open `index.html` directly in your browser.
4.  **Styling**: Uses Tailwind CSS via CDN.

## Code Guidelines
*   **Generator Logic**: Bookmarklet generation logic is compartmentalized in `js/generators/*.js`.
*   **Embedded JavaScript**: Bookmarklet logic is stored in string variables (e.g., `const builderCode = ...`).
    *   Keep this code compact.
    *   Avoid comments inside these strings as they increase bookmarklet size.
    *   Use `encodeURIComponent` for the final output.

## Testing
1.  Run local unit tests via `npx jest --passWithNoTests`.
2.  Make changes to the HTML/JS (`index.html` and `js/generators/*.js`).
3.  Refresh the local file in your browser.
4.  Generate the bookmarklet.
5.  Test against a live ServiceNow instance or mock.
