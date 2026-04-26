**Learning:** Truthiness fallacies on array/string lengths (e.g. `!arr.length`) and implicit type coercion (e.g. `+dt`) introduce ambiguity and stylistic entropy.
**Action:** Enforced strict typological safety by converting loose length checks to explicit mathematical comparisons (`arr.length === 0` and `arr.length > 0`) and replacing implicit coercion with canonical casting (`Number(dt)`).
