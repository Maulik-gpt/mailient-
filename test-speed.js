import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { ArcusAIService } from './lib/arcus-ai.js';

const arcus = new ArcusAIService();
const start = Date.now();
arcus.generateResponse("hi bro").then(res => {
  console.log('Result:', res);
  console.log('Time taken:', Date.now() - start, 'ms');
}).catch(e => console.error(e));
