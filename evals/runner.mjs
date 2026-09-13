#!/usr/bin/env node
// Eval Runner for Self-Repair Loop
// Runs a set of prompts through the generation pipeline and validates the output
// Designed to run nightly via cron on VPS

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readFile } from 'node:fs/promises';

// Configuration
const OUTPUT_DIR = process.env.OUTPUT_DIR || join(process.cwd(), 'data', 'evals');
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), 'data', 'logs');
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT || 3);
const TIMEOUT_MS = Number(process.env.EVAL_TIMEOUT_MS || 30_000);

// Ensure directories exist
mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(LOG_DIR, { recursive: true });

// Date for logs
const dateStr = new Date().toISOString().slice(0, 10);
const logFile = join(LOG_DIR, `eval-${dateStr}.log`);

// Logging function
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  console[level === 'error' ? 'error' : 'log'](line);
  writeFileSync(logFile, line + '\n', { flag: 'a' });
}

// Result tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  details: []
};

// Load prompts
async function loadPrompts() {
  const promptsPath = join(process.cwd(), 'evals', 'prompts.json');
  if (!existsSync(promptsPath)) {
    log(`Prompts file not found: ${promptsPath}`, 'error');
    process.exit(1);
  }
  
  const content = await readFile(promptsPath, 'utf-8');
  return JSON.parse(content);
}

// Validate HTML using the validation module
async function validateGeneration(prompt, html, attempt = 1) {
  const { validateHtml } = await import('../src/lib/ai/validation/index.server.ts');
  
  try {
    const validation = await validateHtml(html);
    
    if (validation.ok) {
      return { ok: true, validation, attempt };
    }
    
    // If validation failed and we haven't exceeded max retries
    if (attempt < Number(process.env.MAX_REPAIR_RETRIES || 2)) {
      // The self-repair loop should handle this automatically
      // For now, just report the failure
      return { ok: false, validation, attempt };
    }
    
    return { ok: false, validation, attempt };
  } catch (error) {
    log(`Validation error for "${prompt.name}": ${error}`, 'error');
    return { ok: false, error: String(error), attempt };
  }
}

// Run a single prompt evaluation
async function runPrompt(prompt) {
  const startTime = Date.now();
  results.total++;
  
  log(`\nStarting evaluation: ${prompt.name} (${prompt.id})`);
  
  try {
    // Import the generation function
    const { generatePreview } = await import('../src/lib/ai/generate.ts');
    
    // Generate HTML
    const generationStart = Date.now();
    const result = await Promise.race([
      generatePreview({ data: { prompt: prompt.prompt } }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Generation timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
      )
    ]);
    
    const generationTime = Date.now() - generationStart;
    
    if (!result.ok) {
      log(`Generation failed for "${prompt.name}": ${result.error}`, 'error');
      results.details.push({
        prompt: prompt.id,
        passed: false,
        error: result.error,
        generationTimeMs: generationTime
      });
      results.failed++;
      return;
    }
    
    log(`Generation completed in ${generationTime}ms`);
    
    // Validate the generated HTML
    const validationStart = Date.now();
    const validationResult = await validateGeneration(prompt, result.html);
    const validationTime = Date.now() - validationStart;
    
    const passed = validationResult.ok;
    if (passed) {
      results.passed++;
      log(`✓ PASSED: ${prompt.name} (validation: ${validationTime}ms)`);
    } else {
      results.failed++;
      log(`✗ FAILED: ${prompt.name} (attempt ${validationResult.attempt})`);
      if (validationResult.validation) {
        log(`  Errors: ${validationResult.validation.errors.length}`);
        log(`  Warnings: ${validationResult.validation.warnings.length}`);
        validationResult.validation.errors.forEach(e => {
          log(`    - [${e.type}] ${e.message}`, 'error');
        });
      }
    }
    
    results.details.push({
      prompt: prompt.id,
      passed,
      generationTimeMs: generationTime,
      validationTimeMs: validationTime,
      validation: validationResult.validation || validationResult.error,
      attempt: validationResult.attempt
    });
    
    // Save the generated HTML for inspection
    if (!passed) {
      const htmlPath = join(OUTPUT_DIR, `${prompt.id}-${dateStr}.html`);
      writeFileSync(htmlPath, result.html);
      log(`Saved failed HTML to: ${htmlPath}`);
    }
    
  } catch (error) {
    log(`Error evaluating "${prompt.name}": ${error}`, 'error');
    results.failed++;
    results.details.push({
      prompt: prompt.id,
      passed: false,
      error: String(error)
    });
  }
  
  const totalTime = Date.now() - startTime;
  log(`Completed ${prompt.name}: ${totalTime}ms total\n`);
}

// Run all evaluations
async function runEvaluations() {
  log('='.repeat(60));
  log('Starting Self-Repair Loop Evaluation');
  log('='.repeat(60));
  
  const prompts = await loadPrompts();
  log(`Loaded ${prompts.length} prompts for evaluation`);
  
  // Run prompts sequentially (or with limited concurrency)
  // For VPS with limited resources, run sequentially
  for (const prompt of prompts) {
    await runPrompt(prompt);
  }
  
  // Generate summary
  log('='.repeat(60));
  log('Evaluation Summary');
  log('='.repeat(60));
  log(`Total: ${results.total}`);
  log(`Passed: ${results.passed}`);
  log(`Failed: ${results.failed}`);
  log(`Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  log('='.repeat(60));
  
  // Save full results
  const resultsPath = join(OUTPUT_DIR, `eval-results-${dateStr}.json`);
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  log(`Full results saved to: ${resultsPath}`);
  
  // Exit with appropriate code
  if (results.failed > 0) {
    log('Some evaluations failed', 'error');
    process.exit(1);
  } else {
    log('All evaluations passed!');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

// Run evaluations
runEvaluations().catch(error => {
  log(`Fatal error: ${error}`, 'error');
  process.exit(1);
});
