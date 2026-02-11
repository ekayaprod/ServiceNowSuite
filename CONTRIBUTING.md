# Contributing to ServiceNow Bookmarklet Suite

## Project Structure
This project is a collection of **static HTML files** with zero build dependencies.
- `ticket_template.html`: Main hub and template builder.
- `ticket_automation.html`: Complex rule-based automation.
- `data_extractor.html`: CSV export tool.

## Development Workflow
1.  **No Package Manager**: There is no `package.json`. No `npm install` is required.
2.  **Run Locally**: Open any `.html` file directly in your browser.
3.  **Styling**: Uses Tailwind CSS via CDN.

## Code Guidelines
*   **Shared Logic**: The `findEnv` function is duplicated across all HTML files. If you update it in one place, you **must update it in all three files**.
*   **Embedded JavaScript**: Bookmarklet logic is stored in string variables (e.g., `const builderCode = ...`).
    *   Keep this code compact.
    *   Avoid comments inside these strings as they increase bookmarklet size.
    *   Use `encodeURIComponent` for the final output.

## Testing
1.  Make changes to the HTML/JS.
2.  Refresh the local file in your browser.
3.  Generate the bookmarklet.
4.  Test against a live ServiceNow instance or mock.
