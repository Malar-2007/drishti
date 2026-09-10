# DRISHTI: Explainable Decision Engine Formulation

## 1. Casualty Prioritization Formula

$$\text{Score} = w_{\text{conf}} \cdot f_{\text{conf}} + w_{\text{zone}} \cdot f_{\text{zone}} + w_{\text{group}} \cdot f_{\text{group}} + w_{\text{iso}} \cdot f_{\text{iso}}$$

| Factor | Weight | Description |
|---|---|---|
| $f_{\text{conf}}$ | 0.25 | Detection confidence score ($0 - 100$) |
| $f_{\text{zone}}$ | 0.35 | Geolocation within active hazard boundary |
| $f_{\text{group}}$ | 0.20 | Cluster size of detected individuals |
| $f_{\text{iso}}$ | 0.20 | Distance and isolation from nearest medical base |

**Classification:**
- $\ge 70.0 \implies \mathbf{HIGH}$ Priority
- $45.0 - 69.9 \implies \mathbf{MEDIUM}$ Priority
- $< 45.0 \implies \mathbf{LOW}$ Priority

---

## 2. Multi-Criteria Drone Assignment Optimization

$$\text{Suitability}_i = 0.45 \cdot f_{\text{dist}}(d_i) + 0.25 \cdot f_{\text{bat}}(b_i) + 0.15 \cdot f_{\text{speed}}(s_i) + 0.15 \cdot f_{\text{avail}}(a_i)$$

### Safety Constraint:
$$\text{If } \text{Battery}_i \le 15\% \implies \text{Suitability}_i = 0 \quad (\text{Immediate RTB Lockout})$$
$$\text{ETA} = \frac{\text{Distance}}{\text{Speed}}$$
