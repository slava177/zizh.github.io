---
title: "Fast Bandit-based Policy Adaptation in Diverse Environments"
collection: publications
category: conferences
permalink: /publication/2024-bandit
date: 2025-07-08
venue: 'American Control Conference (ACC)'
paperurl: 'https://ieeexplore.ieee.org/abstract/document/11107697'
citation: '<b>Z. Zhang</b>, G. Qu, and Y. Nakahira. &quot;Fast Bandit-based Policy Adaptation in Diverse Environments.&quot; In <i>Proceedings of the American Control Conference (ACC)</i>, pp. 2458–2464, 2025.'
---

Autonomous systems must have the ability to quickly adapt to various situations. However, adaptation methods often require strong assumptions about system structures, environmental homogeneity, and multiple rollouts. In this work, we integrate multi-armed bandit and model-based RL to design a fast adaptation algorithm on a single trajectory. Our approach achieves sublinear regret, and the performance guarantee does not require homogeneity of the environment. This regret bound is achieved using a novel prediction error metric that is minimized in the ground-truth MDP. To the best of our knowledge, all existing results with provable guarantees depend on the Bregman divergence between the optimal policies among the MDP's. We show by simulation that our algorithm performs well in puzzle navigation and quadcopter path-tracking.
