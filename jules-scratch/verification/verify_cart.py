import asyncio
from playwright.async_api import async_playwright, expect
import os
import re

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            no_viewport=True,
            bypass_csp=True,
            java_script_enabled=True,
            ignore_https_errors=True,
            extra_http_headers={'Cache-Control': 'no-cache'}
        )
        page = await context.new_page()


        # Go to the local server
        await page.goto('http://localhost:8000/index.html')

        # Now that the data has loaded, wait for the first product card to be visible
        await expect(page.locator('#productGrid .card').first).to_be_visible(timeout=10000)

        # 1. Click the "Bekijk" button on the first product
        await page.locator('#productGrid .card .btn').first.click()

        # 2. Wait for the product modal to appear and click "Toevoegen aan winkelwagen"
        await expect(page.locator('#productModal')).to_be_visible()
        await page.locator('.add-to-cart').click()

        # 3. Wait for the "add to cart" notification to have the 'show' class, then not have it.
        await expect(page.locator('#notification')).to_have_class(re.compile(r'\bshow\b'))
        await expect(page.locator('#notification')).not_to_have_class(re.compile(r'\bshow\b'), timeout=5000)

        # 4. Click the cart icon to open the cart modal
        await page.locator('#cartBtn').click()

        # 5. Wait for the cart modal to be visible and take a screenshot
        await expect(page.locator('#cartModal')).to_be_visible()
        await expect(page.locator('.cart-item')).to_have_count(1)
        await page.screenshot(path='jules-scratch/verification/verification.png', full_page=True)

        await browser.close()

asyncio.run(main())
