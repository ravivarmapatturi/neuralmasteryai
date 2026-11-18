import { test, expect } from '@playwright/test';

test.describe('Canvas Agent Builder (v1: react-agent-loop)', () => {
  test('mode toggle, node interaction, mistake detection, and verification flow', async ({ page }) => {
    // 1. Navigate to react-agent-loop practice page
    await page.goto('/practice/react-agent-loop');
    await page.waitForLoadState('load');

    // Verify Canvas/Python toggle is present
    const toggle = page.locator('[data-testid="canvas-python-toggle"]');
    await expect(toggle).toBeVisible();

    const canvasTab = page.locator('[data-testid="toggle-canvas-mode"]');
    const pythonTab = page.locator('[data-testid="toggle-python-mode"]');
    await expect(canvasTab).toBeVisible();
    await expect(pythonTab).toBeVisible();

    // Verify Canvas mode is the default when canvasSpec exists
    await expect(canvasTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('verify-architecture-btn')).toBeVisible();

    // Verify initial components exist on the canvas
    await expect(page.locator('[data-id="node-reasoner"]')).toBeVisible();
    await expect(page.locator('[data-id="node-tool"]')).toBeVisible();
    await expect(page.locator('[data-id="node-memory"]')).toBeVisible();
    await expect(page.locator('[data-id="node-database"]')).toBeVisible();
    await expect(page.locator('[data-id="node-final"]')).toBeVisible();

    // Screenshot 1: Initial Canvas Builder state
    await page.screenshot({ path: 'scratch/screenshots/01_canvas_builder_initial.png', fullPage: true });

    // 2. Test switching to Python Mode
    await pythonTab.click();
    await expect(pythonTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('button', { name: /Run/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit/i })).toBeVisible();

    // Screenshot 2: Python Mode
    await page.screenshot({ path: 'scratch/screenshots/02_python_editor_mode.png', fullPage: true });

    // Switch back to Canvas Mode
    await canvasTab.click();
    await expect(canvasTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('verify-architecture-btn')).toBeVisible();

    // 3. Test initial verification with disconnected wires
    await page.getByTestId('verify-architecture-btn').click();
    const resultsPanel = page.getByTestId('verification-results-panel');
    await expect(resultsPanel).toBeVisible();
    await expect(resultsPanel).toContainText('Verification Failed');
    await expect(resultsPanel).toContainText('Bidirectional Tool Loop');
    await expect(resultsPanel).toContainText('Memory / Context Store');

    // 4. Test dragging a node
    const reasonerNode = page.locator('.react-flow__node').filter({ hasText: 'LLM Reasoner' }).first();
    const initialBox = await reasonerNode.boundingBox();
    expect(initialBox).toBeTruthy();
    if (initialBox) {
      await page.mouse.move(initialBox.x + 20, initialBox.y + 20);
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 60, initialBox.y + 60);
      await page.mouse.up();
    }

    // 5. Test Common Mistake Detection: Connecting Database directly to Reasoner
    await page.evaluate(() => {
      const setEdges = (window as any).__setCanvasEdges;
      if (setEdges) {
        setEdges([
          { id: 'e1', source: 'node-reasoner', target: 'node-tool', label: 'Action' },
          { id: 'e2', source: 'node-tool', target: 'node-reasoner', label: 'Observation' },
          { id: 'e3', source: 'node-reasoner', target: 'node-memory', label: 'Read/Write' },
          { id: 'e4-mistake', source: 'node-database', target: 'node-reasoner', label: 'Direct Query' }, // DIRECT DB TO REASONER!
          { id: 'e5', source: 'node-reasoner', target: 'node-final', label: 'Final Answer' },
        ]);
      }
    });

    // Click verify with mistake
    await page.getByTestId('verify-architecture-btn').click();

    // Verify common mistake callout is rendered with exact feedback
    const mistakeCallout = page.getByTestId('common-mistake-callout');
    await expect(mistakeCallout).toBeVisible();
    await expect(mistakeCallout).toContainText('Direct Database Connection Detected');
    await expect(mistakeCallout).toContainText('LangGraph persistent checkpointers');
    await expect(mistakeCallout).toContainText('Persistence must flow through the Memory/Context Store');

    // Screenshot 3: Common Mistake Feedback Callout
    await page.screenshot({ path: 'scratch/screenshots/03_mistake_db_direct_feedback.png', fullPage: true });

    // 6. Test Correct Production Topology
    await page.evaluate(() => {
      const setEdges = (window as any).__setCanvasEdges;
      if (setEdges) {
        setEdges([
          { id: 'e1', source: 'node-reasoner', target: 'node-tool', label: 'Action' },
          { id: 'e2', source: 'node-tool', target: 'node-reasoner', label: 'Observation' },
          { id: 'e3', source: 'node-reasoner', target: 'node-memory', label: 'Read/Write' },
          { id: 'e4', source: 'node-memory', target: 'node-database', label: 'Checkpoint' }, // DB through Memory!
          { id: 'e5', source: 'node-reasoner', target: 'node-final', label: 'Final Answer' },
        ]);
      }
    });

    // Click verify on correct graph
    await page.getByTestId('verify-architecture-btn').click();

    // Verify success banner and award
    await expect(resultsPanel).toContainText('Architecture Verified! Correct Production ReAct Topology (+50 XP)');
    await expect(page.locator('text=✓ Solved (+50 XP)')).toBeVisible();

    // Verify all checklist items passed
    await expect(resultsPanel).toContainText('Single LLM Reasoner hub present');
    await expect(resultsPanel).toContainText('Database is correctly decoupled from direct raw Reasoner access');
    await expect(resultsPanel).toContainText('Bidirectional connection verified');
    await expect(resultsPanel).toContainText('Memory / Context Store is connected to the Reasoner');
    await expect(resultsPanel).toContainText('Database is connected to Memory / Context Store');
    await expect(resultsPanel).toContainText('Final Answer node is correctly connected from Reasoner');

    // Screenshot 4: Correct Verified Architecture with Award State
    await page.screenshot({ path: 'scratch/screenshots/04_canvas_verified_awarded.png', fullPage: true });

    // 7. Test de-duplication: clicking verify again maintains solved state without double awarding
    await page.getByTestId('verify-architecture-btn').click();
    await expect(resultsPanel).toContainText('Architecture Verified!');
    await expect(page.locator('text=✓ Solved (+50 XP)')).toBeVisible();

    // 8. Test component addition from palette
    const initialNodeCount = await page.locator('.react-flow__node').count();
    await page.getByRole('button', { name: '+ Tool Router' }).click();
    const newNodeCount = await page.locator('.react-flow__node').count();
    expect(newNodeCount).toBe(initialNodeCount + 1);

    // Reset layout
    await page.getByRole('button', { name: 'Reset' }).click();
    expect(await page.locator('.react-flow__node').count()).toBe(initialNodeCount);
  });
});
