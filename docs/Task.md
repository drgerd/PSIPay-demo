Below is the full translation of the attached PDF into **Markdown format**, preserving structure and meaning.

(Original document: )

---

# AWS Cloud Developer – Home Assignment

## UK Financial Products Comparison Platform

**Estimated Time:** ~4 hours
(You are expected to use AI development tools – Claude Code, Cursor, Copilot, etc.)
**Difficulty Level:** Intermediate
**Cost to Candidate:** $0
(All services used have free tiers, no credit card required for APIs)

---

## Overview

Build a **serverless application** that helps UK consumers compare financial products.
The system pulls real market data from public APIs, enriches it with AI-powered analysis, and presents actionable insights in a simple dashboard.

We expect you to leverage AI coding tools heavily – this is part of the skill set we're evaluating.

---

## Business Case

Users need a simple way to understand the UK financial products landscape.

Using real Bank of England rate data combined with AI analysis, build a tool that answers questions like:

* "Should I go for a fixed or variable rate mortgage right now?"
* "How do current savings rates compare to inflation?"
* "What's the best type of credit card for my spending habits?"

---

## Technical Requirements

### 1. AWS Services (Free Tier)

* **AWS Lambda** – Serverless compute
* **Amazon API Gateway** – REST API endpoints
* **Amazon DynamoDB or S3** – Data storage/caching
* **Amazon CloudWatch** – Logging and monitoring

All of the above are covered by the AWS Free Tier:

* 1M Lambda requests/month
* 1M API Gateway calls (for 12 months)
* 25GB DynamoDB

---

### 2. AI Service (Free)

Use **Google AI Studio – Gemini API** for AI-powered analysis.

* Free API key: [https://aistudio.google.com/](https://aistudio.google.com/)
* No credit card required
* Instant setup

You may use AWS Bedrock or any other AI API instead, but note that Bedrock has no free tier. If you choose an alternative, explain why.

---

### 3. External Data Sources (Integrate at least 2)

You must integrate at least **2 live data sources**.

Choose from:

| Source                                 | Auth              | Data Available                                                  | Docs                                                                                                   |
| -------------------------------------- | ----------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bank of England Statistical API        | None required     | Mortgage rates, savings rates, lending rates, base rate history | [https://www.bankofengland.co.uk/boeapps/database/](https://www.bankofengland.co.uk/boeapps/database/) |
| Exchange Rates API (exchangerate.host) | Free key, instant | GBP exchange rates, currency data                               | [https://exchangerate.host/](https://exchangerate.host/)                                               |
| FCA Financial Services Register        | Free registration | Regulated firms, authorized products                            | [https://register.fca.org.uk/s/resources](https://register.fca.org.uk/s/resources)                     |
| Alpha Vantage                          | Free key, instant | Stock/forex/crypto market data                                  | [https://www.alphavantage.co/](https://www.alphavantage.co/)                                           |

You may also use any other publicly accessible, free financial data source — just document your choice and why.

**Important:**
If an API's registration takes more than 30 minutes, document the intended integration and use realistic fallback data for that source only.

At least one source must be fully live.

---

## 4. Core Features

### A. Data Layer

* Fetch and normalize data from your chosen sources
* Cache responses to avoid unnecessary API calls
* Error handling and retry logic

---

### B. AI Analysis Layer

* Feed real market data to the AI model as context
* Generate product comparisons and recommendations based on user criteria
* Produce natural language summaries and insights

---

### C. REST API – Minimum 3 Endpoints

* `GET /products/{category}`
  → List products/rates for a category

* `POST /compare`
  → Compare options based on criteria

* `GET /recommendations?criteria=...`
  → AI-powered recommendations

---

### D. Frontend Dashboard

* Comparison table or grid
* At least one data visualization (chart showing rate trends, comparisons, etc.)
* AI-generated insights section
* Input form for user preferences/criteria

---

## Example Scenario

### User Journey – "Should I fix my mortgage?"

1. User opens dashboard, selects "Mortgages"
2. System fetches current BoE mortgage rate data (2yr fixed, 5yr fixed, variable, base rate)
3. User enters:

   > "Looking to remortgage, 200k, 75% LTV"
4. AI analyzes current rates vs historical trends and generates:

   * Rate comparison table (fixed vs variable, by term length)
   * Chart showing rate trends over the past 12 months
   * Plain-language recommendation:

     > "Based on current market conditions..."
   * Key factors to consider

---

## Deliverables

### 1. GitHub Repository containing:

* Source Code
* Lambda function(s) – Python or Node.js
* Frontend – React, Vue, or plain HTML/CSS/JS
* IaC – AWS SAM template (preferred), CloudFormation, or Terraform

**README.md must include:**

* Architecture diagram (draw.io, Excalidraw, or even ASCII – just make it clear)
* Setup and deployment instructions (we will run these to test your submission)
* API documentation with example requests/responses
* Environment variables needed

---

### 2. Working Demo (one of the following)

* Deployed URL (preferred, bonus points)
* Screen recording (2–3 minutes) showing full user journey
* Step-by-step screenshots with explanations

---

### 3. Leadership & Architecture Section

(In README or separate doc)

Answer briefly (a few paragraphs each):

1. **Trade-offs** – What architectural decisions did you make and what did you sacrifice?
2. **Team Planning** – You have a team of 3 developers and 2 weeks. How do you break this project down and assign work?
3. **Production Readiness** – What would you add or change before going to production?
4. **If you had more time** – What would you build next?

These answers are as important as the code.
We will discuss them in the interview.

---

## Evaluation Criteria

| Criteria                  | Weight | What We're Looking For                                         |
| ------------------------- | ------ | -------------------------------------------------------------- |
| Architecture & Trade-offs | 25%    | Sensible serverless design, clear reasoning about choices made |
| AI Integration            | 25%    | AI adds real value – not just a wrapper around an API call     |
| Data Source Integration   | 20%    | Live API calls, proper error handling, data normalization      |
| Code Quality              | 10%    | Clean structure, readable, properly handled errors             |
| Dashboard & UX            | 10%    | Functional, clear presentation of data and AI insights         |
| Leadership Thinking       | 10%    | Thoughtful answers showing team lead perspective               |

---

## Architecture Guide

Keep it simple. You don't need a separate Lambda for every task.

```
Browser (S3 / local)
        |
     API Gateway
        |
     Lambda -----> Bank of England API
            |-----> Exchange Rate API (or other)
            |-----> Google AI Studio (Gemini)
            |-----> DynamoDB / S3 (cache)
```

One Lambda with multiple route handlers is perfectly fine.
Don't over-engineer.

---

## Getting Started

1. Get a free Google AI Studio API key at:
   [https://aistudio.google.com/](https://aistudio.google.com/)

2. Test the Bank of England API (no key needed):

```
https://www.bankofengland.co.uk/boeapps/iadb/fromshowcolumns.asp?
csv.x=yes&Datefrom=01/Jan/2024&Dateto=01/Jan/2026&
SeriesCodes=IUMBV34,IUMBV37,IUMBV42&
CSVF=TN&UsingCodes=Y&VPD=Y&VFD=N
```

(This returns 2yr, 3yr, and 5yr fixed mortgage rates)

3. `sam init` to scaffold your project
4. Build from one endpoint outward

---

## Bonus Points (Optional)

* Unit tests
* CI/CD pipeline
* Authentication (AWS Cognito)
* Caching strategy with TTL for API responses
* Infrastructure cost estimate for production scale

---

## How We Will Test Your Submission

1. Clone your repo
2. Follow your README setup instructions
3. Deploy using your IaC template (or run locally with `sam local start-api`)
4. Hit your API endpoints with sample requests
5. Open the dashboard and walk through the user journey
6. Read your Leadership & Architecture section
7. Discuss everything in a follow-up interview

If we can't deploy or run it from your README instructions, that's a problem.
Keep it simple and make sure it works.

---

## Submission

* GitHub repository link (or ZIP file)
* Email to: [doron.darmon@ftco.ltd](mailto:doron.darmon@ftco.ltd)
* Deadline: 5 working days from receiving this assignment

---

## Questions?

Email [doron.darmon@ftco.ltd](mailto:doron.darmon@ftco.ltd) within the first 24 hours.

---

If you'd like, I can now:

* Convert this into a **clean `README.md` template version**,
* Or restructure it into a **Notion / Confluence-ready document**,
* Or help you extract only the “business layer” version for interview discussion.
