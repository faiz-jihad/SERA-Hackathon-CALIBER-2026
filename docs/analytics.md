# SERA — Engineering Analytics & Feature Engineering

---

## 1. Analytics Overview

The SERA Analytics Engine extracts diagnostic features from raw multi-week telemetry, calculates multi-period degradation slopes, and constructs comparative baseline matrices.

---

## 2. Mathematical Formulations

### 2.1 Multi-Period Linear Regression Slope
To determine whether an asset is degrading rapidly or operating steadily, SERA computes ordinary least squares (OLS) linear regression slopes over 4-week, 8-week, and 12-week rolling windows:

$$\text{Slope } m = \frac{N \sum_{i=1}^N (t_i x_i) - \left(\sum_{i=1}^N t_i\right) \left(\sum_{i=1}^N x_i\right)}{N \sum_{i=1}^N t_i^2 - \left(\sum_{i=1}^N t_i\right)^2}$$

- $t_i$: Week index ($1, 2, \dots, N$)
- $x_i$: Parameter value at week $t_i$ (e.g. vibration velocity in $\text{mm/s}$)
- $N$: Window length ($4, 8, \text{or } 12$)

**Interpretation**:
- $m > +0.35\text{ mm/s/week}$: Rapid progressive degradation requiring immediate turnaround planning.
- $0.05 \le m \le 0.35\text{ mm/s/week}$: Moderate progressive trend requiring close monitoring.
- $m < 0.05\text{ mm/s/week}$: Stable operating condition.

---

### 2.2 Harmonic Energy & Misalignment Ratio ($R_{2X}$)
In rotating machinery vibration analysis, shaft misalignment manifests primarily at the **2X rotational harmonic frequency** (twice-per-revolution), whereas unbalance manifests at **1X**.

SERA calculates the 2X Harmonic Energy Ratio:

$$R_{2X} = \frac{\text{Harmonic}_{2X}}{\text{Vibration}_{\text{RMS}}}$$

**Classification Matrix**:
- $R_{2X} \ge 0.50$ ($50\%+$ of total vibration): **Severe Shaft Centerline Misalignment**.
- $0.30 \le R_{2X} < 0.50$: **Emerging Misalignment / Mechanical Looseness**.
- $R_{2X} < 0.30$ and $\text{Harmonic}_{1X} > 0.60$: **Unbalance or Blade Pass Anomaly**.

For **BL-5702**:
$$R_{2X} = \frac{5.10\text{ mm/s}}{11.22\text{ mm/s}} = 0.455\;(45.5\%)$$
Combined with 2X spectral amplitude breaching the trip safety envelope ($5.10\text{ mm/s} \ge 5.00\text{ mm/s}$), this conclusively confirms coupling misalignment as the dominant mechanical root cause.

---

### 2.3 "What Changed?" Comparative Delta Formulation
SERA compares current operating period against healthy baseline:

$$\text{Absolute Delta } \Delta = x_{\text{current}} - x_{\text{baseline}}$$
$$\text{Percentage Change } \Delta\% = \left(\frac{x_{\text{current}} - x_{\text{baseline}}}{x_{\text{baseline}}}\right) \times 100\%$$

| Parameter | Baseline (W01–04) | Previous (W20 Alarm) | Current (W21 Trip) | $\Delta$ Absolute | $\Delta\%$ Variance | Diagnostic Significance |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Vibration RMS** | $4.14\text{ mm/s}$ | $10.38\text{ mm/s}$ | $11.22\text{ mm/s}$ | $+7.08\text{ mm/s}$ | $\mathbf{+171.0\%}$ | Overall trip interlock breach ($\ge 11.00$) |
| **2X Harmonic** | $1.27\text{ mm/s}$ | $4.67\text{ mm/s}$ | $5.10\text{ mm/s}$ | $+3.83\text{ mm/s}$ | $\mathbf{+301.6\%}$ | Misalignment resonance peak ($\ge 5.00$) |
| **Coupling Offset**| $0.032\text{ mm}$ | $0.277\text{ mm}$ | $0.306\text{ mm}$ | $+0.274\text{ mm}$ | $\mathbf{+856.3\%}$ | Severe radial hub deflection ($\ge 0.300$) |
| **Bearing Temp** | $60.7^\circ\text{C}$ | $92.4^\circ\text{C}$ | $96.9^\circ\text{C}$ | $+36.2^\circ\text{C}$ | $\mathbf{+59.6\%}$ | Friction thermal loading ($\ge 95.0^\circ\text{C}$) |

---

## 3. Implementation Code Reference
The calculations are executed natively in [`sera/backend/services/analytics.py`](file:///d:/Sera-Hackathon%20CALIBER%202026/sera/backend/services/analytics.py) without external API dependencies.
