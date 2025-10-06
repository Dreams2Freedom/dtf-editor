# Affiliate Program - Profitability Analysis

**Date:** January 2025  
**Purpose:** Ensure affiliate program remains profitable while incentivizing growth

---

## 📊 **Current Pricing Structure**

### **Subscription Plans**

- **Free:** $0/month - 2 credits
- **Starter:** $24.99/month - 20 credits
- **Professional:** $49.99/month - 60 credits

### **Pay-as-You-Go Credit Packs**

- **5 credits:** $5.99
- **25 credits:** $24.99
- **60 credits:** $49.99
- **150 credits:** $99.99

---

## 💰 **Commission Cost Analysis**

### **Current Commission Structure**

- **Standard Tier:** 20% lifetime recurring
- **Silver Tier:** 22% lifetime recurring
- **Gold Tier:** 25% lifetime recurring
- **Diamond Tier:** 30% lifetime recurring

### **Commission Breakdown by Plan**

#### **Starter Plan ($24.99/month)**

| Tier           | Commission | Your Net | Margin |
| -------------- | ---------- | -------- | ------ |
| Standard (20%) | $5.00      | $19.99   | 80%    |
| Silver (22%)   | $5.50      | $19.49   | 78%    |
| Gold (25%)     | $6.25      | $18.74   | 75%    |
| Diamond (30%)  | $7.50      | $17.49   | 70%    |

#### **Professional Plan ($49.99/month)**

| Tier           | Commission | Your Net | Margin |
| -------------- | ---------- | -------- | ------ |
| Standard (20%) | $10.00     | $39.99   | 80%    |
| Silver (22%)   | $11.00     | $38.99   | 78%    |
| Gold (25%)     | $12.50     | $37.49   | 75%    |
| Diamond (30%)  | $15.00     | $34.99   | 70%    |

#### **Credit Pack Analysis (Example: 60 credits for $49.99)**

| Tier           | Commission | Your Net | Margin |
| -------------- | ---------- | -------- | ------ |
| Standard (20%) | $10.00     | $39.99   | 80%    |
| Silver (22%)   | $11.00     | $38.99   | 78%    |
| Gold (25%)     | $12.50     | $37.49   | 75%    |
| Diamond (30%)  | $15.00     | $34.99   | 70%    |

---

## 🎮 **Gamification Costs Analysis**

### **Monthly Leaderboard Prizes**

- 1st Place: $100
- 2nd Place: $50
- 3rd Place: $25
- **Total Monthly:** $175

### **Points Redemption Costs**

Assuming 100 active affiliates:

- Average points earned/month: 500 points
- Average redemption rate: 60%
- Average redemption value: $5
- **Estimated Monthly:** $300 (100 × 0.6 × $5)

### **Bonus Commissions**

- Streak bonuses: ~5% additional
- Achievement bonuses: ~3% additional
- **Estimated Additional:** 8% of base commissions

### **Total Gamification Costs**

- Prizes: $175
- Points: $300
- Bonuses: Variable (~8% of commissions)
- **Fixed Monthly:** $475
- **Variable:** 8% of total commissions

---

## 📈 **Profitability Scenarios**

### **Scenario 1: Conservative Growth**

**Assumptions:**

- 50 affiliates
- Average 2 conversions/month each
- 70% Starter, 30% Professional plans
- 80% stay at Standard tier

**Monthly Calculations:**

- Total Sales: 100 subscriptions
- Revenue: (70 × $24.99) + (30 × $49.99) = $3,249.30
- Commissions (20% avg): $649.86
- Gamification: $475 + ($649.86 × 0.08) = $527
- **Net Revenue:** $2,072.44
- **Profit Margin:** 63.8%

### **Scenario 2: Moderate Growth**

**Assumptions:**

- 100 affiliates
- Average 3 conversions/month each
- 60% Starter, 40% Professional
- 60% Standard, 30% Silver, 10% Gold

**Monthly Calculations:**

- Total Sales: 300 subscriptions
- Revenue: (180 × $24.99) + (120 × $49.99) = $10,496.40
- Commissions (22% avg): $2,309.21
- Gamification: $475 + ($2,309.21 × 0.08) = $659.74
- **Net Revenue:** $7,527.45
- **Profit Margin:** 71.7%

### **Scenario 3: High Growth**

**Assumptions:**

- 200 affiliates
- Average 4 conversions/month each
- 50% Starter, 50% Professional
- 40% Standard, 30% Silver, 20% Gold, 10% Diamond

**Monthly Calculations:**

- Total Sales: 800 subscriptions
- Revenue: (400 × $24.99) + (400 × $49.99) = $29,992
- Commissions (24% avg): $7,198.08
- Gamification: $475 + ($7,198.08 × 0.08) = $1,050.85
- **Net Revenue:** $21,743.07
- **Profit Margin:** 72.5%

---

## 🏗️ **Cost Structure Breakdown**

### **Fixed Costs (Estimated Monthly)**

- Stripe Processing (2.9% + $0.30): ~$870 (on $30k revenue)
- AI API Costs (Deep-Image, etc.): ~$2,000
- Supabase/Hosting: ~$200
- Other Infrastructure: ~$300
- **Total Fixed:** ~$3,370

### **Variable Costs**

- Affiliate Commissions: 20-30% of revenue
- Gamification: ~2-3% of revenue
- Customer Support: ~5% of revenue
- **Total Variable:** 27-38% of revenue

### **Break-Even Analysis**

- Fixed Costs: $3,370
- Required Revenue (at 30% variable): $4,814
- Required Subscriptions: ~145 Starter or ~97 Professional
- **Break-even with affiliates:** ~50 active affiliates at 3 conversions each

---

## ⚠️ **Risk Factors**

### **High Risk Areas**

1. **Lifetime Commissions:** Ongoing cost with no end date
2. **Diamond Tier (30%):** Leaves only 70% margin
3. **Gamification Bonuses:** Can stack to 38% total cost
4. **Credit Giveaways:** Direct cost with no revenue

### **Mitigation Strategies**

1. Cap lifetime commissions at 24 months
2. Require higher thresholds for Diamond tier
3. Limit bonus stacking to maximum 5%
4. Use store credit instead of credits for prizes

---

## 💡 **Recommendations**

### **Commission Structure Adjustments**

#### **Option 1: Time-Limited Commissions**

- **Standard:** 20% for 24 months
- **Silver:** 22% for 24 months
- **Gold:** 25% for 24 months
- **Diamond:** 30% for 24 months
- **After 24 months:** Drop to 10% lifetime

#### **Option 2: Tiered by Volume (Recommended)**

- **0-10 active customers:** 20%
- **11-25 active customers:** 22%
- **26-50 active customers:** 25%
- **51+ active customers:** 27%
- **Cap at 27% to maintain profitability**

#### **Option 3: Hybrid Model**

- **First 12 months:** Full rate (20-25%)
- **Months 13-24:** 75% of rate (15-19%)
- **Months 25+:** 50% of rate (10-12.5%)

### **Gamification Adjustments**

#### **Prize Pool Changes**

- Replace cash with account credits
- Monthly prizes: 100/50/25 credits (value: $60 cost to you)
- Points redemption: Credits only, not cash
- This reduces real cost by 60%

#### **Bonus Limitations**

- Cap total bonuses at 5% additional commission
- Streak bonuses: Max 3% boost
- Achievement bonuses: One-time, not recurring
- No stacking of multiple bonuses

### **Tier Requirements (Stricter)**

- **Silver:** 15 active customers (was 5)
- **Gold:** 35 active customers (was 15)
- **Diamond:** 75 active customers (was 50)
- Or based on MRR generated, not just count

---

## 📊 **Revised Profitability Model**

### **With Recommended Changes**

#### **Conservative Scenario (Revised)**

- Revenue: $3,249.30
- Commissions (20% avg, 24-month cap): $649.86
- Gamification (credits, not cash): $60
- Fixed Costs: $1,000 (proportional)
- **Net Revenue:** $1,539.44
- **Profit Margin:** 47.4%

#### **Moderate Growth (Revised)**

- Revenue: $10,496.40
- Commissions (21% avg): $2,204.24
- Gamification: $100
- Fixed Costs: $2,000
- **Net Revenue:** $6,192.16
- **Profit Margin:** 59.0%

#### **High Growth (Revised)**

- Revenue: $29,992
- Commissions (22% avg, capped): $6,598.24
- Gamification: $150
- Fixed Costs: $3,370
- **Net Revenue:** $19,873.76
- **Profit Margin:** 66.3%

---

## ✅ **Final Recommendations**

### **Implement These Changes:**

1. **Commission Structure**
   - Keep 20% base rate
   - Cap at 25% maximum (remove 30% tier)
   - Implement 24-month limit, then drop to 10%
   - Base tiers on MRR generated, not just customer count

2. **Gamification**
   - Use credits instead of cash for prizes
   - Cap bonus commissions at 5% total
   - Make achievement bonuses one-time
   - Reduce leaderboard prizes by 50%

3. **Tier Thresholds**
   - Silver: $500/month MRR generated
   - Gold: $1,500/month MRR generated
   - Diamond: Remove entirely or $3,000/month MRR

4. **Safety Measures**
   - 30-day hold on all commissions
   - Clawback for refunds/chargebacks
   - Monthly review of high earners
   - Reserve fund of 10% of commissions

### **Expected Outcome**

- **Sustainable profit margin:** 55-65%
- **Affiliate satisfaction:** High (still generous)
- **Growth potential:** Unlimited
- **Risk level:** Low to moderate

---

## 🎯 **Quick Decision Matrix**

| Current Plan            | Sustainable? | Recommended Change       |
| ----------------------- | ------------ | ------------------------ |
| 20% lifetime commission | ⚠️ Risky     | ✅ Cap at 24 months      |
| 30% Diamond tier        | ❌ No        | ✅ Remove or cap at 25%  |
| $175 cash prizes        | ⚠️ Expensive | ✅ Use credits instead   |
| Unlimited bonuses       | ❌ No        | ✅ Cap at 5% total       |
| Low tier thresholds     | ⚠️ Risky     | ✅ Base on MRR generated |

---

## 💰 **Bottom Line**

### **Current Structure**

- **Risk Level:** High
- **Profit Margin:** 45-65%
- **Sustainability:** Questionable long-term

### **Recommended Structure**

- **Risk Level:** Low-Moderate
- **Profit Margin:** 55-70%
- **Sustainability:** Strong long-term

**Key Change:** The most important change is capping lifetime commissions at 24 months and using credits instead of cash for prizes. This alone improves profitability by 15-20%.

---

**End of Profitability Analysis**
