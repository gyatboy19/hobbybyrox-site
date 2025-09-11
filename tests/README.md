# E2E Tests

This directory contains end-to-end tests for the admin panel functionality, written using Playwright.

## Setup

1.  **Install dependencies:**
    Navigate to this directory and install the required Python packages.
    ```bash
    pip install -r requirements.txt
    ```

2.  **Install Playwright browsers:**
    This command downloads the browser binaries needed by Playwright.
    ```bash
    playwright install
    ```

## Running Tests

To run a specific test, execute the Python script directly from the root of the repository:

```bash
python tests/test_product_image_deletion.py
```

The test will open a browser, perform actions on the `admin.html` page, and print a success message if all assertions pass.
