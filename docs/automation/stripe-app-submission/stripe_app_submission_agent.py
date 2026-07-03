import asyncio
import json
import sys
from pathlib import Path
from playwright.async_api import async_playwright, Page, BrowserContext
from datetime import datetime

class StripeAppSubmissionAgent:
    """Automates DSG Governance Gate submission to Stripe Marketplace"""

    def __init__(self, submission_data_path: str, stripe_email: str, stripe_password: str):
        self.data = self._load_submission_data(submission_data_path)
        self.stripe_email = stripe_email
        self.stripe_password = stripe_password
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.screenshot_dir = Path(f"submission_screenshots_{self.timestamp}")
        self.screenshot_dir.mkdir(exist_ok=True)
        self.log = []

    def _load_submission_data(self, path: str) -> dict:
        """Load submission metadata from JSON"""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _log(self, msg: str):
        """Print and record log message"""
        timestamp = datetime.now().isoformat()
        log_entry = f"[{timestamp}] {msg}"
        print(log_entry)
        self.log.append(log_entry)

    async def _take_screenshot(self, page: Page, name: str):
        """Take and save screenshot"""
        path = self.screenshot_dir / f"{name}.png"
        await page.screenshot(path=str(path), full_page=True)
        self._log(f"✓ Screenshot saved: {path}")
        return path

    async def _login(self, page: Page):
        """Log into Stripe Dashboard"""
        self._log("🔐 Starting Stripe login...")
        await page.goto("https://dashboard.stripe.com/login", wait_until="networkidle")
        await self._take_screenshot(page, "01_login_page")

        # Wait for email field and fill
        email_input = 'input[type="email"]'
        await page.wait_for_selector(email_input, timeout=10000)
        await page.fill(email_input, self.stripe_email)
        self._log(f"✓ Entered email: {self.stripe_email}")

        # Click submit
        await page.click('button[type="submit"]')

        # Wait for password field
        password_input = 'input[type="password"]'
        await page.wait_for_selector(password_input, timeout=10000)
        await page.fill(password_input, self.stripe_password)
        self._log("✓ Entered password")

        # Submit login
        await page.click('button[type="submit"]')

        # Wait for dashboard to load
        await page.wait_for_url("**/dashboard**", timeout=30000)
        self._log("✓ Login successful")
        await self._take_screenshot(page, "02_dashboard_home")

    async def _navigate_to_apps(self, page: Page):
        """Navigate to Apps section"""
        self._log("📱 Navigating to Apps section...")
        await page.goto("https://dashboard.stripe.com/apps", wait_until="networkidle")
        await self._take_screenshot(page, "03_apps_section")

    async def _create_new_app(self, page: Page):
        """Click 'Create an app' button"""
        self._log("➕ Creating new app...")

        # Look for "Create an app" button
        create_button = 'button:has-text("Create an app"), a:has-text("Create an app"), [data-testid*="create-app"]'
        await page.click('button, a', filter=lambda el: "Create" in (await el.inner_text()))

        await page.wait_for_url("**/create**", timeout=10000)
        self._log("✓ Create app form opened")
        await self._take_screenshot(page, "04_create_app_form")

    async def _fill_basic_info(self, page: Page):
        """Fill basic app information"""
        self._log("📝 Filling basic information...")
        data = self.data['app_metadata']
        desc = self.data['app_descriptions']

        # App name
        app_name_input = 'input[placeholder*="app"], input[name*="name"]'
        inputs = await page.query_selector_all('input')
        for inp in inputs:
            label = await page.evaluate("(el) => el.previousElementSibling?.textContent || el.placeholder || ''", inp)
            if "app" in label.lower() or "name" in label.lower():
                await inp.fill(data['app_name'])
                self._log(f"✓ App name: {data['app_name']}")
                break

        # Category (Risk Management)
        category_select = 'select, [role="listbox"], [role="combobox"]'
        try:
            await page.click('select:first-of-type')
            await page.click('option:has-text("Risk Management")')
            self._log("✓ Category: Risk Management")
        except:
            self._log("⚠ Category selection not found, skipping")

        # Short description (under 140 chars)
        short_desc = desc['short_description']
        textareas = await page.query_selector_all('textarea')
        if len(textareas) > 0:
            await textareas[0].fill(short_desc)
            self._log(f"✓ Short description ({len(short_desc)}/140 chars)")

        # Long description (under 4000 chars)
        long_desc = desc['long_description']
        if len(textareas) > 1:
            await textareas[1].fill(long_desc)
            self._log(f"✓ Long description ({len(long_desc)}/4000 chars)")

        await self._take_screenshot(page, "05_basic_info_filled")

    async def _upload_icon(self, page: Page):
        """Upload app icon (1200x1200 PNG)"""
        self._log("🎨 Uploading app icon...")
        icon_path = self.data['assets']['icon']['file']

        try:
            if Path(icon_path).exists():
                file_input = await page.query_selector('input[type="file"]')
                if file_input:
                    await file_input.set_input_files(icon_path)
                    await page.wait_for_timeout(2000)
                    self._log(f"✓ Icon uploaded: {icon_path}")
            else:
                self._log(f"⚠ Icon file not found: {icon_path}")
        except Exception as e:
            self._log(f"⚠ Icon upload failed: {e}")

        await self._take_screenshot(page, "06_icon_uploaded")

    async def _upload_screenshots(self, page: Page):
        """Upload app screenshots"""
        self._log("📸 Uploading screenshots...")
        screenshots = self.data['assets']['screenshots'][:3]  # Upload first 3

        for i, screenshot in enumerate(screenshots):
            screenshot_path = screenshot['file']
            try:
                if Path(screenshot_path).exists():
                    file_inputs = await page.query_selector_all('input[type="file"]')
                    if i < len(file_inputs):
                        await file_inputs[i].set_input_files(screenshot_path)
                        await page.wait_for_timeout(1500)
                        self._log(f"✓ Screenshot {i+1}: {screenshot['title']}")
                else:
                    self._log(f"⚠ Screenshot not found: {screenshot_path}")
            except Exception as e:
                self._log(f"⚠ Screenshot {i+1} upload failed: {e}")

        await self._take_screenshot(page, "07_screenshots_uploaded")

    async def _configure_oauth(self, page: Page):
        """Configure OAuth redirect URIs"""
        self._log("🔑 Configuring OAuth...")
        oauth_config = self.data['oauth_configuration']

        try:
            # Look for OAuth section
            uris = oauth_config['redirect_uris']
            for uri in uris:
                # Try to find and fill OAuth URI fields
                oauth_inputs = await page.query_selector_all('input[placeholder*="redirect"], input[placeholder*="uri"]')
                for inp in oauth_inputs:
                    current_val = await inp.input_value()
                    if not current_val:
                        await inp.fill(uri)
                        self._log(f"✓ OAuth URI: {uri}")
                        break
        except Exception as e:
            self._log(f"⚠ OAuth configuration failed: {e}")

        await self._take_screenshot(page, "08_oauth_configured")

    async def _configure_permissions(self, page: Page):
        """Configure app permissions"""
        self._log("🔐 Configuring permissions...")
        permissions = self.data['permissions']

        try:
            for perm in permissions:
                perm_name = perm['permission']
                # Look for permission checkboxes
                labels = await page.query_selector_all('label')
                for label in labels:
                    text = await label.inner_text()
                    if perm_name.replace('_', ' ') in text.lower():
                        checkbox = await label.query_selector('input[type="checkbox"]')
                        if checkbox:
                            await checkbox.check()
                            self._log(f"✓ Permission: {perm_name}")
        except Exception as e:
            self._log(f"⚠ Permission configuration failed: {e}")

        await self._take_screenshot(page, "09_permissions_configured")

    async def _configure_webhooks(self, page: Page):
        """Configure webhook endpoint"""
        self._log("🪝 Configuring webhooks...")
        webhook_config = self.data['webhook_configuration']
        webhook_url = webhook_config['webhook_endpoint']

        try:
            # Find webhook URL field
            webhook_inputs = await page.query_selector_all('input[placeholder*="webhook"], input[placeholder*="endpoint"]')
            if webhook_inputs:
                await webhook_inputs[0].fill(webhook_url)
                self._log(f"✓ Webhook endpoint: {webhook_url}")

            # Check signature verification
            sig_inputs = await page.query_selector_all('input[type="checkbox"]')
            for inp in sig_inputs:
                label = await inp.evaluate("el => el.nextElementSibling?.textContent || ''")
                if "signature" in label.lower():
                    if not await inp.is_checked():
                        await inp.check()
                        self._log("✓ Signature verification enabled")
        except Exception as e:
            self._log(f"⚠ Webhook configuration failed: {e}")

        await self._take_screenshot(page, "10_webhooks_configured")

    async def _configure_contact_info(self, page: Page):
        """Configure contact information"""
        self._log("📧 Configuring contact information...")
        contact = self.data['contact_info']

        try:
            inputs = await page.query_selector_all('input[type="email"], input[type="text"]')
            # Email
            for inp in inputs:
                placeholder = await inp.get_attribute('placeholder')
                if placeholder and 'email' in placeholder.lower():
                    await inp.fill(contact['support_email'])
                    self._log(f"✓ Support email: {contact['support_email']}")
                    break
        except Exception as e:
            self._log(f"⚠ Contact info failed: {e}")

        await self._take_screenshot(page, "11_contact_info_filled")

    async def _configure_legal_urls(self, page: Page):
        """Configure legal document URLs"""
        self._log("⚖️ Configuring legal URLs...")
        legal = self.data['legal_urls']

        try:
            inputs = await page.query_selector_all('input[type="url"], input[type="text"]')
            for inp in inputs:
                placeholder = await inp.get_attribute('placeholder')
                value = await inp.input_value()

                if not value:
                    if placeholder and 'privacy' in placeholder.lower():
                        await inp.fill(legal['privacy_policy'])
                        self._log(f"✓ Privacy policy URL")
                    elif placeholder and 'terms' in placeholder.lower():
                        await inp.fill(legal['terms_of_service'])
                        self._log(f"✓ Terms of service URL")
        except Exception as e:
            self._log(f"⚠ Legal URLs failed: {e}")

        await self._take_screenshot(page, "12_legal_urls_filled")

    async def _submit_app(self, page: Page):
        """Submit app for review"""
        self._log("📤 Submitting app for review...")

        try:
            # Scroll to bottom to find submit button
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(1000)

            # Find submit button
            buttons = await page.query_selector_all('button')
            for btn in buttons:
                text = await btn.inner_text()
                if 'submit' in text.lower() or 'review' in text.lower():
                    await btn.click()
                    self._log("✓ Submit button clicked")
                    break

            # Wait for confirmation
            await page.wait_for_timeout(3000)
            await self._take_screenshot(page, "13_submission_confirmation")

            # Check for confirmation message
            body_text = await page.inner_text('body')
            if 'confirm' in body_text.lower() or 'review' in body_text.lower():
                self._log("✓ App submission successful!")
                return True
            else:
                self._log("⚠ Submission status unclear")
                return False

        except Exception as e:
            self._log(f"⚠ Submission failed: {e}")
            return False

    async def run(self):
        """Execute full submission workflow"""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            context = await browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            page = await context.new_page()

            try:
                self._log("🚀 DSG Governance Gate - Stripe App Submission")
                self._log(f"App: {self.data['app_metadata']['app_name']}")
                self._log("=" * 60)

                # Execute workflow steps
                await self._login(page)
                await self._navigate_to_apps(page)
                await self._create_new_app(page)
                await self._fill_basic_info(page)
                await self._upload_icon(page)
                await self._upload_screenshots(page)
                await self._configure_oauth(page)
                await self._configure_permissions(page)
                await self._configure_webhooks(page)
                await self._configure_contact_info(page)
                await self._configure_legal_urls(page)
                success = await self._submit_app(page)

                self._log("=" * 60)
                if success:
                    self._log("✅ Submission workflow completed successfully!")
                else:
                    self._log("❌ Submission encountered issues - manual review needed")

                # Save log
                log_file = self.screenshot_dir / "submission_log.txt"
                with open(log_file, 'w', encoding='utf-8') as f:
                    f.write('\n'.join(self.log))
                self._log(f"📋 Log saved: {log_file}")

            finally:
                await browser.close()

async def main():
    """Entry point"""
    import os

    # Load submission data path from environment or default location
    submission_data = os.getenv(
        "SUBMISSION_DATA_JSON",
        "SUBMISSION_DATA.json"  # Default: current directory
    )

    if not os.path.exists(submission_data):
        print(f"❌ SUBMISSION_DATA.json not found at: {submission_data}")
        print("   Set SUBMISSION_DATA_JSON env var or place file in current directory")
        return

    # Get credentials from environment or interactive prompt
    stripe_email = os.getenv("STRIPE_EMAIL", "").strip()
    stripe_password = os.getenv("STRIPE_PASSWORD", "").strip()

    if not stripe_email:
        stripe_email = input("Stripe email: ").strip()
    if not stripe_password:
        stripe_password = input("Stripe password: ").strip()

    if not stripe_email or not stripe_password:
        print("❌ Email and password required")
        return

    agent = StripeAppSubmissionAgent(submission_data, stripe_email, stripe_password)
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())
