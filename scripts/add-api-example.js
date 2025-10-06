#!/usr/bin/env node

/**
 * Script to add API examples to API_CODE_EXAMPLES.md
 * Usage: node scripts/add-api-example.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const API_EXAMPLES_FILE = path.join(__dirname, '..', 'API_CODE_EXAMPLES.md');

const question = query => new Promise(resolve => rl.question(query, resolve));

async function addExample() {
  console.log('\n📝 Add API Example to API_CODE_EXAMPLES.md\n');

  // Select service
  const services = [
    'Deep-Image.ai',
    'ClippingMagic',
    'Vectorizer.ai',
    'OpenAI',
    'Stripe',
    'Supabase',
  ];
  console.log('Available services:');
  services.forEach((service, index) => {
    console.log(`${index + 1}. ${service}`);
  });

  const serviceIndex = await question('\nSelect service (1-6): ');
  const service = services[parseInt(serviceIndex) - 1];

  if (!service) {
    console.log('Invalid selection');
    process.exit(1);
  }

  // Get example details
  const title = await question(
    'Example title (e.g., "Basic Upscaling Example"): '
  );
  const description = await question('Brief description (optional): ');

  console.log(
    '\nPaste the request JSON example (press Enter twice when done):'
  );
  let requestExample = '';
  let emptyLineCount = 0;

  rl.on('line', line => {
    if (line === '') {
      emptyLineCount++;
      if (emptyLineCount >= 2) {
        rl.removeAllListeners('line');
        return;
      }
    } else {
      emptyLineCount = 0;
    }
    requestExample += line + '\n';
  });

  await new Promise(resolve => {
    rl.once('line', () => {
      setTimeout(resolve, 1000);
    });
  });

  console.log(
    '\nPaste the response JSON example (press Enter twice when done):'
  );
  let responseExample = '';
  emptyLineCount = 0;

  rl.on('line', line => {
    if (line === '') {
      emptyLineCount++;
      if (emptyLineCount >= 2) {
        rl.removeAllListeners('line');
        return;
      }
    } else {
      emptyLineCount = 0;
    }
    responseExample += line + '\n';
  });

  await new Promise(resolve => {
    rl.once('line', () => {
      setTimeout(resolve, 1000);
    });
  });

  const notes = await question('\nAny additional notes? (optional): ');

  // Generate the example markdown
  const exampleMarkdown = `
### ${title}
${description ? description + '\n' : ''}
\`\`\`json
// Request${requestExample.trim() ? '\n' + requestExample.trim() : ''}
\`\`\`

\`\`\`json
// Response${responseExample.trim() ? '\n' + responseExample.trim() : ''}
\`\`\`
${notes ? '\n' + notes : ''}
`;

  // Read current file
  let content = fs.readFileSync(API_EXAMPLES_FILE, 'utf8');

  // Find the service section
  const sectionRegex = new RegExp(
    `## ${service.replace('.', '\\.')}([\\s\\S]*?)(?=\\n---\\n|$)`
  );
  const match = content.match(sectionRegex);

  if (match) {
    // Add to existing section
    const updatedSection = match[0] + '\n' + exampleMarkdown;
    content = content.replace(sectionRegex, updatedSection);
  } else {
    console.log(`Section for ${service} not found in API_CODE_EXAMPLES.md`);
    process.exit(1);
  }

  // Write back to file
  fs.writeFileSync(API_EXAMPLES_FILE, content);

  console.log(
    `\n✅ Example added to ${service} section in API_CODE_EXAMPLES.md`
  );

  rl.close();
}

addExample().catch(console.error);
