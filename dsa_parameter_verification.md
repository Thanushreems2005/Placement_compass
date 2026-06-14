# 📊 Placement Compass: DSA Interview Intelligence Parameter Verification

This file provides a comprehensive verification of the **20 corporate parameters** used to dynamically calculate DSA difficulty levels, recommended difficulty distributions, and topic priorities inside the **`Placement_compass`** backend services (specifically mapped in `app/services/openrouter.py`).

---

## 🔍 Core Verification Status: **VERIFIED & OPERATIONAL**
The backend contains a fully operational 20-parameter dynamic classification and scoring engine in `OpenRouterService._simulate_company_analysis(...)`. 

### 📐 How the Parameters Decide the DSA Level (The Scoring Engine)
Each of the 20 parameters is extracted from the Supabase-linked company metadata and checked against high-rigor technical keywords. 
* **Baseline Score:** `30` points.
* **Incremental Weight:** Each parameter that matches a high-rigor filter adds **`+5`** points.
* **Tier-1 Brand Boosts:** Up to **`+20`** points for legendary brands (e.g., Google, Netflix, OpenAI, DeepMind) and **`+10`** points for other major tech giants (e.g., Meta, Amazon, Microsoft, Uber).

Here is the exact parameter scoring matrix mapped from the codebase logic:

| # | Parameter | High-Rigor Filter (Triggers `+5` points) | Impact on DSA Level |
|---|---|---|---|
| **1** | `tech_stack` | `c++`, `rust`, `go`, `cuda`, `tensorflow`, `pytorch`, `distributed`, `kafka`, `scala`, `cloud`, `aws`, `gcp`, `azure` | Indicates system-level programming and scalability challenges. |
| **2** | `nature_of_company` | `product`, `research`, `proprietary`, `public` | Product/R&D focus demands optimized data structures. |
| **3** | `category` | `ai`, `ml`, `storage`, `saas`, `cloud`, `deeptech`, `fintech`, `semiconductor`, `robotics` | High engineering depth requires core mathematical optimization. |
| **4** | `focus_sectors` | `cloud`, `enterprise`, `hyperscalers`, `deep learning`, `quantitative` | Complex domains demand optimized algorithms. |
| **5** | `r_and_d_investment` | `high`, `extreme`, `9-11%`, `investment`, `10%`, `8%` | Innovation-driven cultures test candidates on problem-solving limits. |
| **6** | `ai_ml_adoption_level` | `high`, `extreme`, `very high`, `medium-high` | AI/ML optimization demands high spatial and temporal efficiency. |
| **7** | `innovation_roadmap` | `50tb`, `next-gen`, `ai`, `automation`, `scaling` | Future roadmap items involve complex computational modeling. |
| **8** | `product_pipeline` | `mass-capacity`, `scalable`, `next-gen`, `cloud` | Heavy structural pipelines imply continuous scaling challenges. |
| **9** | `employee_size` | `> 5000` employees | Large scale organization implies massive traffic and distributed data. |
| **10** | `hiring_velocity` | `moderate`, `selective`, `very selective`, `low` | Highly selective environments raise the technical bar. |
| **11** | `competitive_advantages`| `proprietary`, `density`, `tech lead`, `patents`, `performance` | Tech-driven moats require superior algorithmic engineers. |
| **12** | `key_competitors` | `google`, `amazon`, `microsoft`, `aws`, `apple`, `faang` | Competing for talent with tier-1 giants raises interview rigor. |
| **13** | `benchmark_vs_peers` | `industry leader`, `premium`, `advanced`, `high density` | High market expectations correlate with advanced test standards. |
| **14** | `company_maturity` | `high`, `mature`, `tier-1` | Mature engineering companies have highly standardized coding evaluations. |
| **15** | `automation_level` | `high`, `mes`, `predictive`, `optimization` | Automation logic implies scheduling and pathfinding algorithms. |
| **16** | `learning_culture` | `tech excellence`, `university`, `learning`, `high` | Continuous upskilling translates to high core-concept expectations. |
| **17** | `strategic_priorities` | `scalability`, `platform optimization`, `ai`, `hamr` | Explicit engineering focus mandates deep algorithmic skillsets. |
| **18** | `client_quality` | `tier-1`, `cloud`, `aws`, `google`, `microsoft` | High enterprise expectations enforce strict SLA/performance levels. |
| **19** | `brand_value` | `tier-1`, `high`, `premium` | Prestigious brands command high selectivity levels. |
| **20** | `global_exposure` | `global`, `high`, `distributed`, `multi-region` | Distributed architectures test candidates on partition/concurrency paradigms. |

---

## 📈 Level Determination & Topic Selection Rules

The final accumulated score is evaluated against three distinct threshold tiers to dynamically generate the difficulty mix and list of target DSA topics:

### 🔴 Tier 1: **Hard** (`score >= 80`)
* **Hiring Rigor Profile:** Extreme coding intensity. Focuses on heavy mathematical modeling and distributed algorithms.
* **Difficulty Mix:** 
  * `Easy`: 0% | `Medium`: 20% | `Hard`: 60% | `Expert`: 20%
* **Topics & Weightages:**
  1. **Graphs & Tree Algorithms (35%):** For pathfinding, topological sorts, and complex network traversals.
  2. **Dynamic Programming (25%):** For edge-state constraints and grid resource optimizations.
  3. **Heaps & Priority Queues (20%):** For high-velocity task queuing and processing priorities.
  4. **Arrays & Hashmaps (20%):** Standard O(1) space-time lookups.

### 🟡 Tier 2: **Medium** (`score >= 50`)
* **Hiring Rigor Profile:** High coding intensity. Focuses on customer-scaling and data structure navigation.
* **Difficulty Mix:**
  * `Easy`: 30% | `Medium`: 50% | `Hard`: 20% | `Expert`: 0%
* **Topics & Weightages:**
  1. **Binary Trees & BSTs (30%):** For hierarchy parsing, binary searching, and deep tree searches.
  2. **Arrays & Hashing (25%):** For linear tracking and index caching.
  3. **Greedy Algorithms (25%):** For calculating cost-efficient paths and optimizing schedules.
  4. **Sliding Window (20%):** Standard contiguous subarray evaluation.

### 🟢 Tier 3: **Easy** (`score < 50`)
* **Hiring Rigor Profile:** Moderate coding intensity. Core data structure screening.
* **Difficulty Mix:**
  * `Easy`: 50% | `Medium`: 40% | `Hard`: 10% | `Expert`: 0%
* **Topics & Weightages:**
  1. **Arrays & Strings (35%):** Basic search, data cleaning, and filtering.
  2. **Linked Lists & Stacks (25%):** Stack states and pointer navigation.
  3. **Sorting & Searching (20%):** Basic sorting algorithms and binary search.
  4. **Dynamic Programming (20%):** Simple Knapsack or recursive templates.

---

## 🛠️ Codebase Verification Snippet
Here is the exact scoring module retrieved from `app/services/openrouter.py`:

```python
# Parameter 1: Tech Stack (+5 for systems/scalable/distributed tech)
if any(tech in tech_stack for tech in ["c++", "rust", "go", "cuda", "hamr", "tensorflow", "pytorch", "distributed", "kafka", "scala", "cloud", "aws", "gcp", "azure"]):
    score += 5

# Parameter 2: Nature of Company (+5 for Product/Research)
if any(nat in nature_of_company for nat in ["product", "research", "proprietary", "public"]):
    score += 5

# Parameter 3: Category (+5 for high engineering depth categories)
if any(cat in category for cat in ["ai", "ml", "storage", "saas", "cloud", "deeptech", "fintech", "semiconductor", "robotics"]):
    score += 5

# ... [Scoring loops continue through all 20 parameters] ...

if score >= 80:
    predicted_dsa_level = "Hard"
    # recommended_difficulty_mix / topics set accordingly
elif score >= 50:
    predicted_dsa_level = "Medium"
    # recommended_difficulty_mix / topics set accordingly
else:
    predicted_dsa_level = "Easy"
    # recommended_difficulty_mix / topics set accordingly
```
