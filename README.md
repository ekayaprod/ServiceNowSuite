# ⚡ ServiceNow Bookmarklet Suite: Personal Workflow Optimizer

**A strictly localized, zero-dependency client-side utility built to automate my personal ServiceNow tasks directly from the browser.**

## The Operational Bottleneck
This tool was created solely to optimize my individual daily workflow and eliminate manual data entry bottlenecks. Working in ServiceNow previously required heavy manual processing, slow multi-ticket updates across various queues, and repetitive keystrokes that presented high risks for data entry errors. I built these bookmarklets to reclaim hours of my own time, ensure my personal updates are perfectly standardized, and drastically reduce my time-to-resolution—all without relying on complex backends or enterprise-level deployments.

## Tech Stack & Architecture
- **JavaScript (ES6+)**: Core automation logic and DOM manipulation.
- **HTML/Tailwind CSS**: A static, local configuration hub (`index.html`).
- **ServiceNow Client-Side Context**: Utilizes native DOM structures (`g_form`, `gsft_main`).
- **Browser Bookmarklets**: Execution via standard browser bookmark URIs.
- **Zero Server Architecture**: Entirely localized client-side execution; no external APIs, databases, or tracking.

## Key Features & Workflow

The system uses a "meta-builder" concept: I open my local `index.html` hub to configure a builder bookmarklet. I run that builder once in ServiceNow to capture my personal context (like my User ID), which then outputs the final, highly specific automation tool I save to my bookmarks bar.

- **CWOPA List Automation**
  - *Workflow:* Generates a tool to bulk assign, rename, and close onboarding, transfer, and offboarding tickets directly from a list view.
  - *Function:* Intelligently formats ticket titles based on extracted variables and prevents me from needing to click into each ticket to update them.
- **Queue Interceptor**
  - *Workflow:* Actively monitors list views and automatically claims unassigned incoming tickets matching targeted keywords (e.g., "VPN").
  - *Function:* Eliminates manual refresh-and-click loops by instantly assigning relevant work to my scraped User ID.
- **Form Template**
  - *Workflow:* Scrapes my currently populated active form and turns it into a one-click auto-fill template.
  - *Function:* Allows me to instantly reproduce complex, perfectly populated forms without risking human error during repetitive manual entries.
- **Onboarding Extractor**
  - *Workflow:* Silently extracts hidden variable payloads (e.g., CWOPA IDs) from "onboard" list views using background iframes.
  - *Function:* Generates a client-side CSV download of ticket data for my local reporting workflows, bypassing the need for heavy API pulls.

## Localized Impact
This toolset has been a game changer for my individual productivity. By converting repetitive manual clicking into single-click bookmarklets, I have practically eliminated manual data entry errors from my workflow, dramatically reduced the time I spend syncing tickets, and removed the operational drag of standard UI navigation. **Note:** This is a personalized workflow optimization script, not an officially approved, team-wide, or enterprise deployment. All executions are strictly local to my browser session and utilize my existing authenticated access level.
