"""Pressure test of the rho = 0.02 leak rate.

A: does the optimal drift-EMA leak follow the Kalman/Muth prediction
   rho* = sqrt(q), and where exactly is 0.02 optimal?
B: does the state update "power down" when input stops (fixed T vs gated T)?
C: does a 2% leak actually stabilize dynamics more expansive than 2%?
D: empirical half-life of an injected error.
"""
import numpy as np

rng = np.random.default_rng(7)

# ---------- A: optimal leak vs drift-to-noise ratio ----------
def track_mse(rho, q, n=200_000):
    """EMA with leak rho tracking a random walk (drift var q, noise var 1)."""
    w = rng.normal(0, np.sqrt(q), n)
    theta = np.cumsum(w)                       # true drifting signal
    y = theta + rng.normal(0, 1, n)            # noisy observations
    est = np.empty(n)
    e = 0.0
    for k in range(n):
        e = (1 - rho) * e + rho * y[k]         # leaky estimator
        est[k] = e
    burn = n // 10
    return np.mean((est[burn:] - theta[burn:]) ** 2)

print("A: optimal leak vs drift-to-noise ratio q = (sigma_w/sigma_v)^2")
print(f"{'q':>10} {'rho* theory':>12} {'rho* empirical':>15}")
rhos = np.geomspace(1e-3, 0.5, 40)
for q in [1e-5, 4e-5, 4e-4, 4e-3, 4e-2]:
    p = (q + np.sqrt(q * q + 4 * q)) / 2       # steady-state Kalman variance
    rho_theory = p / (p + 1)                   # Kalman gain = optimal leak
    mses = [track_mse(r, q, n=100_000) for r in rhos]
    rho_emp = rhos[int(np.argmin(mses))]
    print(f"{q:>10.0e} {rho_theory:>12.4f} {rho_emp:>15.4f}")

# cost of being wrong: fix rho=0.02, vary the true q
print("\nA2: MSE penalty for hard-coding rho=0.02 when the environment disagrees")
for q in [4e-5, 4e-4, 4e-3]:
    p = (q + np.sqrt(q * q + 4 * q)) / 2
    rho_opt = p / (p + 1)
    mse_fixed = track_mse(0.02, q)
    mse_opt = track_mse(rho_opt, q)
    print(f"  q={q:.0e}: mse(rho=0.02)={mse_fixed:.4f}  mse(rho*)={mse_opt:.4f}"
          f"  penalty x{mse_fixed / mse_opt:.2f}")

# ---------- B: power-down claim ----------
print("\nB: state update with input stopped at k=2000 (rho=0.02, T=0.05)")
def run_state(gated, n=20_000, rho=0.02, T=0.05):
    x = 0.0
    temp = T
    tail = []
    for k in range(n):
        drive = np.sin(0.05 * k) if k < 2000 else 0.0   # input stops
        if gated:  # temperature follows input activity
            temp = 0.98 * temp + 0.02 * (T if k < 2000 else 0.0)
        x = (1 - rho) * x + rho * drive + np.sqrt(2 * temp) * rng.normal() * 0.01
        if k > n - 5000:
            tail.append(x)
    return np.std(tail)

print(f"  fixed T : residual std after input stops = {run_state(False):.5f}"
      f"  (theory OU floor ~ {0.01*np.sqrt(2*0.05/(1-0.98**2)):.5f})")
print(f"  gated T : residual std after input stops = {run_state(True):.5f}")

# ---------- C: stability margin ----------
print("\nC: 2% leak vs expansive dynamics f(x) = a*x, 500 steps from x0=0.01")
for a in [0.015, 0.02, 0.025, 0.05]:
    x = 0.01
    for _ in range(500):
        x = (1 - 0.02) * x + a * x             # net factor (0.98 + a)
        if abs(x) > 1e12:
            break
    verdict = "bounded" if abs(x) < 1e6 else "DIVERGED"
    print(f"  expansion a={a:.3f} (net {0.98+a:.3f}): |x_500|={abs(x):.3e}  {verdict}")

# ---------- D: half-life ----------
print("\nD: half-life of injected unit error under rho=0.02")
e, k = 1.0, 0
while e > 0.5:
    e *= 0.98
    k += 1
print(f"  {k} steps (theory ln2/ln(1/0.98) = {np.log(2)/np.log(1/0.98):.1f})")
