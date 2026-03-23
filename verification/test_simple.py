from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        cwd = os.getcwd()
        file_path = "file://" + os.path.join(cwd, 'ticket_template.html')
        print(f"Navigating to {file_path}")
        try:
            page.goto(file_path, wait_until="domcontentloaded", timeout=10000)
            print(f"Title: {page.title()}")
        except Exception as e:
            print(f"Error: {e}")
        browser.close()

if __name__ == "__main__":
    run()
