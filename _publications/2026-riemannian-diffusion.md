---
title: "Polynomial Convergence of Riemannian Diffusion Models"
collection: publications
category: conferences
permalink: /publication/2026-riemannian-diffusion
date: 2026-01-05
venue: 'International Conference on Learning Representations (ICLR)'
paperurl: 'https://openreview.net/forum?id=lL0FR3UPhZ'
citation: 'X. Xu, <b>Z. Zhang</b>, Y. Nakahira, G. Qu, and Y. Chi. &quot;Polynomial Convergence of Riemannian Diffusion Models.&quot; <i>International Conference on Learning Representations (ICLR)</i>, 2026.'
---

Diffusion models have demonstrated remarkable empirical success in the recent years and are considered one of the state-of-the-art generative models in modern AI. These models consist of a forward process, which gradually diffuses the data distribution to a noise distribution spanning the whole space, and a backward process, which inverts this transformation to recover the data distribution from noise. Most of the existing literature assumes that the underlying space is Euclidean. However, in many practical applications, the data are constrained to lie on a submanifold of Euclidean space. Addressing this setting, De Bortoli et al. (2022) introduced Riemannian diffusion models and proved that using an exponentially small step size yields a small sampling error in the Wasserstein distance, provided the data distribution is smooth and strictly positive, and the score estimate is *L*<sub>∞</sub>-accurate. In this paper, we greatly strengthen this theory by establishing that, under *L*<sub>2</sub>-accurate score estimate, a *polynomially small stepsize* suffices to guarantee small sampling error in the total variation distance, without requiring smoothness or positivity of the data distribution. Our analysis only requires mild and standard curvature assumptions on the underlying manifold. The main ingredients in our analysis are Li-Yau estimate for the log-gradient of heat kernel, and Minakshisundaram-Pleijel parametrix expansion of the perturbed heat equation. Our approach opens the door to a sharper analysis of diffusion models on non-Euclidean spaces.
