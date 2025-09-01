# Berkshire Hathaway RAG Application

A Retrieval-Augmented Generation (RAG) system built with the Mastra framework to answer questions about Warren Buffett's investment philosophy and Berkshire Hathaway's business strategy based on official shareholder letters.

## Screenshots

### Mastra Agent Playground & Citation View
![Agent Playground](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/agentPlayGround.png)
![Document Citation Response](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/docCitationRes.png)
![Deployed](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/Deployment.png)
### Additional Frontend Integration React
![Chat Interface](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/chat.png)
![Conversation Memory](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/memory.png)
![Source Document Citation](https://raw.githubusercontent.com/SahilChaskar/AI-Agent/main/Screenshots/sourceDocCitation.png)

## Features

- Natural language queries about Berkshire Hathaway and Warren Buffett
- Access to comprehensive shareholder letters from 2019–2024
- Contextual information retrieval using vector embeddings
- Transparent responses with source citations
- Real-time streaming responses
- Persistent conversation memory across multiple queries

## Tech Stack

- **Framework**: Mastra for RAG workflows
- **Language Model**: OpenAI GPT-4o
- **Database**: PostgreSQL with pgvector extension
- **Vector Storage**: High-performance similarity search
- **Memory System**: Mastra's built-in conversation continuity

## Prerequisites

Before you begin, ensure you have:

- Node.js (version 18 or later)
- PostgreSQL with pgvector extension
- OpenAI API key

## Installation

### 1. Clone and Install

```bash
git clone https://github.com/SahilChaskar/AI-Agent.git
docker-compose up
cd app
npm install
cd frontend
npm install
npm run dev
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# PostgreSQL Configuration
PG_HOST=localhost
PG_PORT=5432
PG_USER=your-username
PG_PASSWORD=your-password
PG_DATABASE=berkshire_rag
DATABASE_URL=postgresql://username:password@host:5432/database

# OpenAI API
OPENAI_API_KEY=your-openai-api-key

# Mastra Environment
MASTRA_ENV=development
```

### 3. Database Setup

Enable the pgvector extension in your PostgreSQL database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Apply the schema and insert existing data:

```bash
psql "$DATABASE_URL" -f vectors_with_schema.sql
```

### 4. Document Embedding

1. Download Berkshire Hathaway shareholder letters (2019–2024)
2. Place PDF files in the `src/mastra/pdf/` directory
3. Generate and store embeddings:

```bash
npm run embed
```

Ensure your `package.json` includes the embed script:

```json
{
  "scripts": {
    "dev": "mastra dev",
    "embed": "ts-node src/mastra/embeddings/embed-upsert.ts",
    "build": "mastra build"
  }
}
```

### 5. Running the Application

Start the Mastra development server:

```bash
npm run dev
```

Access the Mastra playground at: http://localhost:4111

## Project Structure

```
app/
├── frontend/                 # React frontend
│   └── src/
│       ├── components/       # UI components
│       └── hooks/            # Custom React hooks
│
├── data/
│   └── letters/              # Berkshire letters (PDFs)
│       ├── 1977.pdf
│       ├── 1978.pdf
│       ├── 1979.pdf
│       └── ...
│
├── src/
│   ├── config/
│   │   └── db.ts             # Database connection
│   │
│   ├── ingestion/            # PDF → chunks → embeddings → Postgres
│   │   ├── chunk.ts
│   │   ├── embed-openai.ts
│   │   ├── ingest.ts
│   │   ├── ingestion-pgvector.ts
│   │   ├── MDocument.ts
│   │   ├── parse-pdf.ts
│   │   ├── upsert-pg.ts
│   │   └── upsert-pgvector.ts
│   │
│   ├── mastra/               # Mastra framework logic
│   │   ├── prompts/
│   │   ├── agent/
│   │   │   └── rag\_agent\_vector\_final.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   └── logger.ts
│   │
│   └── server.ts             # Express/Mastra server
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
│
├── node\_modules/
│
├── init-db/
│   └── 001-vector.sql        # pgvector init script
│
└── docker-compose.yaml       # Local dev services

```

## Testing

Example queries to test the system:

- "What is Warren Buffett's investment philosophy?"
- "How has Berkshire Hathaway's acquisition strategy evolved over the last five years?"
- "What does Warren Buffett think about cryptocurrency?"
- "Which companies did Berkshire acquire in 2023?"
- "What are Berkshire's largest holdings?"

## Configuration Notes

### PostgreSQL Optimization

For optimal performance, configure your PostgreSQL instance:

```sql
-- Increase maintenance_work_mem for index creation
SET maintenance_work_mem = '128MB';
```

### API Requirements

- Ensure your OpenAI API key is active and has sufficient quota for embeddings and GPT-4o responses
- The system requires access to OpenAI's text-embedding-3-small and GPT-4o models

## Deployment

### Production Environment Variables

Configure the following environment variables on your hosting platform:

```env
PG_HOST=your-production-host
PG_PORT=5432
PG_USER=your-production-username
PG_PASSWORD=your-production-password
PG_DATABASE=your-production-database
DATABASE_URL=your-production-database-url
OPENAI_API_KEY=your-openai-api-key
MASTRA_ENV=production
```

### Recommended Platforms

- **Render**: Easy PostgreSQL integration with managed databases
- **Mastra Cloud**: Seamless Node.js deployment with serverless functions


## Resources

- [Mastra Documentation](https://mastra.ai/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Berkshire Hathaway Shareholder Letters](https://www.berkshirehathaway.com/letters/letters.html)
## Troubleshooting

### Common Issues

**Database Connection Errors**
- Verify PostgreSQL is running and accessible
- Check DATABASE_URL format and credentials
- Ensure pgvector extension is installed

**Embedding Generation Failures**
- Verify OpenAI API key is valid
- Check API quota and rate limits
- Ensure PDF files are in the correct directory

**Memory/Performance Issues**
- Increase PostgreSQL maintenance_work_mem
- Monitor vector index creation progress
- Consider batch processing for large document sets