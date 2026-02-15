## Business Goal 

### What business problem it solves

UK consumers face a noisy, fast-changing financial landscape (mortgages, savings, lending, cards). Rates move, inflation changes, and product choice is confusing. The product solves **“information overload + decision uncertainty”** by turning raw market/rate data into **comparisons and plain-language guidance**. 

### Who the users are

* **Everyday UK consumers** making personal finance decisions (homeowners/remortgagers, savers, borrowers, card users).
* Potentially **more advanced users** who want to inspect trends and assumptions (rate history, inflation comparisons, scenario variations). 

### What decisions it helps users make

Examples explicitly implied by the assignment:

* **Mortgage structure choice:** fixed vs variable, term length tradeoffs. 
* **Savings allocation:** how savings rates compare to inflation; whether savings products are “keeping up.” 
* **Credit card selection:** “best type” based on spending habits (rewards vs low APR vs balance transfer, etc.). 

### What value it delivers

* **Time saved:** one place to see market rates and product options.
* **Better decisions:** recommendations grounded in current conditions and historical context (e.g., last 12 months trend). 
* **Confidence & transparency:** shows *why* something is recommended (key factors, tradeoffs, comparable metrics). 

---

## Personas & Use Cases 

### Persona 1: “Remortgage Planner”

* **Goal:** choose fixed vs variable and decide term.
* **Pain:** unsure if today’s rate environment favors fixing; doesn’t understand impact of LTV/loan size.
* **Typical questions:** “Should I fix now?”, “2yr vs 5yr fixed?”, “How sensitive is this to base rate changes?” 

### Persona 2: “Inflation-Conscious Saver”

* **Goal:** protect purchasing power.
* **Pain:** sees savings rates but can’t tell “real return” after inflation.
* **Typical questions:** “Am I losing money in real terms?”, “Which savings options are currently competitive?” 

### Persona 3: “Everyday Credit Card Optimizer”

* **Goal:** pick a card type that fits spending habits.
* **Pain:** too many card categories; doesn’t know which feature matters (cashback vs rewards vs low APR).
* **Typical questions:** “What card type suits me?”, “How do I compare value vs fees/interest?” 

### Persona 4: “Market-Curious User”

* **Goal:** understand macro context (rates trend, exchange rate movements, etc.).
* **Pain:** wants quick insights without reading reports.
* **Typical questions:** “What changed recently?”, “Is this trend up/down and why does it matter?” 

### Major use cases

1. **Browse products/rates by category** (mortgages, savings, lending, cards). 
2. **Compare options using user criteria** (loan amount, LTV, time horizon, spending habits). 
3. **Get recommendations + explanation** (plain-language, factors, caveats). 
4. **View market insights and trends** (charts, historical comparisons, inflation vs savings). 

---

## Functional Capabilities 

### 1) Category selection & product browsing

**Must accomplish:**

* Let users choose a **product category** (e.g., Mortgages).
* Display **current available rate/product points** for that category in a consistent list/table.
* Provide “what is this?” hints (e.g., fixed term meaning). 

### 2) User preference & criteria input

**Must accomplish:**

* Capture user inputs needed to personalize comparisons:

  * Mortgages: loan amount, LTV, intent (remortgage/new), horizon, risk tolerance.
  * Savings: deposit amount, access needs, time horizon.
  * Credit cards: monthly spend, categories, revolve vs pay-off behavior.
* Validate input ranges and show friendly errors (e.g., missing/invalid). 

### 3) Comparison engine (deterministic comparison)

**Must accomplish:**

* Calculate and display comparable metrics across options:

  * Mortgages: indicative payment, total interest over horizon, sensitivity to rate changes.
  * Savings: nominal vs real rate, projected balance after horizon.
  * Credit cards: estimated benefit from rewards, expected interest cost if carrying balance.
* Allow sorting / highlighting “best on X metric.” 

### 4) Insight generation (explain what’s going on)

**Must accomplish:**

* Turn the current market snapshot + historical trend into insights:

  * “Rates trending up/down over last 12 months”
  * “Savings below/above inflation → real return negative/positive”
* Keep insights tied to user’s scenario (not generic). 

### 5) Recommendation generation (guided decision)

**Must accomplish:**

* Provide a **recommended direction** (e.g., fixed vs variable) plus:

  * Key factors driving the recommendation
  * Tradeoffs and “when this changes”
  * Confidence level or “depends-on” notes (not a definitive promise)
* Must feel actionable and understandable. 

### 6) Data visualization

**Must accomplish:**

* At least one clear chart per main scenario:

  * Mortgage rates trend (e.g., 2yr/5yr fixed vs variable) over time
  * Savings vs inflation over time
* Chart should support the narrative and comparison. 

---

## Data Requirements 

Below is *logical* data, not “how to fetch it”.

### A) Product/rate browsing

**Data needed**

* Product category list and subtypes (e.g., mortgage: 2yr fixed, 5yr fixed, variable, base rate).
* Current rate values per subtype.
* Metadata: effective date, source timestamp, unit/percentage conventions.

**Source nature**

* Market/rate datasets (public market sources in assignment). 

**Freshness**

* Current snapshot should be **near-live** (e.g., daily/weekly depending on publication cadence).
* Cached snapshot acceptable with a stated “last updated” timestamp.

**Normalization**

* Standardize:

  * Rate units (percent), rounding rules
  * Dates/time zones
  * Naming mapping (“2yr fixed” consistently represented)
  * Missing values handling (e.g., no data for a day → gap)

---

### B) Comparison calculations

**Data needed**

* Rate series (current + history window such as 12 months, as in example). 
* User inputs (loan amount, LTV, etc.).
* Optional: inflation time series to compute real returns (explicitly referenced as a question the tool should answer). 

**Freshness**

* User inputs are live (session).
* Rate series: a mix of cached historical + latest point.

**Computed/derived fields**

* Mortgage:

  * Estimated monthly payment (based on rate + principal + assumed term if needed)
  * Interest cost over chosen horizon
  * Scenario variations (e.g., variable rate moves with base rate assumptions)
* Savings:

  * Real rate = nominal savings rate minus inflation (approximation)
  * Projected balance over horizon
* Credit cards:

  * Reward value estimate (spend * reward rate assumptions)
  * Expected interest cost if revolving balance (needs user behavior assumption)

**Normalization**

* Align time series frequencies (monthly vs daily) when comparing trends.
* Convert inflation and rates to comparable periodicity (e.g., annualized).

---

### C) Recommendation/insights

**Data needed**

* Outputs from comparison calculations (rankings, sensitivities).
* Trend descriptors (direction, volatility, recent change).
* User constraints (risk tolerance, preference for certainty, liquidity needs).

**Computed signals**

* “Rate environment” indicator: rising vs falling, magnitude, stability.
* “Real return” indicator: savings vs inflation gap.
* “Fit score” per option (how well it matches user constraints).

---

## Data Processing Flow 

### 1) User initiates a scenario

* User selects a category (e.g., Mortgages).
* System prepares the relevant “market snapshot” and available subtypes.

### 2) System retrieves required market data

* Retrieve latest rates for chosen category.
* Retrieve historical series for visualization and trend logic (e.g., last 12 months). 
* Retrieve secondary context data if needed (e.g., inflation series for savings comparison; exchange rates if used for broader insights). 

### 3) System normalizes and validates data

* Ensure rate units/labels are consistent.
* Validate timeliness; attach “as-of” timestamps.
* Handle missing points (gap/last-known) with transparent notes.

### 4) User provides criteria

* Collect user inputs.
* Validate and convert to internal comparable values (numbers, ranges, categories).

### 5) System generates comparisons (deterministic)

* Compute metrics per option based on:

  * Latest rates
  * User inputs
  * Standard assumptions (documented)
* Create a comparison object: options × metrics.

### 6) System generates insights (explanatory layer)

* Analyze trend signals (e.g., rates moving up, stable, volatile).
* Combine with user criteria implications (e.g., high LTV → sensitivity to rate changes).
* Produce a concise narrative and “key factors.”

### 7) System generates recommendation (decision layer)

* Apply decision logic (see below) to rank options.
* Return:

  * Recommended option/type
  * Rationale
  * Tradeoffs + “what would change my mind” conditions

### 8) Present results

* Show table/grid + chart + insight summary together so user can:

  * See numbers
  * See trend context
  * Understand recommendation reasoning 

---

## User Journey Flows 

### Journey 1: “Should I fix my mortgage?”

1. User selects **Mortgages**. 
2. System loads current mortgage rate types (2yr fixed, 5yr fixed, variable) and base rate + 12-month trend.
3. User inputs: loan amount, LTV, remortgage/new, horizon, risk tolerance (e.g., “prefer certainty”).
4. System computes:

   * Payment/interest comparisons per option
   * Sensitivity scenario for variable (how payment changes if rates move)
5. System displays:

   * Comparison table fixed vs variable, by term length
   * Trend chart (past 12 months)
   * Recommendation narrative + key factors 

### Journey 2: “Savings rates vs inflation”

1. User selects **Savings**.
2. System loads current savings rates and inflation context (as implied by the product questions). 
3. User inputs: deposit amount, time horizon, access needs (instant vs fixed term).
4. System computes:

   * Nominal return projection
   * Real return estimate (nominal minus inflation)
5. System displays:

   * Table of savings options with nominal & real indicators
   * Chart: savings rate vs inflation over time
   * Insight: “real return positive/negative; what to consider”

### Journey 3: “Best credit card type for my habits”

1. User selects **Credit Cards**.
2. System presents card types to compare (e.g., cashback, rewards, balance transfer, low APR) as high-level categories.
3. User inputs:

   * Average monthly spend, major spend categories
   * Whether they pay full balance monthly or carry balance
   * Preference: perks vs low cost
4. System computes:

   * Estimated annual rewards value vs fees
   * Estimated interest cost if revolving
5. System outputs:

   * Comparison grid by card type
   * Recommendation: “best fit type” + tradeoffs and “if you do X, choose Y”

---

## Business Decision Logic 

### How comparisons are determined

* Comparisons are built on a **shared set of metrics** per category so options are comparable.
* Each option is evaluated with:

  * Market data (current + trend)
  * User inputs (amount, behavior, constraints)
  * Standard assumptions (explicitly stated to user)

### Recommendation factors

**Mortgages**

* Current spread between fixed and variable
* Rate trend direction/volatility (rising markets generally increase value of certainty)
* User risk tolerance and budget sensitivity
* Loan size/LTV as sensitivity amplifier

**Savings**

* Nominal rate vs inflation (real return)
* Liquidity needs (access constraints)
* Horizon (benefit of locking in vs flexibility)

**Credit cards**

* Pay-off behavior (full monthly vs revolving) dominates decision:

  * If revolving: APR/interest cost matters more than rewards
  * If paying off: rewards and fees dominate
* Spending mix matters for rewards value

### Metrics that matter to users

* **Cost / benefit in money** (monthly payment, interest cost, rewards value)
* **Risk / uncertainty** (sensitivity to rate changes, volatility)
* **Fit with constraints** (liquidity, tolerance, horizon)
* **“Real-world meaning”**: plain-language explanation, not just numbers 

### How tradeoffs are presented

* Always pair a recommendation with:

  * “Pros / Cons”
  * “Key drivers”
  * “When to choose the alternative instead”
  * “What could change the outcome” (e.g., base rate shifts) 

---

## Output Requirements 

The system must output, per scenario:

### 1) Comparison table / grid

* Rows: product options (or product types)
* Columns: key metrics + “fit indicators”
* Supports sorting/highlighting

### 2) Visual trends

* At least one chart showing:

  * Historical rate trends (e.g., last 12 months for mortgages) 
  * Or comparative trend lines (savings vs inflation)

### 3) Natural-language insights

* Short summary:

  * What’s happening in the market
  * What that means for the user’s criteria
  * Key cautions

### 4) Recommendation block

* “Recommended option/type”
* “Why this fits you”
* “Top 2–4 deciding factors”
* “Tradeoffs and alternative conditions”

After viewing results, users should understand:

* Which options are better on which metrics
* Why a recommendation was made
* What risks/assumptions exist
* What they might do next (e.g., explore another term, adjust inputs) 

---

## Functional Modules Breakdown 

### 1) Market Data Acquisition (logical)

**Responsibility:** obtain current and historical market/product datasets needed for each category.

### 2) Data Normalization & Quality

**Responsibility:** standardize naming, units, date alignment; detect missing/late/invalid data; attach “as-of” timestamps and notes.

### 3) User Criteria Management

**Responsibility:** capture, validate, and store scenario inputs (session-based); define defaults and assumptions where user doesn’t specify.

### 4) Comparison Engine

**Responsibility:** compute comparable metrics per option; produce structured comparison results for tables and charts.

### 5) Insight Generator

**Responsibility:** interpret trends and computed metrics into understandable explanations; highlight key drivers and risks.

### 6) Recommendation Engine

**Responsibility:** score/rank options against user goals and constraints; generate “best fit” with tradeoffs and sensitivity notes.

### 7) Presentation & Interaction Layer (business-facing)

**Responsibility:** guide user through category → inputs → results; present tables, charts, and insights cohesively; enable iteration (change inputs and recompute). 

---

## Assumptions & Open Questions 

### Key assumptions (needed to make the product coherent)

1. “Products” are represented at least at the **rate/type level** (e.g., 2yr fixed mortgage rate), even if not tied to specific lenders/cards.
2. If lender/card-level data isn’t available, the platform still provides value as a **market-level decision assistant** (type recommendation + macro comparison).
3. Standard assumptions will be used when user doesn’t provide details (e.g., mortgage term length for payment calc, or “average” fee model for card types).

### Open questions to clarify with stakeholders

1. **Scope of “products”:** Do we compare *market averages by type* or *specific provider offers*?
2. **Inflation data source expectation:** The brief asks “compare to inflation” but doesn’t explicitly list an inflation dataset—should this be included as a must-have? 
3. **Credit card data depth:** Do we need real card offers (APR/fees/rewards) or just “best card type” guidance based on generalized rules?
4. **Regulatory expectations & disclaimers:** Should outputs be framed as “educational” with a non-advice disclaimer?
5. **User personalization depth:** How granular should criteria be (e.g., mortgage term, credit score bands, fees sensitivity)?
6. **Update cadence transparency:** What “freshness” threshold is acceptable before warning users that data may be stale?
7. **Recommendation explainability:** Do you want an explicit breakdown (e.g., weights) or only narrative “key factors”?

If you share the *submission you produced* (screenshots/README or your own feature list), I can tailor this analysis to match your exact chosen categories and the specific datasets you integrated—still staying purely on business logic.
