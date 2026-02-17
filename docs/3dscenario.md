Implement the 3rd use case: “Best type of credit card for my spending habits”.

Goal
Add a new user flow in the web dashboard + backend that recommends a credit card TYPE (not a specific bank product) based on a user’s spending behavior. The recommendation must be explainable and should use deterministic logic + AI for narrative explanation.

User Flow (UI)
1) Add a “Credit Cards” section/page (or tab) with a simple form:
   - Monthly spending amount (GBP)
   - Do you pay your balance in full each month? (Yes/No)
   - Do you currently carry credit card debt? (Yes/No, optional amount)
   - Top spending categories (multi-select: groceries, fuel/transport, travel, dining, online shopping, general)
   - Primary goal (single select): minimize interest, maximize rewards, simplicity/no fees, travel benefits
2) On submit, show:
   - Recommended card type (e.g., Cashback, Rewards/Points, Travel, Low APR, Balance Transfer, 0% Purchases)
   - A short explanation (“why”)
   - A comparison table of 3–5 card types with estimated annual value/cost and key tradeoffs
   - Optional: a simple “what if” note (e.g., “If you stop carrying balance, rewards cards become more attractive.”)

Backend/API
Add one endpoint (or extend existing /recommendations):
- POST /recommendations/credit-cards
  Input: the form fields above
  Output (JSON): 
    - recommendedType
    - rationaleBullets (2–4 bullets)
    - ranking: list of {type, score, estimatedAnnualValue, notes}
    - assumptionsUsed (brief)

Decision Logic (deterministic)
Use a lightweight scoring approach:
- If user does NOT pay in full OR carries debt => prioritize Low APR / Balance Transfer (interest dominates rewards).
- If user pays in full => prioritize rewards value:
   - Travel-heavy => Travel card
   - General spend => Cashback or Rewards (pick based on categories + “simplicity/no fees” preference)
- Use simple assumptions (documented in output), e.g.:
   - cashbackRate ~ 1%
   - rewardsValue ~ 0.8% effective
   - representative APR ~ 22% for “interest cost” illustration when revolving
Compute:
- estimatedAnnualRewards = monthlySpend * 12 * assumedRate
- estimatedAnnualInterestCost (only if revolving) = carryBalance * assumedAPR (simple approximation is fine)
Combine into a score per card type and create ranking.

AI Usage
After computing the deterministic ranking, send a compact prompt to the AI model with:
- user profile inputs
- the ranking + key computed numbers
Ask AI to generate a short, user-friendly explanation and 2–3 caveats (no financial advice tone).
Do NOT let AI decide the ranking; AI only explains.

Acceptance Criteria
- New UI flow works end-to-end.
- API returns stable structured JSON and always includes assumptions.
- Recommendation is consistent with the “pay in full vs revolving” rule.
- Results page shows: recommended type, table, and AI explanation.
- If AI fails, fallback to deterministic rationaleBullets without breaking UX.