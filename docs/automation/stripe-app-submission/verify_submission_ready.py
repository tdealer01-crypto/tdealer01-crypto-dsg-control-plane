#!/usr/bin/env python3
"""Pre-submission verification script for DSG Governance Gate"""

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

def check_file_exists(path: str, file_type: str) -> tuple[bool, str]:
    """Verify file exists"""
    p = Path(path)
    if p.exists():
        size_kb = p.stat().st_size / 1024
        return True, f"✓ {file_type} exists ({size_kb:.1f} KB)"
    return False, f"✗ {file_type} missing: {path}"

def check_url_valid(url: str, url_type: str = "") -> tuple[bool, str]:
    """Verify URL format"""
    try:
        result = urlparse(url)
        if all([result.scheme, result.netloc]):
            return True, f"✓ {url_type} Valid URL: {url}" if url_type else f"✓ Valid URL: {url}"
        return False, f"✗ {url_type} Invalid URL format: {url}" if url_type else f"✗ Invalid URL format: {url}"
    except:
        return False, f"✗ {url_type} URL parse error: {url}" if url_type else f"✗ URL parse error: {url}"

def check_string_length(value: str, max_len: int, name: str) -> tuple[bool, str]:
    """Verify string within limits"""
    actual = len(value)
    if actual <= max_len:
        return True, f"✓ {name}: {actual}/{max_len} characters"
    return False, f"✗ {name} exceeds limit: {actual}/{max_len} characters"

def main():
    import os
    submission_data = Path(os.getenv(
        "SUBMISSION_DATA_JSON",
        "SUBMISSION_DATA.json"
    ))

    if not submission_data.exists():
        print(f"❌ SUBMISSION_DATA.json not found at: {submission_data}")
        print("   Set SUBMISSION_DATA_JSON env var or place file in current directory")
        sys.exit(1)

    with open(submission_data, 'r') as f:
        data = json.load(f)

    print("\n🔍 DSG Governance Gate - Pre-Submission Verification")
    print("=" * 70)

    passed = 0
    failed = 0

    # 1. App Metadata
    print("\n1️⃣ App Metadata:")
    meta = data['app_metadata']
    checks = [
        (meta.get('app_name'), "App name"),
        (meta.get('version'), "Version"),
        (meta.get('category'), "Category"),
    ]
    for val, name in checks:
        if val:
            print(f"   ✓ {name}: {val}")
            passed += 1
        else:
            print(f"   ✗ {name}: missing")
            failed += 1

    # 2. Descriptions
    print("\n2️⃣ App Descriptions:")
    desc = data['app_descriptions']

    check_result = check_string_length(desc['short_description'], 140, "Short description")
    print(f"   {check_result[1]}")
    if check_result[0]:
        passed += 1
    else:
        failed += 1

    check_result = check_string_length(desc['long_description'], 4000, "Long description")
    print(f"   {check_result[1]}")
    if check_result[0]:
        passed += 1
    else:
        failed += 1

    # 3. Contact Info
    print("\n3️⃣ Contact Information:")
    contact = data['contact_info']
    for email_type in ['support_email', 'contact_email']:
        email = contact.get(email_type)
        if email and '@' in email:
            print(f"   ✓ {email_type}: {email}")
            passed += 1
        else:
            print(f"   ✗ {email_type}: invalid or missing")
            failed += 1

    # 4. Legal URLs
    print("\n4️⃣ Legal URLs:")
    legal = data['legal_urls']
    for url_type, url in legal.items():
        check_result = check_url_valid(url, url_type.replace('_', ' '))
        print(f"   {check_result[1]}")
        if check_result[0]:
            passed += 1
        else:
            failed += 1

    # 5. OAuth Configuration
    print("\n5️⃣ OAuth Configuration:")
    oauth = data['oauth_configuration']
    uris = oauth.get('redirect_uris', [])
    if len(uris) >= 1:
        print(f"   ✓ {len(uris)} redirect URI(s) configured")
        for uri in uris:
            print(f"     - {uri}")
        passed += 1
    else:
        print("   ✗ No redirect URIs configured")
        failed += 1

    # 6. Permissions
    print("\n6️⃣ Permissions:")
    perms = data['permissions']
    if perms:
        print(f"   ✓ {len(perms)} permission(s) configured:")
        for perm in perms:
            print(f"     - {perm['permission']}: {perm.get('purpose', 'N/A')[:50]}...")
        passed += 1
    else:
        print("   ✗ No permissions configured")
        failed += 1

    # 7. Webhook Configuration
    print("\n7️⃣ Webhook Configuration:")
    webhook = data['webhook_configuration']
    webhook_url = webhook.get('webhook_endpoint')
    if webhook_url:
        check_result = check_url_valid(webhook_url, "Webhook endpoint")
        print(f"   {check_result[1]}")
        if check_result[0]:
            passed += 1
        else:
            failed += 1

        if webhook.get('signature_verification'):
            print("   ✓ Signature verification enabled")
            passed += 1
        else:
            print("   ⚠ Signature verification disabled")
    else:
        print("   ✗ Webhook endpoint missing")
        failed += 1

    # 8. Assets
    print("\n8️⃣ Assets:")
    assets = data['assets']

    # Icon
    icon_file = assets['icon']['file']
    check_result = check_file_exists(icon_file, "App icon")
    print(f"   {check_result[1]}")
    if check_result[0]:
        passed += 1
    else:
        failed += 1

    # Screenshots
    screenshots = assets.get('screenshots', [])
    print(f"   ✓ {len(screenshots)} screenshot(s) configured:")
    for ss in screenshots:
        check_result = check_file_exists(ss['file'], f"  Screenshot: {ss['title']}")
        print(f"   {check_result[1]}")
        if check_result[0]:
            passed += 1
        else:
            failed += 1

    # 9. Submission Endpoints
    print("\n9️⃣ API Endpoints:")
    ui = data.get('ui_extensions', {})
    csp = ui.get('content_security_policy', {})
    connect_src = csp.get('connect-src', [])
    if connect_src:
        print(f"   ✓ {len(connect_src)} API endpoint(s) in CSP:")
        for endpoint in connect_src:
            print(f"     - {endpoint}")
        passed += 1
    else:
        print("   ⚠ No API endpoints configured in CSP")

    # Summary
    print("\n" + "=" * 70)
    total = passed + failed
    pct = (passed / total * 100) if total > 0 else 0
    status = "✅ READY" if failed == 0 else "⚠️ NEEDS FIXES"
    print(f"\n{status} | {passed}/{total} checks passed ({pct:.0f}%)")

    if failed > 0:
        print(f"\n❌ {failed} issue(s) to resolve before submission:")
        print("   - Check file paths for assets (icon, screenshots)")
        print("   - Verify all URLs are accessible and valid")
        print("   - Ensure descriptions meet character limits")
        print("   - Confirm all required fields are populated")
        sys.exit(1)
    else:
        print("\n✅ All checks passed! Ready for automated submission.")
        print("\nNext steps:")
        print("   1. Gather Stripe email and password")
        print("   2. Run: python stripe_app_submission_agent.py")
        print("   3. Review screenshots in submission_screenshots_* directory")
        print("\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
