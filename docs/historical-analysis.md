# SERA — Historical Incident Retrieval Engine

---

## 1. Purpose of Historical Retrieval

When rotating machinery breaks down, identical or similar failures have almost always occurred in the plant's operational history. 

The SERA Historical Incident Engine answers two critical questions:
1. *"Has this specific failure symptom happened before on this machine or similar rotating assets across our plants?"*
2. *"What specific corrective action successfully resolved it in past turnarounds?"*

---

## 2. Information Retrieval Algorithm: TF-IDF + Cosine Similarity

SERA implements a specialized industrial document retrieval pipeline across the **380 historical incident records** using **Term Frequency-Inverse Document Frequency (TF-IDF)** and **Cosine Vector Similarity**:

### 2.1 Document Vectorization
Each historical incident document $d_j$ in the database is represented as a text corpus containing:
$$\text{Corpus}(d_j) = \text{Equipment Tag} + \text{Problem Text} + \text{Root Cause Text} + \text{Corrective Action} + \text{Plant Unit}$$

The TF-IDF weight for term $t_i$ in document $d_j$ is:
$$\text{TF-IDF}(t_i, d_j) = \text{TF}(t_i, d_j) \times \log\left(\frac{1 + |D|}{1 + |\{d \in D : t_i \in d\}|}\right) + 1$$

### 2.2 Query Formulation
When an active anomaly occurs, SERA automatically compiles a diagnostic query vector $q$:
$$q = \text{Target Equipment ID} + \text{Breached Parameters} + \text{Dominant Harmonics} + \text{Active Anomaly Class}$$
For **BL-5702**:
$$q = \text{"BL-5702 high vibration 2X harmonic coupling misalignment offset soft-foot"}$$

### 2.3 Cosine Similarity Ranking
$$\text{Score}(q, d_j) = \frac{\mathbf{q} \cdot \mathbf{d}_j}{\|\mathbf{q}\| \|\mathbf{d}_j\|} = \frac{\sum_{k} q_k d_{j,k}}{\sqrt{\sum_k q_k^2} \sqrt{\sum_k d_{j,k}^2}}$$

---

## 3. Top Historical Incident Match Example (BL-5702 Failure Query)

Searched against the 380 official incident database records:

| Incident Code | Target Asset | Plant | Similarity Score | Identified Root Cause | Verified Past Corrective Action |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`AR-2025-OPP-0185`** | `PZ-3313B` | `OPP` | **`94.2%` (High)** | Flexible spider hardening & angular offset. | Corrected coupling alignment using laser tool; replaced hardened elastomer insert. |
| **`AR-2025-OP2-0118`** | `PM-2566C` | `OP2` | **`91.0%` (High)** | Baseplate soft-foot and dynamic shaft deflection. | Soft-foot shim correction and dynamic shaft realignment. |
| **`AR-2026-SMX-0082`** | `KO-2904` | `SMX` | **`88.5%` (High)** | Coupling elastomer worn out & cracked. | Overhauled coupling assembly, reset baseplate shims, replaced flexible spider. |

---

## 4. Integration with Recommendation Formulation

By retrieving these top historical matches from identical plant environments, SERA grounds its CAPA recommendations in proven maintenance history:
- Recommends precision laser alignment to $< 0.05\text{ mm}$ tolerance.
- Recommends Grade 304 stainless steel baseplate shimming to eliminate the $0.12\text{ mm}$ soft-foot gap.
- Recommends replacement of the fatigued elastomer spider insert with genuine OEM elements.
