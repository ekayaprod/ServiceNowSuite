import os
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        cwd = os.getcwd()
        file_path = os.path.join(cwd, 'ticket_template.html')
        print(f"Opening file: {file_path}")
        page.goto(f"file://{file_path}")
        page.screenshot(path="verification/ticket_template.png")
        print("Screenshot saved to verification/ticket_template.png")
        browser.close()

if __name__ == "__main__":
    run()
