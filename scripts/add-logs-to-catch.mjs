import { Project, SyntaxKind } from 'ts-morph';
import path from 'path';

const project = new Project();
project.addSourceFilesAtPaths("app/api/**/*.{ts,tsx,js,jsx}");

const sourceFiles = project.getSourceFiles();

let filesModified = 0;
let eventsAdded = 0;

for (const sourceFile of sourceFiles) {
  let fileChanged = false;

  // Find all catch clauses
  const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
  
  if (catchClauses.length > 0) {
    for (const catchClause of catchClauses) {
      // Find the block
      const block = catchClause.getBlock();
      if (block) {
        // Find if we already inserted logEvent
        const existingLog = block.getStatements().some(stmt => stmt.getText().includes('logEvent('));
        if (!existingLog) {
          // get the variable name of the catch block, e.g. "catch (error)" -> "error"
          const variableDeclaration = catchClause.getVariableDeclaration();
          let errorVar = 'error';
          if (variableDeclaration) {
            errorVar = variableDeclaration.getName();
          } else {
            // catch without variable, we'll just log "Unknown error"
            errorVar = '"Unknown error"';
          }
          
          let desc = variableDeclaration ? `String(${errorVar})` : errorVar;
          
          // Insert statement at the top of the catch block
          block.insertStatements(0, `logEvent({ channel: "failures", event: "❌ API Error", description: ${desc} });`);
          fileChanged = true;
          eventsAdded++;
        }
      }
    }
  }

  if (fileChanged) {
    // Add import statement if not exists
    const hasImport = sourceFile.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === '@/lib/logsso' || imp.getModuleSpecifierValue() === '../../../lib/logsso');
    if (!hasImport) {
      // Import from @/lib/logsso (which works with tsconfig paths)
      sourceFile.addImportDeclaration({
        namedImports: ['logEvent'],
        moduleSpecifier: '@/lib/logsso'
      });
    }
    
    // Save file
    sourceFile.saveSync();
    filesModified++;
  }
}

console.log(`✅ Modified ${filesModified} files, injected ${eventsAdded} failure events.`);
