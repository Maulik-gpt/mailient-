/**
 * Arcus Execution Engine
 * 
 * The "Executor" in the Planner-Validator-Executor pattern.
 * Responsible for running approved plans through the Tool Registry.
 */

import { ExecutionHandlers } from './arcus-execution-handlers.js';
import { ARCUS_TOOLS } from './arcus-tool-registry.js';

export class ArcusExecutorEngine {
    constructor(options = {}) {
        this.handlers = new ExecutionHandlers(options);
    }

    /**
     * Executes an approved plan in sequence.
     * Implements Tool-Call security and Telemetry.
     */
    async executePlan(plan, context = {}) {
        console.log(`🚀 [Arcus Executor] Starting execution of plan...`);
        const results = [];
        const startTime = Date.now();

        try {
            for (const step of plan.steps) {
                console.log(`⚡ [Arcus Executor] Step: ${step.explanation} (${step.tool_id})`);
                
                // Tool Verification (Security Check)
                const tool = ARCUS_TOOLS.find(t => t.id === step.tool_id);
                if (!tool) {
                    throw new Error(`Execution aborted: Unknown tool requested: ${step.tool_id}`);
                }

                // Execute the tool call
                const callResult = await this.handlers.execute(step.tool_id, step.params, context);
                
                if (!callResult.success) {
                    console.error(`❌ [Arcus Executor] Step failed: ${callResult.error}. Initiating Telemetry Bridge Rollback...`);
                    
                    // Step 4: Telemetry Bridge Rollback Logic
                    const compensationResults = await this.compensate(results, context);
                    
                    return {
                        success: false,
                        failedStep: step,
                        partialResults: results,
                        compensation: compensationResults,
                        error: callResult.error
                    };
                }

                results.push({
                    stepId: step.id,
                    tool_id: step.tool_id,
                    params: step.params,
                    result: callResult.result
                });
            }

            const totalDuration = Date.now() - startTime;
            console.log(`✅ [Arcus Executor] Plan completed successfully in ${totalDuration}ms`);

            return {
                success: true,
                results,
                duration: totalDuration
            };

        } catch (error) {
            console.error('💥 [Arcus Executor] Fatal execution error:', error);
            return {
                success: false,
                error: error.message,
                partialResults: results
            };
        }
    }

    /**
     * Step 4: Compensating Actions (Rollback)
     * Reverses successful steps in LIFO order if a later step fails.
     */
    async compensate(results, context) {
        console.log(`🔄 [Arcus Telemetry] Compensating for ${results.length} successful steps...`);
        const compensationResults = [];

        for (let i = results.length - 1; i >= 0; i--) {
            const step = results[i];
            console.log(`⏪ [Arcus Telemetry] Rolling back: ${step.tool_id}`);
            
            try {
                const result = await this.handlers.undo(step.tool_id, step.params, step.result, context);
                compensationResults.push({
                    stepId: step.stepId,
                    tool_id: step.tool_id,
                    success: result.success
                });
            } catch (err) {
                console.error(`🚨 [Arcus Telemetry] Compensation failed for ${step.tool_id}:`, err);
            }
        }

        return compensationResults;
    }
}
