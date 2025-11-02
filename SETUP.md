# PortIQ - Setup Instructions

## n8n Webhook Configuration

Before the application can work properly, you need to configure the n8n webhook URLs in the following files:

### 1. PortIQ Assist Chatbot
**File:** `src/components/Chatbot.tsx`
**Line:** Look for `YOUR_N8N_WEBHOOK_URL_4`
**Purpose:** Handles chatbot queries from the landing page and pricing page

### 2. Portfolio Monitor
**File:** `src/pages/PortfolioMonitor.tsx`
**Line:** Look for `YOUR_N8N_WEBHOOK_URL_1`
**Purpose:** Sends portfolio stock lists for analysis

### 3. Stock Analyzer
**File:** `src/pages/StockAnalyzer.tsx`
**Line:** Look for `YOUR_N8N_WEBHOOK_URL_2`
**Purpose:** Sends single stock symbol for detailed analysis

### 4. AlphaEdge Evaluator
**File:** `src/pages/AlphaEdgeEvaluator.tsx`
**Line:** Look for `YOUR_N8N_WEBHOOK_URL_3`
**Purpose:** Sends current price, buy position, and analysis text for evaluation

## Expected Response Formats

### Webhook #1 - Portfolio Monitor
```json
{
  "analysis": "Full portfolio analysis text",
  "risk": "Risk assessment",
  "diversification": "Diversification score/analysis",
  "performance": "Performance summary"
}
```

### Webhook #2 - Stock Analyzer
```json
{
  "analysis": "Full stock analysis text",
  "fundamentals": "Fundamental analysis",
  "sentiment": "Market sentiment",
  "metrics": "Key metrics"
}
```

### Webhook #3 - AlphaEdge Evaluator
```json
{
  "recommendation": "BUY" | "HOLD" | "SELL",
  "reasoning": "Reasoning for recommendation",
  "confidence": 85,
  "analysis": "Detailed analysis text"
}
```

### Webhook #4 - Chatbot
```json
{
  "response": "AI chatbot response text"
}
```

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure n8n webhook URLs in the files mentioned above

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Features

- **Landing Page**: Hero section, features, pricing, and footer with chatbot
- **Authentication**: Supabase-powered login and signup
- **Portfolio Monitor**: Track multiple stocks with AI insights
- **Stock Analyzer**: Deep dive into individual stocks
- **AlphaEdge Evaluator**: Get Buy/Hold/Sell recommendations
- **Settings**: Manage user profile
