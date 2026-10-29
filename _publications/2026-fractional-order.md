---
title: "Learning Fractional-Order Dynamics from a Single Trajectory"
collection: publications
category: conferences
permalink: /publication/2026-fractional-order
date: 2026-09-16
venue: 'Advances in Neural Information Processing Systems (NeurIPS)'
paperurl: 'https://arxiv.org/abs/2609.18127'
cover: '2026-fractional-order.jpg'
citation: 'X. Zhang, <b>Z. Zhang</b>, Z. Zhao, S. Tu, G. Qu, Y. Nakahira, and P. Bogdan. &quot;Learning Fractional-Order Dynamics from a Single Trajectory.&quot; <i>Advances in Neural Information Processing Systems (NeurIPS)</i>, 2026 (to appear).'
---

Many real-world processes exhibit long-range dependence, where the current state depends on a slowly decaying trace of past states rather than on the most recent state alone. This paper studies system identification for discrete-time fractional-order linear time-invariant systems from a single observed trajectory of length *t*, a setting that captures such non-Markovian dynamics through the Grünwald–Letnikov difference operator. Unlike Markovian systems, fractional-order systems couple estimation across the entire history, making both statistical analysis and practical identification more challenging. We propose *Fractional-Order Ordinary-Least-Squares Grid-Search (FO-GS)*, a simple two-stage estimator that exploits the diagonal structure of the fractional-difference operator to decouple the identification problem row-wise. Under the stability assumption, we establish high-probability, non-asymptotic error bounds for estimating both the fractional order and the system matrix in the heterogeneous setting, with both estimation errors scaling as *O*(*t*<sup>−1/2</sup>). Through experiments, we show that *FO-GS* outperforms existing baselines in recovering both the fractional order and the underlying system dynamics.
