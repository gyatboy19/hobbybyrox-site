import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the admin.html file
        file_path = os.path.abspath('admin.html')
        await page.goto(f'file://{file_path}')

        # 1. Add a new product with two images
        await page.locator("#npName").fill("Test Product")
        await page.locator("#npPrice").fill("10")
        await page.locator("#npUrl1").fill("https://example.com/image1.jpg")
        await page.locator("#npUrl2").fill("https://example.com/image2.jpg")
        await page.locator("#addProductBtn").click()

        # Verify product was added
        await expect(page.get_by_text("Test Product")).to_be_visible()

        # 2. Open the edit modal
        await page.locator('[data-edit]').first.click()

        # 3. Clear the second image URL and save
        await page.locator("#epUrl2").clear()
        await page.get_by_role("button", name="Opslaan").click()

        # Verify the product list now shows a thumbnail (the first image)
        await expect(page.locator('//div[contains(., "Test Product")]//img')).to_have_attribute('src', 'https://example.com/image1.jpg')

        # 4. Re-open the modal and check the underlying data state
        await page.locator('[data-edit]').first.click()

        # Check that the underlying state was correctly updated
        product_id = await page.locator('[data-edit]').first.get_attribute('data-edit')
        images = await page.evaluate(f'() => state.products["{product_id}"].images')
        assert len(images) == 1
        assert images[0] == "https://example.com/image1.jpg"

        # 5. Clear the first image URL and save
        await page.locator("#epUrl1").clear()
        await page.get_by_role("button", name="Opslaan").click()

        # Verify the product list now shows no thumbnail
        await expect(page.locator('//div[contains(., "Test Product")]//img')).to_have_attribute('src', '')

        # 6. Final check of the data state
        await page.locator('[data-edit]').first.click()
        images_after_all_deleted = await page.evaluate(f'() => state.products["{product_id}"].images')
        assert len(images_after_all_deleted) == 0
        print("State verified: Product has 0 images.")

        await browser.close()
        print("Test completed successfully.")

if __name__ == '__main__':
    asyncio.run(main())
