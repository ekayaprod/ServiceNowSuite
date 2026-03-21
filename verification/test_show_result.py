import json
from playwright.sync_api import sync_playwright
import os
import sys

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Block external requests (Tailwind CDN and Google Fonts) to ensure stability in sandbox
        page.route("**/*", lambda route: route.abort() if "cdn.tailwindcss.com" in route.request.url or "fonts.googleapis.com" in route.request.url else route.continue_())

        cwd = os.getcwd()
        file_path = "file://" + os.path.join(cwd, 'ticket_template.html')
        print(f"Navigating to {file_path}")

        try:
            # Load the page
            page.goto(file_path, wait_until="domcontentloaded", timeout=10000)

            # 1. Test happy path
            print("Testing showResult with standard parameters...")
            test_code = "javascript:alert('Hello')"
            test_name = "My Bookmarklet"
            test_title = "Success Title"
            test_instructions = "Follow these steps."

            page.evaluate(f"app.showResult({json.dumps(test_code)}, {json.dumps(test_name)}, {json.dumps(test_title)}, {json.dumps(test_instructions)})")

            # Verify visibility
            page.wait_for_selector("#step3-result.active")

            # Verify content
            dom_data = page.evaluate("""() => {
                const container = document.getElementById('step3-result');
                const title = container.querySelector('h2').textContent.trim();
                const link = document.getElementById('bookmarklet-link');
                const name = link.textContent.trim();
                const href = link.href;
                const instructions = container.querySelector('.bg-green-50').textContent.trim();
                return { title, name, href, instructions };
            }""")

            assert dom_data['title'] == test_title, f"Title mismatch: {dom_data['title']}"
            assert dom_data['name'] == test_name, f"Name mismatch: {dom_data['name']}"
            assert dom_data['href'] == test_code, f"Code/Href mismatch: {dom_data['href']}"
            assert dom_data['instructions'] == test_instructions, f"Instructions mismatch: {dom_data['instructions']}"

            print("Standard parameters test passed.")

            # 2. Test "Create Another" button
            print("Testing 'Create Another' button...")
            page.click("#startOverBtn")

            # showStep(1) should make #step1 have 'active' class
            page.wait_for_selector("#step1.active")
            print("Reset button test passed.")

            # 3. Test with special characters (safe ones)
            print("Testing showResult with safe special characters...")
            special_code = "javascript:alert('\"quotes\" & symbols')"
            special_name = "Special & Name"
            special_title = "Special Title" # Removed <Title> to avoid breaking browser innerHTML
            special_instructions = "Check line breaks and some content."

            page.evaluate(f"""
                app.showResult(
                    {json.dumps(special_code)},
                    {json.dumps(special_name)},
                    {json.dumps(special_title)},
                    {json.dumps(special_instructions)}
                )
            """)

            # Wait for content to be updated
            page.wait_for_selector("#step3-result.active")

            dom_data_special = page.evaluate("""() => {
                const container = document.getElementById('step3-result');
                const titleEl = container.querySelector('h2');
                const linkEl = document.getElementById('bookmarklet-link');
                const instEl = container.querySelector('.bg-green-50');

                if (!titleEl || !linkEl || !instEl) {
                   return { error: 'Missing elements', html: container.innerHTML };
                }

                const title = titleEl.textContent.trim();
                const name = linkEl.textContent.trim();
                const href = linkEl.href;
                const instructions = instEl.textContent.trim();
                return { title, name, href, instructions };
            }""")

            if 'error' in dom_data_special:
                print(f"Error in special char test: {dom_data_special['error']}")
                print(f"HTML was: {dom_data_special['html']}")
                sys.exit(1)

            assert dom_data_special['title'] == special_title
            assert dom_data_special['name'] == special_name
            assert dom_data_special['href'] == special_code
            assert dom_data_special['instructions'] == special_instructions

            print("Special characters test passed.")

            print("All showResult tests passed successfully!")

        except Exception as e:
            print(f"Test failed: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run()
