# GraphRAG - Smart Search & Retrieval

## Architecture

### 1. Hybrid Search (BM25 + Vector)
- `hybrid-search.js`: Combines PostgreSQL full-text search (BM25) with pgvector semantic similarity
- Solves semantic drift by using both exact matching and vector embeddings

### 2. Knowledge Graph
- `graph-rag-service.js`: Graph traversal for contextual memory
- Temporal layer, Entity layer, Relationship layer
- Answers "What did we agree on?" via graph traversal

### 3. Knowledge Extraction
- `knowledge-extraction-agent.js`: LLM-powered entity/relationship extraction
- Automatically injects agreements, decisions into graph

### 4. Ranking
- `ranking-service.js`: Recency + Relevance + Confidence scoring
- Exponential decay for temporal ranking

## Database Schema

### Tables
- `memory_nodes`: Entities with vector embeddings
- `memory_edges`: Relationships between entities
- `memory_search_index`: Full-text search with tsvector
- `conversation_context`: Links conversations to entities

### Extensions Required
```sql
CREATE EXTENSION vector;
CREATE EXTENSION pg_trgm;
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/graphrag/search` | POST | Hybrid search with ranking |
| `/api/graphrag/context` | GET | Graph traversal for entity |
| `/api/graphrag/agreements` | GET/POST | Recent agreements/decisions |
| `/api/graphrag/extract` | POST | Extract knowledge from text |
| `/api/graphrag/stream` | GET | SSE real-time updates |

## Components

- `SmartSearch`: Search UI with glassmorphism
- `KnowledgeGraphDashboard`: Stats and visualization
- `GraphVisualization`: Interactive force-directed graph

## Usage

```tsx
import { SmartSearch } from '@/components/graphrag';
import { useSmartSearch } from '@/hooks/use-smart-search';

// Component
<SmartSearch />

// Hook
const { search, results, isLoading } = useSmartSearch();
await search("What did we agree on?");
```
