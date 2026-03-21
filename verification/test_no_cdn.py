from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Block external requests
        page.route("**/*", lambda route: route.abort() if "cdn.tailwindcss.com" in route.request.url or "fonts.googleapis.com" in route.request.url else route.continue_())

        cwd = os.getcwd()
        file_path = "file://" + os.path.join(cwd, 'ticket_template.html')
        print(f"Navigating to {file_path}")
        try:
            page.goto(file_path, wait_until="domcontentloaded", timeout=10000)
            print(f"Title: {page.title()}")

            # Try to call showResult via evaluate
            print("Testing showResult...")
            page.evaluate("""
                app.showResult('javascript:alert(1)', 'Test Name', 'Test Title', 'Test Instructions');
            """)

            # Check DOM
            res = page.evaluate("""
                const container = document.getElementById('step3-result');
                const title = container.querySelector('h2').textContent;
                const link = document.getElementById('bookmarklet-link');
                const name = link.textContent;
                const href = link.href;
                const instructions = container.querySelector('.bg-green-50').textContent.trim();
                const isActive = container.classList.contains('active');

                ({title, name, href, instructions, isActive})
            """)
            print(f"Result: {res}")

        except Exception as e:
            print(f"Error: {e}")
        browser.close()

if __name__ == "__main__":
    run()
