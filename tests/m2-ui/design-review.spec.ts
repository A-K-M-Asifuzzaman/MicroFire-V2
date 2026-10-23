import { expect, test } from '@playwright/test';

// The art-direction prototypes are a local review surface: without MICROFIRE_DESIGN_REVIEW=1 they do not exist.
test('design-review routes are not served without their review flag', async ({ request }) => {
  for (const path of ['/design', '/design/a', '/design/a/lab', '/design/a/b20', '/design/b', '/design/b/lab', '/design/b/b20'])
    expect((await request.get(path)).status(), path).toBe(404);
});
