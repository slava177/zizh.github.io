---
title: "Stabilizing LTI Systems under Partial Observability: Sample Complexity and Fundamental Limits"
collection: publications
category: conferences
permalink: /publication/2025-POLTI
date: 2025-10-08
venue: 'Advances in Neural Information Processing Systems (NeurIPS)'
paperurl: 'https://openreview.net/forum?id=KwHsZJatB8'
citation: '<b>Z. Zhang</b>, Y. Nakahira, and G. Qu. &quot;Stabilizing LTI Systems under Partial Observability: Sample Complexity and Fundamental Limits.&quot; <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, 2025.'
---

We study the problem of stabilizing an unknown partially observable linear time-invariant (LTI) system. For fully observable systems, leveraging an unstable/stable subspace decomposition approach, state-of-art sample complexity is independent from system dimension n and only scales with respect to the dimension of the unstable subspace. However, it remains open whether such sample complexity can be achieved for partially observable systems because such systems do not admit a uniquely identifiable unstable subspace. In this paper, we propose LTS-P, a novel technique that leverages compressed singular value decomposition (SVD) on the ''lifted'' Hankel matrix to estimate the unstable subsystem up to an unknown transformation. Then, we design a stabilizing controller that integrates a robust stabilizing controller for the unstable mode and a small-gain-type assumption on the stable subspace. We show that LTS-P stabilizes unknown partially observable LTI systems with state-of-the-art sample complexity that is dimension-free and only scales with the number of unstable modes, which significantly reduces data requirements for high-dimensional systems with many stable modes.
